# Sending Email as @pageinnovation.com — Operator Walkthrough

Goal: emails from the app arrive as **noreply@pageinnovation.com** (and optionally
registration@ / sportal@) instead of Resend's shared onboarding address.

**The key idea:** to *send as* these addresses through Resend you do NOT
need the mailbox passwords. Mailbox passwords are only for logging into
cPanel webmail to *read* incoming mail. Sending rights come from proving
you own the **domain** — once `pageinnovation.com` is verified in Resend, the app
can send as ANY address ending in `@pageinnovation.com`.

Receiving is untouched: replies to noreply@/registration@/sportal@ still
land in the existing cPanel mailboxes.

---

## Prerequisites

- Resend account (pageinnovationlab@gmail.com) with `RESEND_API_KEY` already set
  on the Railway backend service — see `email-setup.md`
- cPanel login for the hosting where pageinnovation.com's DNS lives
  (business14.web-hosting.com:2083 — credentials are with the client;
  do NOT write them into this repo)

---

## Steps (one-time, ~10 minutes)

### 1. Add the domain in Resend
- resend.com → left sidebar → **Domains** → **Add Domain**
- Enter: `pageinnovation.com`
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
- Log into cPanel → **Zone Editor** → pageinnovation.com → **Manage**
- **Add Record** for each row from step 2, exactly as shown
  - Host `send` means `send.pageinnovation.com` — cPanel usually wants just `send`
  - Paste TXT values complete, including `v=spf1…` / `p=…`
- Save

### 4. Verify
- Back in Resend → Domains → pageinnovation.com → **Verify DNS Records**
- Usually green within minutes; DNS can occasionally take up to an hour
- All three rows must show **Verified**

### 5. Set the from-address on Railway
Railway → backend service → **Variables** → add/update:

```
EMAIL_FROM=Page Innovation <noreply@pageinnovation.com>
```

Railway redeploys automatically.

### 6. Smoke test
- Student app → Login → "Forgot Password?" → your email
- The mail should arrive FROM noreply@pageinnovation.com, and not in spam
- Also confirms the domain-verified account can now send to ANY
  recipient (the unverified free tier could only mail the signup address)

---

## Optional: different senders per purpose

The app currently sends everything from the single `EMAIL_FROM` address.
If the client wants purpose-specific senders —

- `registration@pageinnovation.com` → signup verification / welcome mail
- `sportal@pageinnovation.com`      → portal notifications
- `noreply@pageinnovation.com`      → everything else

— that is a small code change (a per-email-type sender map in
`backend/services/email/emailService.js`). All of them work the moment
the domain is verified; no extra Resend setup per address.

Recommendation: launch with just `noreply@` and add the others only if
the client insists.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Verify stays pending > 1 hour | Record host typo'd (e.g. `send.pageinnovation.com.pageinnovation.com`) — check Zone Editor shows exactly `send` and `resend._domainkey` |
| Mail arrives in spam | DKIM TXT value truncated when pasting — re-copy the full `p=…` string |
| "You can only send testing emails…" error | Domain not verified yet, or `EMAIL_FROM` uses a domain other than the verified one |
| Nothing sends at all | `RESEND_API_KEY` missing/typo'd on Railway — check boot logs pick the Resend transport (see `email-setup.md`) |

---

# Remaining operator punch list (as of 2026-07-03)

Things only YOU (or the client) can do — everything code-side is done.

## 1. Emails live
- [ ] `RESEND_API_KEY` on Railway backend (from resend.com → API Keys)
- [ ] Verify pageinnovation.com domain (steps above) → then `EMAIL_FROM=Page Innovation <noreply@pageinnovation.com>`
- [ ] Optional per-purpose senders (already supported in code):
      `EMAIL_FROM_REGISTRATION=Page Innovation <registration@pageinnovation.com>`
      `EMAIL_FROM_PORTAL=Page Innovation <sportal@pageinnovation.com>`

## 2. PayPal live
Set on Railway backend:
- [ ] `PAYPAL_CLIENT_ID` (live app "pageinnovation_lms")
- [ ] `PAYPAL_CLIENT_SECRET`
- [ ] `PAYPAL_WEBHOOK_ID=1UB32269RB062591G`
- [ ] `PAYPAL_MODE=live` (only when done testing with sandbox)

## 3. Secrets hygiene
- [ ] Rotate `SEED_SECRET` on Railway (current one is guessable + was shared in chat)
- [ ] Regenerate the Discord bot token later (was shared in plain text)

## 4. Chase from the client
- [ ] Cloudinary **cloud name** (they sent key + secret, but not the cloud
      name — it's on their Cloudinary dashboard, top-left)
- [ ] Google OAuth **client secret**
- [ ] Discord **client secret** (developer portal → OAuth2)
      — Guild ID already recovered from the invite link: `928124593795915796` (server "Page Innovation-DBA")
- [ ] `registration@pageinnovation.com` mailbox password (only needed for READING mail)

## 5. Discord env vars (once client secret arrives)
- [ ] `DISCORD_BOT_TOKEN` (have it), `DISCORD_CLIENT_ID=1508450600831025242`,
      `DISCORD_GUILD_ID=928124593795915796`, `DISCORD_CLIENT_SECRET` (pending)
- [ ] Invite the bot to the Page Innovation-DBA server with role-manage permissions

## 6. End-to-end business flows (human clicking, together)
- [ ] Sandbox PayPal payment → enrollment appears → course opens → certificate on completion
- [ ] 2FA: enable in profile with a real authenticator app → logout → login with code
- [ ] Live session start-to-finish: schedule → code display → student check-in → end → roster
- [ ] After that: give the list of features to HIDE and the flags get flipped
