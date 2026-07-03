# Sending Email as @tekypro.com — Operator Walkthrough

Goal: emails from the app arrive as **noreply@tekypro.com** (and optionally
registration@ / sportal@) instead of Resend's shared onboarding address.

**The key idea:** to *send as* these addresses through Resend you do NOT
need the mailbox passwords. Mailbox passwords are only for logging into
cPanel webmail to *read* incoming mail. Sending rights come from proving
you own the **domain** — once `tekypro.com` is verified in Resend, the app
can send as ANY address ending in `@tekypro.com`.

Receiving is untouched: replies to noreply@/registration@/sportal@ still
land in the existing cPanel mailboxes.

---

## Prerequisites

- Resend account (tekyprolab@gmail.com) with `RESEND_API_KEY` already set
  on the Railway backend service — see `email-setup.md`
- cPanel login for the hosting where tekypro.com's DNS lives
  (business14.web-hosting.com:2083 — credentials are with the client;
  do NOT write them into this repo)

---

## Steps (one-time, ~10 minutes)

### 1. Add the domain in Resend
- resend.com → left sidebar → **Domains** → **Add Domain**
- Enter: `tekypro.com`
- Region: pick the default

### 2. Copy the DNS records Resend shows you
Resend displays ~3 records. Typical shape (YOURS WILL DIFFER — copy from
the Resend screen, not from here):

| Type | Host/Name              | Value                        |
|------|------------------------|------------------------------|
| MX   | send                   | feedback-smtp.…amazonses.com |
| TXT  | send                   | v=spf1 include:amazonses.com…|
| TXT  | resend._domainkey      | p=MIGfMA0GCSqGSIb3DQEBAQUAA… |

### 3. Add them in cPanel
- Log into cPanel → **Zone Editor** → tekypro.com → **Manage**
- **Add Record** for each row from step 2, exactly as shown
  - Host `send` means `send.tekypro.com` — cPanel usually wants just `send`
  - Paste TXT values complete, including `v=spf1…` / `p=…`
- Save

### 4. Verify
- Back in Resend → Domains → tekypro.com → **Verify DNS Records**
- Usually green within minutes; DNS can occasionally take up to an hour
- All three rows must show **Verified**

### 5. Set the from-address on Railway
Railway → backend service → **Variables** → add/update:

```
EMAIL_FROM=TekyPro <noreply@tekypro.com>
```

Railway redeploys automatically.

### 6. Smoke test
- Student app → Login → "Forgot Password?" → your email
- The mail should arrive FROM noreply@tekypro.com, and not in spam
- Also confirms the domain-verified account can now send to ANY
  recipient (the unverified free tier could only mail the signup address)

---

## Optional: different senders per purpose

The app currently sends everything from the single `EMAIL_FROM` address.
If the client wants purpose-specific senders —

- `registration@tekypro.com` → signup verification / welcome mail
- `sportal@tekypro.com`      → portal notifications
- `noreply@tekypro.com`      → everything else

— that is a small code change (a per-email-type sender map in
`backend/services/email/emailService.js`). All of them work the moment
the domain is verified; no extra Resend setup per address.

Recommendation: launch with just `noreply@` and add the others only if
the client insists.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Verify stays pending > 1 hour | Record host typo'd (e.g. `send.tekypro.com.tekypro.com`) — check Zone Editor shows exactly `send` and `resend._domainkey` |
| Mail arrives in spam | DKIM TXT value truncated when pasting — re-copy the full `p=…` string |
| "You can only send testing emails…" error | Domain not verified yet, or `EMAIL_FROM` uses a domain other than the verified one |
| Nothing sends at all | `RESEND_API_KEY` missing/typo'd on Railway — check boot logs pick the Resend transport (see `email-setup.md`) |
