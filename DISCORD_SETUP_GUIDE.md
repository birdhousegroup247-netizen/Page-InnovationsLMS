# Discord Setup — Step-by-Step (for the BAO screen-share)

Follow these steps in order. By the end of the screen-share we'll have the **seven values** in the box at the bottom of this doc, which is everything we need to switch Discord on.

Estimated time: **15 minutes** if BAO already has a Discord account and a server.

---

## 0. Before the call

BAO should already have:
- [ ] A Discord account (free)
- [ ] A Discord server (we call it a "guild") that the LMS will use. If not, create one in Discord: top-left **`+`** → **Create My Own** → name it `Page Innovation Community` (or whatever the brand is)
- [ ] Be logged into both **discord.com** (the regular app) AND **discord.com/developers/applications** in another tab

---

## 1. Create the application + bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** (top right)
3. Name it `Page Innovation LMS`. Accept the terms. Click **Create**.
4. You're now on the application's **General Information** page

### Capture: `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`

On the **General Information** page:
- Copy **Application ID** → this is `DISCORD_CLIENT_ID`
- Click **Reset Secret** under Client Secret, confirm, then **copy** the secret → this is `DISCORD_CLIENT_SECRET`
- Save these somewhere safe (1Password / sticky note). The secret will never be shown again — only resettable.

### Turn it into a bot

1. Left sidebar → **Bot**
2. Page says "Build-A-Bot" — click **Reset Token**, confirm, then **copy** the bot token → this is `DISCORD_BOT_TOKEN`
3. **Privileged Gateway Intents** section — turn ON:
   - [x] **Server Members Intent** (needed so the bot knows when people join/leave)
   - [x] **Message Content Intent** (needed if we ever react to messages — turn on now to save a future round-trip)
4. Save changes (button at the bottom).

---

## 2. Set up the OAuth flow (so students can link their Discord account)

1. Left sidebar → **OAuth2** → **General**
2. Under **Redirects**, click **Add Redirect**
3. Paste: `https://<our-railway-url>/api/discord/callback`
   - For local testing: also add `http://localhost:5000/api/discord/callback`
   - For production (later): also add `https://api.pageinnovation.com/api/discord/callback`
4. Click **Save Changes** at the bottom

### Capture: `DISCORD_REDIRECT_URI`

- This is the *exact same URL* you just added. Copy it verbatim.

---

## 3. Invite the bot to the server

1. Left sidebar → **OAuth2** → **URL Generator**
2. Under **Scopes**, check:
   - [x] `bot`
   - [x] `applications.commands` (in case we add slash-commands later)
3. A **Bot Permissions** section appears below. Check:
   - [x] **Manage Roles** — bot creates per-course roles
   - [x] **Manage Channels** — bot creates per-course private channels
   - [x] **Send Messages** — bot can post welcome notes
   - [x] **Read Message History**
   - [x] **Create Instant Invite** — bot generates the join links we email to students
   - [x] **Kick Members** — bot removes students who unenroll
   - [x] **View Channels**
4. Scroll down. Copy the **Generated URL** at the bottom.
5. Open that URL in a new tab. Discord asks which server to add the bot to. Pick the `Page Innovation Community` server. Click **Authorise**, complete the captcha.
6. Back in the Discord app, you should now see the bot in the server's member list (offline at first — it'll come online once Railway is up).

---

## 4. Get the server (guild) ID

1. In the regular Discord app: **User Settings** (gear, bottom-left) → **Advanced** → turn ON **Developer Mode**
2. Close settings. Right-click the `Page Innovation Community` server icon in the left sidebar.
3. Click **Copy Server ID** → this is `DISCORD_GUILD_ID`

---

## 5. Create the Interview-Prep role

This is a special role that students get after completing prep prerequisites. The bot grants it; we just need it to exist with a known ID.

1. In the Discord app: right-click the server icon → **Server Settings** → **Roles**
2. Click **Create Role**
3. Name: `Interview Prep`
4. Colour: pick something distinct (e.g. green)
5. Permissions: leave all unchecked (the role only gates access — it doesn't grant permissions)
6. Save
7. With Developer Mode still ON, right-click the new role → **Copy Role ID** → this is `DISCORD_INTERVIEW_PREP_ROLE_ID`

> Tip: the bot will need to be placed **above** the Interview Prep role in the Roles list, or it can't assign it. Drag the `Page Innovation LMS` bot role above `Interview Prep`. Then drag both above `@everyone`. Save.

  4 tasks (2 done, 1 in progress, 1 open)
---

## 6. (Optional) Set the default invite link

If BAO wants a single permanent invite link for the community (separate from the per-course invites the bot will generate):

1. In the server, right-click any text channel → **Invite People**
2. Click **Edit invite link** → set **Expire after: Never** and **Max uses: No limit**
3. Copy the link → this is `DISCORD_INVITE_URL` (optional — leave blank if you don't want one)

---

## 7. Paste the seven values

By now we have **everything**. Put these into Railway env vars (and a copy in `backend/.env` for local):

| Env var | Where it came from |
|---|---|
| `DISCORD_BOT_TOKEN` | Section 1, bot token |
| `DISCORD_CLIENT_ID` | Section 1, application ID |
| `DISCORD_CLIENT_SECRET` | Section 1, client secret |
| `DISCORD_GUILD_ID` | Section 4 |
| `DISCORD_INTERVIEW_PREP_ROLE_ID` | Section 5 |
| `DISCORD_REDIRECT_URI` | Section 2 |
| `DISCORD_INVITE_URL` | Section 6 (optional) |

---

## 8. Smoke test (after Railway is up)

1. Have a test student account: profile → **Connect Discord** → OAuth flow opens → approve → return to Page Innovation
2. The user gets auto-added to the `Page Innovation Community` server (you'll see them in the member list)
3. Enrol the test student in a paid course (or have the admin enrol them manually)
4. Within 60 seconds:
   - A new private channel `#course-<slug>` appears in the server
   - The test student has access to that channel
   - The bot posts a welcome message (if we wired that up)
5. Have admin unenroll the student → within 60s the student is removed from `#course-<slug>` (kick or role removal)

If any of these fail, capture the backend logs around that timestamp from Railway and share — the Discord controller logs the exact API response on every call.

---

## If it goes sideways

| Symptom | Likely cause |
|---|---|
| Bot stays offline | `DISCORD_BOT_TOKEN` wrong, or backend not running |
| OAuth says "redirect URI mismatch" | The redirect in section 2 doesn't EXACTLY match what backend is calling (https vs http, trailing slash, port) |
| Bot can't create channels | Permissions in section 3 wrong, or bot role is below other roles |
| Bot can't assign Interview Prep | Bot role is below the Interview Prep role — drag bot role higher |
| Student doesn't auto-join | OAuth scope is missing `guilds.join` — re-do section 3 or check `scope:` in backend code |

  4 tasks (2 done, 1 in progress, 1 open)