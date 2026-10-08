import dns from "dns/promises";

// Free, no-email "is this address plausible?" check.
// Proves the DOMAIN can receive mail -- NOT that the mailbox belongs to the user.

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

// Common throwaway providers. Extend as needed.
const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "10minutemail.net", "guerrillamail.com", "guerrillamail.net",
  "sharklasers.com", "tempmail.com", "temp-mail.org", "temp-mail.io", "yopmail.com", "yopmail.net",
  "throwawaymail.com", "trashmail.com", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "mailnesia.com", "tempail.com",
  "burnermail.io", "spamgourmet.com", "moakt.com", "tmpmail.org", "discard.email", "mytemp.email",
]);

// Typo -> suggestion for the big providers.
const TYPOS = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.cm": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmail.con": "hotmail.com", "outlok.com": "outlook.com",
  "outlook.con": "outlook.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "yahooo.com": "yahoo.com",
  "iclod.com": "icloud.com", "icloud.con": "icloud.com",
};

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("dns-timeout")), ms))]);

async function domainCanReceiveMail(domain) {
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 4000);
    if (mx?.length) return true;
  } catch (e) {
    if (e.message === "dns-timeout") return null; // can't tell -> don't block the user
    if (!["ENODATA", "ENOTFOUND", "ENODOMAIN"].includes(e.code)) return null;
  }
  // RFC 5321: no MX -> mail servers fall back to the domain's A/AAAA record.
  try {
    const a = await withTimeout(dns.resolve4(domain), 4000);
    return a.length > 0;
  } catch (e) {
    if (e.message === "dns-timeout") return null;
    return false;
  }
}

// Returns { ok: true } or { ok: false, error }.
export async function checkEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const domain = email.split("@")[1];

  if (TYPOS[domain]) {
    return { ok: false, error: `Did you mean ${email.split("@")[0]}@${TYPOS[domain]}?` };
  }
  if (DISPOSABLE.has(domain)) {
    return { ok: false, error: "Disposable email addresses aren't allowed. Please use your real email." };
  }
  const canReceive = await domainCanReceiveMail(domain);
  if (canReceive === false) {
    return { ok: false, error: `The domain "${domain}" can't receive email. Check for typos.` };
  }
  return { ok: true, email };
}
