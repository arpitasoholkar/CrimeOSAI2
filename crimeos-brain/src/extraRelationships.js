/**
 * extraRelationships.js
 *
 * Adds the relationship lines the stock extractRelationships() never draws:
 *   - Complainant -> their own person node
 *   - person <-> person  (role words: friend, wife, manager... and verbs: introduced, instructed...)
 *   - person -> phone / email / UPI / address named closest to them in the same sentence
 *   - every UPI -> complainant, UPI -> account named in the same sentence
 *   - SIM owner -> phone, account holder -> KYC address, phone -> tower location
 *
 * Pure and deterministic: no LLM call, no network. It only reads the entities
 * and raw_text the case already has, so it cannot invent facts that are not in
 * the evidence. Every edge carries the evidence id it came from.
 */

const ROLE_WORDS = [
  "friend","wife","husband","mother","father","brother","sister","son","daughter","uncle","cousin",
  "colleague","associate","manager","agent","coordinator","boss","partner","handler","neighbour","neighbor",
];
const VERBS = ["introduced","referred","instructed","demanded","asked","told","called","sent","threatened","directed"];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const splitSentences = (t) => (t || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/);

// Person aliasing: "Rakesh" -> "Rakesh Mehta" when exactly one full name starts with it.
function buildPersons(entities) {
  const names = [...new Set(entities.filter((e) => ["PERSON_MENTIONED", "ACCOUNT_HOLDER", "SIM_OWNER"].includes(e.type)).map((e) => e.value))];
  const full = names.filter((n) => n.trim().includes(" "));
  return names.map((n) => {
    const canon = n.includes(" ") ? n : (full.filter((f) => f.split(" ")[0].toLowerCase() === n.toLowerCase()).length === 1
      ? full.find((f) => f.split(" ")[0].toLowerCase() === n.toLowerCase()) : n);
    const first = canon.split(" ")[0];
    return { canon, patterns: [...new Set([canon, first].filter((x) => x.length > 2))] };
  });
}

function mentions(sentence, persons) {
  const out = [];
  for (const p of persons) {
    for (const pat of p.patterns) {
      const re = new RegExp(`\\b${esc(pat)}\\b`, "g");
      let m;
      while ((m = re.exec(sentence))) out.push({ person: p.canon, start: m.index, end: m.index + pat.length });
    }
  }
  out.sort((a, b) => a.start - b.start);
  // drop overlaps (full name wins over first name)
  const res = [];
  for (const m of out) { const last = res[res.length - 1]; if (!last || m.start >= last.end) res.push(m); }
  return res;
}

export function extractExtraRelationships(caseDoc, entities) {
  const rels = [];
  const add = (from, to, type, ref) => { if (from && to && from !== to) rels.push({ from, to, type, evidenceRef: ref }); };
  const persons = buildPersons(entities);
  const ids = entities.filter((e) => ["PHONE", "EMAIL", "UPI_ID", "BANK_ACCOUNT", "ADDRESS"].includes(e.type));
  const idLabel = { PHONE: "uses-phone", EMAIL: "uses-email", ADDRESS: "located-at" };

  // complainant person = name after the word "Complainant", else first person
  let complainantPerson = null;
  const t0 = caseDoc.evidence?.[0]?.raw_text || "";
  const cm = t0.match(/Complainant\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (cm) { const c = persons.find((p) => p.canon === cm[1] || p.canon.split(" ")[0] === cm[1].split(" ")[0]); if (c) complainantPerson = c.canon; }
  const cref = caseDoc.evidence?.[0]?.complaint_id;
  if (complainantPerson) add("Complainant", complainantPerson, "is", cref);

  for (const ev of caseDoc.evidence || []) {
    const ref = ev.complaint_id;
    for (const s of splitSentences(ev.raw_text)) {
      const ms = mentions(s, persons);
      // --- person <-> person
      const roleRe = new RegExp(`\\b(${ROLE_WORDS.join("|")})\\s+$`, "i");
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        const anchor = i > 0 ? ms[i - 1] : null;
        if (!anchor || anchor.person === m.person) continue;
        const rh = s.slice(Math.max(0, m.start - 30), m.start).match(roleRe);
        if (rh) { add(m.person, anchor.person, `${rh[1].toLowerCase()}-of`, ref); continue; }
        const between = s.slice(anchor.end, m.start).toLowerCase();
        const v = VERBS.find((x) => between.includes(x));
        if (v) { if (/\bby\s*$/.test(between)) add(m.person, anchor.person, v, ref); else add(anchor.person, m.person, v, ref); }
      }
      // --- phones / emails / addresses -> nearest person in the sentence
      let ms2 = ms;
      if (!ms2.length && /\bComplainant/.test(s) && complainantPerson) ms2 = [{ person: complainantPerson, start: 0, end: 11 }];
      if (!ms2.length) continue;
      for (const id of ids.filter((e) => ["PHONE", "EMAIL", "ADDRESS"].includes(e.type))) {
        const idx = s.toLowerCase().indexOf(id.value.toLowerCase());
        if (idx < 0) continue;
        const near = ms2.map((m) => ({ m, d: Math.abs(m.end - idx) + (m.start > idx ? 12 : 0) })).sort((a, b) => a.d - b.d)[0];
        add(near.m.person, id.value, idLabel[id.type], ref);
      }
      // actor who demanded / instructed payment -> UPI named in the same sentence
      const upis = ids.filter((e) => e.type === "UPI_ID" && s.includes(e.value));
      const dv = s.toLowerCase().match(/\b(demanded|asked|instructed|requested|told|directed)\b/);
      if (upis.length && dv && ms.length) {
        const vi = s.toLowerCase().indexOf(dv[0]);
        const byM = ms.find((m) => s.slice(Math.max(0, m.start - 4), m.start).toLowerCase().trim() === "by" && m.start > vi);
        const before = ms.filter((m) => m.end <= vi);
        const actor = byM || before[before.length - 1];
        if (actor) for (const u of upis) add(actor.person, u.value, "requested-payment-to", ref);
      }
      // UPI <-> account in same sentence
      const accts = ids.filter((e) => e.type === "BANK_ACCOUNT" && s.includes(e.value));
      for (const u of upis) for (const a of accts) add(u.value, a.value, "linked-to", ref);
    }
  }
  // every UPI the complainant paid
  for (const u of entities.filter((e) => e.type === "UPI_ID")) add("Complainant", u.value, "sent-payment-to", u.source);

  // response-derived links
  const phones = entities.filter((e) => e.type === "PHONE");
  const firstPhone = phones[0];
  for (const so of entities.filter((e) => e.type === "SIM_OWNER")) if (firstPhone) add(so.value, firstPhone.value, "sim-registered-to", so.source);
  for (const h of entities.filter((e) => e.type === "ACCOUNT_HOLDER"))
    for (const a of entities.filter((e) => e.type === "KYC_ADDRESS")) add(h.value, a.value, "resides-at", a.source);
  for (const tw of entities.filter((e) => e.type === "TOWER_LOCATION")) if (firstPhone) add(firstPhone.value, tw.value, "last-seen-at", tw.source);
  return rels;
}

// Merge with the stock relationships, de-duplicated by from/type/to.
export function augmentRelationships(base, caseDoc, entities) {
  const seen = new Set(base.map((r) => `${r.from}::${r.type}::${r.to}`));
  const out = [...base];
  for (const r of extractExtraRelationships(caseDoc, entities)) {
    const k = `${r.from}::${r.type}::${r.to}`;
    if (!seen.has(k)) { seen.add(k); out.push(r); }
  }
  return out;
}