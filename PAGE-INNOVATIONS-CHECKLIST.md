# Page Innovations — Everything You Need to Provide

This is the complete list of accounts, keys and assets Page Innovations
must hand over before the app can go live.
---

## 1. Required from Page Innovations

| # | Item | What to send us | Notes |
|---|------|-----------------|-------|
| 1 | **Domain** | DNS access to your existing domain (or add the records we send you) | You already have the domain — we only need to add a few DNS records (email + pointing the app to your domain) |
| 2 | **Resend** (email sending) | API key | resend.com — free up to 3,000 emails/month. We'll verify your domain with 3 DNS records so emails send as @your-domain |
| 3 | **Payments — Paystack or Stripe** | Confirm WHICH one you use, then send: Paystack → Secret key + Public key, or Stripe → Secret key + Publishable key | Both are supported by the platform; we just need to know which account you have |
| 4 | **Cloudinary** (image/file storage) | Cloud name + API key + API secret + an unsigned upload preset | cloudinary.com — free tier |
| 5 | **Google Cloud** (Google login) | OAuth Client ID + Client Secret | console.cloud.google.com |
| 6 | **Cloudflare Turnstile** (bot protection) | Site key + Secret key | cloudflare.com — free |

## 2. Live classes — Google Meet

Live sessions run on **Google Meet**: instructors simply paste the Meet
link when scheduling a class — **no account keys or setup needed from
you**. (If you ever switch to Zoom, that needs Zoom API credentials —
tell us and we'll send the steps.)

## 3. Email addresses — create these in your cPanel

Create these mailboxes in your **cPanel** (where your domain email is
hosted) and send us the addresses:

- `noreply@your-domain.com` — general notifications
- `registration@your-domain.com` — signup/verification emails (optional)
- `support@your-domain.com` — shown to students as the contact address

The mailboxes receive replies in cPanel as normal; the platform sends
through Resend once the domain is verified.

## 4. Branding assets

| Item | Status |
|------|--------|
| **Official logo** — PNG, transparent background, wide format | ⚠️ NEEDED — a temporary logo is in place until you send the real one |
| Tagline (one line — shown on the login page and certificates) | ⚠️ NEEDED |

Already settled: company name, brand colors, and **selling currency —
NGN (₦)**. 


