# CrimeOS AI — Migration Notes (Living Investigation System)

What changed, why, and how to run/test it locally. Read this before running `npm run start:all`.

## 1. Services (was 4, now 3)

`crimeos-summary` (backend + frontend) has been **deleted** — it was an older fork of
`crime-os-backend` with the same schema. Everything it did is now covered by
`crime-os-backend` + `crimeos-frontend`.

Remaining services, all still started by `npm run start:all` from the repo root:

| Service | Port | Role |
|---|---|---|
| `crime-os-backend` | 3000 | Cases, evidence, legal requests, audit, ingestion |
| `crimeos-brain` | **3001** (was inconsistently 4000/3001 before) | AI investigation engine |
| `crimeos-frontend` | 5173 (Vite default) | The UI |

**Env vars you need**, one `.env` per backend service (not included in the zip):

```
# crime-os-backend/.env
MONGO_URI=mongodb://localhost:27017/crimeos   # same URI in both services
BRAIN_URL=http://localhost:3001               # new — defaults to this if unset

# crimeos-brain/.env
MONGO_URI=mongodb://localhost:27017/crimeos   # MUST match crime-os-backend's
GEMINI_API_KEY=...
PORT=3001                                      # optional, this is now the default
```

## 2. What's actually new

- **`investigationVersions[]`** on the Case document — every AI (re-)investigation appends
  one instead of overwriting `analysis`. Each version has `known`, `missing`,
  `findings`, `recommendations`, `entities`, `relationships`, `risk`, `confidence`, and a
  `delta` vs the previous version.
- **Re-investigation is now event-driven.** `crime-os-backend/lib/reinvestigate.js` is the
  single place this fires from: evidence upload (`/ingest`, `evidenceController`), a legal
  response being recorded, or the officer's "Re-investigate" button.
- **`POST /cases/:case_id/request/:requestId/response`** — new endpoint. This is how STEP 5
  of the demo flow (bank/telecom reply arrives) actually gets into the system — there's no
  document-parsing pipeline for provider replies, so the officer transcribes the fields
  (account holder, KYC phone, device ID, etc.) and this endpoint turns them into entities +
  triggers re-investigation.
- **`crimeos-frontend/pages/CaseDetails.jsx`** is now the full Case Intelligence command
  center (all 13 sections from the spec). The old flat version is gone.
- Two real bugs fixed: `evidenceController.js` was looking up cases by the wrong field/param
  (every evidence-file upload 404'd), and the brain service's default port didn't match what
  the frontend/backend already assumed it was on.

## 3. Two things that are honestly simplified, not faked

- **Geographic Intelligence** shows only entities that carry real `lat`/`lng` — nothing in
  the current extraction pipeline (`extractEntities.js`) produces coordinates, so this panel
  will show its empty state ("No geographic intelligence available") until you wire a
  geocoding step onto address/location entities. This is intentional per the "no fake
  markers" requirement, not an oversight.
- **Similar Cases** (`GET /api/case/:case_id/similar` on crimeos-brain) is a genuinely new,
  working feature — it embeds every other case's complaint text with Gemini and ranks by
  cosine similarity — but it's O(n) Gemini calls per request with no caching/index. Fine for
  a hackathon demo's case count; would need a real vector index before this scales.

## 4. Testing the UPI demo flow end to end

1. Start MongoDB, then `npm run start:all` from the repo root.
2. Go to **New Case**, paste a complaint like: *"I sent ₹25,000 to UPI ID scammer@upi after a
   call from someone claiming to be my bank. My phone number is 98XXXXXXXX."* Submit with no
   Case ID. AI investigation v1 fires automatically.
3. Open the new case. **Case Intelligence** should show risk/confidence/assessment;
   **Investigation Gaps** should list the UPI ID/phone as Known and Account Owner/KYC/Device-IP
   as Missing; **Next Best Action** should offer "Request account/KYC records."
4. Enter an officer name, **Approve** that recommendation — this drafts a bank legal request
   (visible under Legal Intelligence).
5. In Legal Intelligence, expand the request → **Approve Request** → **Dispatch Request**.
6. Expand it again (now `sent`) → fill in Account Holder / KYC Phone / KYC Address →
   **Record Response & Re-investigate**. This creates investigation v2.
7. Back on the page (it auto-refreshes after the response is recorded): **What Changed**
   should show the new entity/relationship/finding; **Entity Graph** should now show the
   account holder node linked to the account.
8. Repeat 4–7 for a telecom request to get device/IP attribution and watch v3 build on v2.

## 5. Known follow-ups (not blocking, just next)

- `caseController.createCase` (`POST /cases`, unused by the ingest-driven demo flow) still
  silently drops its `complaint` field — schema has no such field. Left alone since it's not
  on the critical path; worth fixing if that endpoint gets used for anything real.
- `entity_added` trigger is defined in the schema but nothing fires it yet (only
  `initial_complaint`, `evidence_added`, `legal_response_received`, `manual_reinvestigation`
  are wired) — reserved for a future "officer manually adds an entity" UI.
