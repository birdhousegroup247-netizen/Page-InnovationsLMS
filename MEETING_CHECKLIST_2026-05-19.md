# Things to Get from BAO — 2026-05-19
**Deadline:** ~2026-05-31 (2 weeks from 2026-05-17)

Plain-English messages you can copy-paste to BAO are in the boxes below. The "Maps to" line is for me — it shows what each item becomes in the code.

---

## 1. PayPal (priority — for the Zoom call today)

> Sir, for PayPal I'll need a few things to connect it to the LMS. Please follow these steps in your PayPal Developer Dashboard:
>
> **a) Confirm Business Account**
> Just confirm your PayPal account is a **Business** account and that it's verified to receive international payments.
>
> **b) Create an app in PayPal Developer Dashboard**
> Go to https://developer.paypal.com/dashboard/applications
> Create a new app called "TekyPro LMS".
> You'll see two tabs: **Sandbox** (for testing) and **Live** (for real payments).
> From each tab, copy and send me:
>  - Client ID
>  - Secret
>
> So in total I'll have 4 values (2 for Sandbox, 2 for Live).
>
> **c) Create a Webhook**
> Same dashboard → Webhooks section → Add Webhook.
> Use this URL for now: I'll send it to you once Railway is back up (it will look like `https://tekyprolms-production.up.railway.app/api/webhooks/paypal`). Later we'll switch it to your own domain.
> Under "Event types", check these three:
>  - Payment capture completed
>  - Payment capture refunded
>  - Payment capture denied
>
> Then send me the **Webhook ID** that PayPal shows you.
>
> **d) Currency**
> The system is set to USD by default. Confirm if that's fine or you want a different one.

**Maps to:**
- `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` (sandbox)
- `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` (live)
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE` = sandbox/live (we control this)

---

## 2. Google Login (Sign in with Google)

> Sir, for the "Sign in with Google" button, please create a project in the Google Cloud Console:
>
> 1. Go to https://console.cloud.google.com
> 2. Create a new project called "TekyPro"
> 3. Go to **APIs & Services → OAuth consent screen** → set it up with your business email
> 4. Then go to **Credentials → Create Credentials → OAuth Client ID** → choose "Web Application"
> 5. Send me the **Client ID** and **Client Secret** it gives you
>
> I'll handle the redirect URLs configuration.

**Maps to:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## 3. Email (for sending receipts, notifications, password resets)

> Sir, the LMS needs an email account to send things like payment receipts and password resets to students.
>
> We want it to come from `noreply@tekypro.com`.
>
> **You have two options:**
>
> **Option A — Use cPanel (cheapest)**
> If your domain `tekypro.com` is hosted on cPanel, log into cPanel → Email Accounts → Create `noreply@tekypro.com`. Send me:
>  - The email address (`noreply@tekypro.com`)
>  - The password
>  - The SMTP server name (usually `mail.tekypro.com`)
>
> Note: The cPanel you use for email doesn't have to be the same one we host the app on. It just has to be the one that manages mail for `tekypro.com`.
>
> **Option B — Google Workspace (better deliverability, ~$6/month)**
> If you already use Google Workspace, create `noreply@tekypro.com` there, then generate an "App Password" and send it to me.
>
> Either option works. cPanel is free if you already pay for hosting.

**Maps to:** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`

---

## 4. Discord Bot (needs a screen-share session)

> Sir, for Discord we'll need to do a quick screen share — about 10 minutes — to set up the bot together. I'll guide you through:
>
> 1. Going to https://discord.com/developers/applications
> 2. Creating a "New Application" called TekyPro
> 3. Adding a Bot to it
> 4. Copying the Bot Token
> 5. Inviting the bot to your Discord server
> 6. Creating a special role for "Interview Prep" students
>
> Just let me know when you're free for the screen share.

**Maps to:** `DISCORD_BOT_TOKEN`, 
`DISCORD_CLIENT_ID`,
 `DISCORD_CLIENT_SECRET`, 
 `DISCORD_GUILD_ID`,
`DISCORD_INTERVIEW_PREP_ROLE_ID`

**Also ask during the screen share:**
- Confirm if his Discord server is Free tier or paid
- Get the Discord server invite link


Discord Server Invite Link
Super easy — he just:

Opens Discord → goes to his server
Right-clicks the server name at the top left
Clicks "Invite People"
Clicks "Create a permanent link" (so it doesn't expire)
Copies and sends it to you



Free Discord is perfectly fine for what you're building — bot, roles, interview prep access, notifications — all work on free.
The only reason to care about paid is if they plan to do live video sessions inside Discord (screen sharing for interview prep calls). In that case Level 2 boost (7 boosts) would improve video quality.
Just ask him: "Do you plan to host live sessions inside Discord or just use it for notifications and access control?" — that'll tell you if paid matters.

---

## 5. Hosting / Domain

> Sir, please send me the welcome email you got from your hosting provider when you bought the hosting plan. It usually has:
>  - Server IP address
>  - cPanel login
>  - DNS / nameserver instructions
>
> `tekypro.com` is still not resolving — that means the domain isn't pointed to a server yet. The hosting welcome email will tell us how to fix that.

**Maps to:** server IP, cPanel access, DNS config

---

## 6. Cloudinary (for course images and videos)

> Sir, we're currently using my Cloudinary account temporarily. Please create your own free account:
>
> 1. Go to https://cloudinary.com → Sign Up
> 2. After signup, go to your Dashboard
> 3. Send me these three values from the dashboard:
>  - Cloud Name
>  - API Key
>  - API Secret

**Maps to:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

---

## 7. Railway (on my end, not him)

Already discussed — user will renew the Railway subscription after the meeting / when home tonight.
Once renewed → backend redeploys → real Railway URL exists → can be given to BAO for PayPal webhook.

---

## Summary — One-Line Version for WhatsApp

> Sir, after our call, please get me ready:
> 1. PayPal: Sandbox + Live Client ID & Secret + Webhook ID
> 2. Google: Client ID & Secret from Google Cloud Console
> 3. Email: `noreply@tekypro.com` from your cPanel (with password & SMTP host)
> 4. Discord: schedule a screen-share for the bot setup
> 5. Hosting: forward me the hosting welcome email with the server IP
> 6. Cloudinary: create a free account and send me Cloud Name, API Key, API Secret
>
> Then I can finish everything within the 2-week deadline.

---

## After the Call — My Action List

- [ ] Renew Railway
- [ ] Redeploy backend → grab Railway URL
- [ ] Send Railway URL to BAO so he registers the PayPal webhook
- [ ] Paste credentials into Railway env vars as they arrive
- [ ] Run migration `backend/migrations/20260519_add_paypal_to_payments.sql`
- [ ] Build frontend PayPal SDK button + capture call
- [ ] End-to-end sandbox payment test
- [ ] Commit & push the PayPal backend work
- [ ] When client domain is live: swap webhook URL from Railway to `https://api.tekypro.com/api/webhooks/paypal`
