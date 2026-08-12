# SOP: Phishing, Vishing & Social Engineering

**SOP ID:** SOP-CYB-002
**Applicable Crime Types:** Phishing emails/SMS, vishing calls, fake customer-care numbers, QR code scams

## 1. Trigger Conditions
Apply this SOP when the complaint mentions:
- A phishing SMS/email/link that led to credential or OTP theft
- A fake customer care number found via search engine or social media
- A malicious QR code scanned for a "refund" or "cashback"

## 2. Immediate Actions
1. Preserve the phishing message/email with full headers (do not forward-and-delete; take screenshots + export raw source).
2. Note the sender number/email, shortened URL, and QR code payload if available.
3. Check the National Cybercrime Reporting Portal for prior complaints against the same number/domain (pattern matching).

## 3. Investigation Path
1. **URL/domain trace**: Request WHOIS and hosting provider details for the phishing domain; request takedown via CERT-In if domain is live.
2. **SMS header trace**: Request telecom operator for the originating SMS gateway/aggregator used to send the sender-ID spoofed message.
3. **Email trace**: Request email service provider for account creation IP, login IPs, and recovery contact details linked to the phishing sender account.
4. **Number trace**: If a spoofed/fake customer care number is involved, request CDR and CAF for that number.
5. Cross-reference beneficiary accounts with SOP-CYB-001 if money was also lost.

## 4. Relevant Legal Sections
- BNS Section 318 (Cheating), Section 319 (Cheating by personation)
- IT Act Section 66C (identity theft), 66D (cheating by personation using computer resource)
- IT Act Section 43 (unauthorized access/data theft — civil liability, relevant for evidence framing)
- BSA Section 63/64 — electronic record admissibility

## 5. Escalation
Escalate to State Cyber Cell if the phishing campaign is linked to a known organized group or if more than 5 complaints reference the same domain/number within 30 days.