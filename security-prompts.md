# Security Prompts Library

A reusable set of security review prompts. Copy the one that fits your project type, fill in the bracketed placeholders, and paste it into Claude (or any capable AI assistant) inside that project's directory.

Each prompt is written so the assistant must produce **verifiable findings** (file:line citations, real test output, real DNS/HTTP responses) instead of generic boilerplate — the kind of thing that protects you from both real attacks *and* from inflated/fake security reports.

---

## How to use this file

1. Open the project you want to audit in your terminal.
2. Pick the section below that matches the project type.
3. Replace `[PLACEHOLDERS]` with your real values (paths, domain, stack, etc).
4. Paste the prompt as your first message.
5. After the audit runs, save the output as `SECURITY_AUDIT_YYYY-MM-DD.md` in that project.

Important: a good audit always cites **specific files, line numbers, commands run, and real responses observed**. If a report can't point at evidence, treat it as noise.

---

## 1. Universal Pre-Flight Audit (any project, any stack)

Use this first for any project. It triages what the project actually is before going deep.

```
You are acting as a senior application security engineer. Audit this project for real, exploitable security issues — not theoretical or generic ones.

PROJECT CONTEXT
- Project path: [ABSOLUTE_PATH]
- Project type: [static site / SPA / full-stack web app / mobile app / API / desktop / CLI / library]
- Tech stack: [languages, frameworks, databases, hosting]
- Live URL (if any): [URL or "not deployed"]
- Who can use it: [public / authenticated users / internal staff only]
- Sensitive data handled: [PII / payments / health / auth tokens / none]

WHAT I WANT YOU TO DO
1. First, read the repo structure and confirm what kind of application this actually is. State your understanding in 3-5 lines before doing anything else.
2. Identify the real attack surface — only the parts of the system the user controls. Do NOT list issues that belong to shared hosting infrastructure, the OS, or third-party SaaS unless the user has misconfigured them.
3. For each finding, produce:
   - Severity: Critical / High / Medium / Low / Informational
   - Exact file path and line numbers
   - What an attacker would do, step by step
   - Proof: either a command I can run to reproduce, or a code excerpt showing the bug
   - Concrete fix (code diff preferred)
4. Explicitly call out NON-findings: things that look scary but are actually fine in this context. This protects me from over-reacting to noise.
5. End with a "What I did NOT check" section listing scope gaps (e.g. "did not run dynamic auth tests because no test account was provided").

HARD RULES
- No generic OWASP boilerplate. Every claim must point at a specific line of MY code or a specific response from MY infrastructure.
- If you cannot verify something, say "unverified" rather than guessing.
- Do not flag normal, required services as vulnerabilities (e.g. HTTPS on 443, SMTP submission on 587 for a mail-sending app).
- Prefer fewer high-quality findings over many low-quality ones.
```

---

## 2. Static Website Audit (HTML/CSS/JS, no backend)

For marketing sites, portfolios, landing pages — like the Birdhouse site.

```
Audit this static website for real security risks. The site has NO backend — it is HTML, CSS, and JavaScript served from a host.

PROJECT CONTEXT
- Project path: [ABSOLUTE_PATH]
- Live domain: [https://example.com]
- Hosting provider: [Hostinger / Netlify / Vercel / cPanel / etc]
- Forms on the site send to: [EmailJS / Formspree / own backend / none]

CHECKS TO RUN (cite evidence for each)
1. HTTPS enforcement
   - curl HTTP and HTTPS, confirm 301 from HTTP → HTTPS
   - Verify TLS cert validity, expiry, issuer
2. Security response headers on the live site
   - Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
   - Report which are present and which are missing
3. Exposed sensitive paths — probe the live site for:
   - /.git/config, /.git/HEAD, /.env, /.htaccess, /.vscode/, /node_modules/, /package.json, /package-lock.json, /backup*, /.DS_Store, /sitemap.xml, /robots.txt
   - Anything returning 200 that shouldn't is a finding
4. Secrets in client-side JS
   - grep for API keys, tokens, EmailJS user IDs, Firebase configs, AWS keys, SMTP creds, hard-coded passwords
   - Distinguish "public-by-design" keys (e.g. EmailJS public key, Firebase config) from genuinely leaked secrets
5. Form handling
   - Where does the form POST? Is the endpoint rate-limited? Is there CAPTCHA / honeypot?
   - Is user input reflected anywhere in the DOM via innerHTML / document.write (XSS risk)?
6. Third-party scripts
   - List every external <script src> and <link href> and explain what each does and whether SRI (integrity=) is set
7. DNS / email auth (if domain sends email)
   - SPF, DKIM, DMARC records
   - DMARC policy: none / quarantine / reject
8. robots.txt and sitemap.xml — are they leaking unintended URLs?
9. .htaccess / _headers / netlify.toml / vercel.json — review configuration
10. Domain registrar hygiene reminders (registrar lock, 2FA) — note as advisory

OUTPUT FORMAT
For each finding: Severity | What | Evidence (command + response) | Fix.
End with: "What is fine and should NOT be treated as a vulnerability" — list shared-hosting services or normal infra that a junk port-scan report might flag.
```

---

## 3. Full-Stack Web Application Audit (frontend + backend)

For anything with a real server: Node/Express, Django, Rails, Laravel, Next.js with API routes, etc.

```
Audit this full-stack web application as a senior application security engineer. Focus on exploitable bugs, not policy theater.

PROJECT CONTEXT
- Project path: [ABSOLUTE_PATH]
- Backend stack: [Node/Express, Django, Laravel, etc]
- Frontend stack: [React, Vue, plain HTML, etc]
- Database(s): [Postgres, MySQL, MongoDB, etc]
- Auth model: [sessions / JWT / OAuth / Firebase Auth / none yet]
- Deployment: [where, how]
- Data sensitivity: [what user data is stored]

AUTHENTICATION & SESSION
- Where are passwords hashed? Which algorithm? (bcrypt/argon2/scrypt acceptable; md5/sha1/plain → critical)
- Are passwords ever logged or returned in API responses?
- Session cookies: HttpOnly, Secure, SameSite set?
- JWT: algorithm pinned (no "alg: none"), secret strength, expiry, refresh strategy
- Password reset: token expiry, single-use, rate-limited, no user enumeration in responses
- Account lockout / rate-limiting on login
- 2FA / MFA support
- OAuth: state parameter, redirect_uri allowlist enforced server-side

AUTHORIZATION (the #1 most-missed bug class)
- For every endpoint that returns or modifies user data, confirm it checks ownership server-side
- IDOR: can user A access /api/orders/{id} for an order belonging to user B?
- Admin endpoints: role check enforced on every route, not just hidden from UI
- Tenant isolation: if multi-tenant, is tenant_id filtered in every query?

INPUT HANDLING
- SQL: parameterized queries everywhere, no string concatenation into SQL
- NoSQL: no operator injection (e.g. {"$ne": null} bypass)
- Command execution: no shell calls with user input
- File uploads: type validation, size limit, stored outside webroot or with random names, no execution permissions
- Path traversal: any fs.readFile / open() with user-controlled paths?
- SSRF: any HTTP requests made to user-supplied URLs?
- XXE / unsafe deserialization: pickle, yaml.load, eval, Function()

OUTPUT HANDLING
- XSS: every place user input renders in HTML — is it escaped by the framework or manually?
- innerHTML / dangerouslySetInnerHTML / v-html — review each
- Content-Security-Policy: present and not "unsafe-inline"?

CSRF
- State-changing endpoints: CSRF token, SameSite cookie, or auth header required?

RATE LIMITING & ABUSE
- Login, signup, password reset, OTP, contact form, search — all rate-limited?
- Resource limits: max request body size, max upload size, max DB result rows

SECRETS & CONFIG
- .env, config files, hard-coded keys — grep the entire repo
- Are secrets in git history? (git log -p | grep)
- Are .env files in .gitignore?
- Are production secrets ever logged?

DEPENDENCIES
- Run the appropriate audit tool (npm audit, pip-audit, bundle audit, composer audit) and report results
- Highlight only Critical/High with a known exploit path in MY usage, not just "has CVE"

DEPLOYMENT
- HTTPS forced
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Database not exposed to public internet (verify with: which port is bound to 0.0.0.0?)
- Admin panel not on default path with default creds
- Debug mode / verbose errors disabled in production
- CORS policy: not "*" if cookies/auth are used

OUTPUT
- Severity | File:line | Attacker scenario | Reproduction | Fix (with code diff)
- A "Non-findings" section: things that LOOK suspicious but are intentional/safe
- A "What I did not test" section
```

---

## 4. API / Backend Service Audit (REST, GraphQL, microservice)

For headless APIs and backend services.

```
Audit this API/backend service for security issues. Treat it as if attackers will fuzz every endpoint.

PROJECT CONTEXT
- Project path: [ABSOLUTE_PATH]
- Protocol: [REST / GraphQL / gRPC / WebSocket]
- Auth: [API keys / OAuth / JWT / mTLS]
- Public or internal? [public-facing / internal VPC only]
- Rate limits in front of it: [Cloudflare / AWS WAF / none]

CHECKLIST
1. Enumerate every route/resolver. For each:
   - Authentication required? Verify by reading the actual middleware chain
   - Authorization rule: which roles/scopes/ownership checks apply?
   - Input validation: schema-validated (zod, pydantic, joi)? Or accepted blindly?
   - Output: any leakage of internal IDs, stack traces, full user objects when only a name is needed?
2. GraphQL specific:
   - Query depth limit
   - Query complexity limit
   - Introspection disabled in production
   - Batching abuse (alias amplification)
3. REST specific:
   - Mass assignment: are entire request bodies spread into DB updates?
   - HTTP method confusion: GET endpoints that mutate state
4. Rate limiting per endpoint (login, search, write ops)
5. CORS configuration — exact origins, credentials flag
6. Webhook receivers: signature verification implemented? Replay protection?
7. Pagination: any endpoint returning unbounded lists?
8. Long-running queries: timeouts on DB calls, HTTP clients?
9. Logging: do logs contain passwords, tokens, full request bodies with PII?
10. Error handling: do prod errors leak stack traces, SQL fragments, file paths?

PROVE each finding with file:line citation and the exact request that would exploit it (curl example).
```

---

## 5. Mobile App Audit (Android / iOS / React Native / Flutter)

```
Audit this mobile application for security issues. Mobile apps are client-side software — assume the binary will be reverse-engineered.

PROJECT CONTEXT
- Project path: [ABSOLUTE_PATH]
- Platform: [Android native / iOS native / React Native / Flutter / Ionic]
- Backend it talks to: [API URL]
- Auth flow: [how does the app get a token?]
- Sensitive features: [payments / chat / location / camera / file storage]

CLIENT-SIDE STORAGE
- Where are auth tokens stored? (Keychain/Keystore = good; SharedPreferences/AsyncStorage/localStorage = bad for secrets)
- Is sensitive data encrypted at rest?
- Backup flags: android:allowBackup=false, iOS NSFileProtection set?
- Any sensitive data in logs (Logcat / NSLog)?

NETWORK
- All API calls over HTTPS? Search for "http://" in the codebase
- Certificate pinning for high-value endpoints? (optional but recommended for fintech/health)
- Cleartext traffic permitted in network security config? (Android: cleartextTrafficPermitted, iOS: NSAllowsArbitraryLoads)

SECRETS IN THE BINARY
- grep entire project for API keys, OAuth client secrets, signing keys
- Anything found in source WILL be extractable from the shipped binary — treat as public
- Google Maps / Firebase / Stripe publishable keys are OK to ship; secret keys are NOT

PERMISSIONS
- AndroidManifest.xml / Info.plist — every permission requested. Justify each.
- Runtime permission rationale shown to user?

INTER-APP SURFACES
- Exported activities/services/broadcast receivers (Android) — review each for unintended access
- iOS URL schemes / Universal Links — validate input
- Deep links: can they trigger sensitive actions without re-auth?

WEBVIEWS
- JavaScript enabled? File access enabled? addJavascriptInterface exposed?
- Loading user-controlled URLs?

AUTH FLOW
- OAuth: PKCE used? (mandatory for mobile)
- Token refresh handled securely
- Logout actually invalidates tokens server-side

CODE PROTECTIONS
- Obfuscation/minification enabled for release (ProGuard/R8/Swift compiler)
- Debug symbols stripped
- Root/jailbreak detection (advisory, not a hard requirement)
- Anti-tamper / SafetyNet / DeviceCheck (advisory for high-risk apps)

THIRD-PARTY SDKS
- List every SDK and what data it collects
- Any known-malicious or surveillance SDKs?

OUTPUT
- Severity | File:line / manifest entry | Risk | Fix
- Distinguish issues that matter for THIS app's threat model vs generic mobile hygiene
```

---

## 6. Security Report Evaluation Prompt (vet a report someone sent you)

Use this when a "security analyst" sends you a report and you want to know if it's real or fluff. This is exactly the situation that triggered this file.

```
I received a security report about my project. I want you to evaluate the REPORT itself before I act on any of it.

INPUTS
- The report file: [PATH_TO_REPORT.pdf]
- My project: [ABSOLUTE_PATH]
- My live target the report claims to assess: [domain or IP]
- What I actually own/control: [my domain, my hosting account — NOT the underlying server if shared hosting]

EVALUATE THE REPORT ON THESE CRITERIA

1. Scope correctness
   - Does the report's target (IP/host) actually match my current infrastructure right now? Run: dig +short A [my-domain], compare to the IP in the report.
   - If shared hosting: are the "findings" actually about MY application, or about services run by the hosting provider for ALL customers (FTP, MySQL, mail, RPCBind, control panel ports)?
   - Findings that belong to shared infrastructure are NOT my exposure and I cannot remediate them.

2. Evidence quality
   - Does each finding include: service version, CVE reference, reproduction steps, request/response example?
   - Or is it just a list of open ports with boilerplate paragraphs? (The latter = nmap output dressed up.)

3. Specificity
   - Does the report cite any of MY actual code, MY actual endpoints, MY actual responses?
   - Or is every "finding" generic ("MySQL is exposed — attackers may brute-force") with no proof MySQL is actually mine, actually reachable from outside, or actually weak?

4. Severity calibration
   - Are normal, required services flagged as "high risk"? (e.g. SMTP submission on 587 for an app that sends email is REQUIRED, not a vulnerability)
   - Are recommendations actionable by ME, or do they require the hosting provider?

5. Cross-check with reality
   - For each finding, attempt to reproduce. If the report says "MySQL exposed on 3306": run "nc -zv [target] 3306" and "mysql -h [target] -u root" — does it actually accept connections? Is it actually MY database?
   - For each port, identify which service/owner it belongs to.

6. Author credibility signals
   - Methodology stated?
   - Tools used disclosed (nmap, nikto, Burp, etc)?
   - Versions checked against CVE database?
   - Any actual exploits demonstrated, even harmless ones?

OUTPUT
- A verdict per finding: VALID / INVALID / NOT MY RESPONSIBILITY / NEEDS MORE INFO
- An overall assessment of the report's quality: Professional / Mediocre / Junk / Possibly Scareware
- A short, polite reply I can send back to the analyst asking for the specific evidence missing from their report
- A separate list of the FEW issues (if any) that I should actually act on

Be blunt. Don't validate the report to be polite. A junk report wastes my time and money.
```

---

## 7. Pre-Launch Security Checklist (run before going live)

```
This project is about to launch. Run a pre-launch security checklist and tell me what would block me from shipping safely.

PROJECT
- Path: [ABSOLUTE_PATH]
- Launch target: [date]
- Type: [web / mobile / API]
- Will accept: [payments? user signups? file uploads? messages?]

PRODUCTION READINESS GATES (must all pass)
[ ] DEBUG=false / NODE_ENV=production / equivalent for stack
[ ] No console.log / print statements leaking secrets or PII in prod build
[ ] All secrets loaded from env vars or secret manager, never hard-coded
[ ] .env, .env.local, .env.production NOT committed (check git log too, not just current state)
[ ] HTTPS enforced; HSTS header set
[ ] Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
[ ] CORS configured to specific origins, not "*" if credentials are sent
[ ] Database not reachable from public internet
[ ] Default admin accounts disabled or password rotated
[ ] Error pages do not show stack traces in prod
[ ] Rate limiting on auth endpoints (login, signup, password reset, OTP)
[ ] Logging in place — but NOT logging passwords, tokens, full card numbers, full PII
[ ] Backups configured and TESTED (untested backups are not backups)
[ ] Dependency audit: 0 known-exploitable Critical/High in the dependency tree
[ ] Domain registrar locked, 2FA on registrar account
[ ] 2FA on hosting/cloud account
[ ] 2FA on any payment processor account
[ ] DNS: SPF, DKIM, DMARC if sending mail; DMARC at minimum p=quarantine after monitoring
[ ] If handling payments: PCI scope confirmed; raw card data never touches my server (Stripe Elements / equivalent)
[ ] If handling EU/UK users: privacy policy + cookie banner + lawful basis defined
[ ] If processing PII: data retention policy + deletion mechanism exists
[ ] Incident plan: I know who to call and what to do if breached

Verify each item by reading the actual code/config and running the actual checks. Don't tick a box based on assumption.

OUTPUT
- ✅ Passed checks
- ❌ Failed checks (these block launch)
- ⚠️ Advisory items (launch ok, but fix soon)
- Estimated time to fix the blockers
```

---

## 8. Dependency & Supply Chain Audit

Run this monthly or before major releases.

```
Audit this project's dependencies and supply chain for security issues.

PROJECT
- Path: [ABSOLUTE_PATH]
- Package manager(s): [npm / yarn / pnpm / pip / poetry / bundler / composer / cargo / go mod / gradle / maven]

CHECKS
1. Run the appropriate audit command and report full output:
   - npm: npm audit --json
   - yarn: yarn npm audit
   - pip: pip-audit
   - poetry: poetry export | pip-audit
   - bundler: bundle audit check --update
   - composer: composer audit
   - cargo: cargo audit
   - go: govulncheck ./...
2. For each Critical/High vulnerability:
   - Is the vulnerable code path actually reached by MY application? (most CVEs aren't, in practice)
   - Patched version available?
   - Breaking changes to upgrade?
3. Lockfile integrity
   - Is package-lock.json / yarn.lock / poetry.lock / Pipfile.lock / Gemfile.lock COMMITTED?
   - Any signs of tampering (sudden unfamiliar packages, typosquats)?
4. Typosquat / dependency confusion check
   - Any packages with names suspiciously close to popular ones (e.g. "reqeusts" vs "requests")?
   - Any internal-looking package names that could be claimed on public registries?
5. Unmaintained packages
   - Any direct dependency with last release > 2 years ago AND open security issues?
6. License risk (advisory)
   - Any GPL/AGPL deps in a project I plan to keep closed-source?
7. Postinstall scripts (npm)
   - Any package with a postinstall script doing network activity?

OUTPUT
- A prioritized action list: must-upgrade, should-upgrade, monitor
- Specific commands to run for each upgrade
- Any packages that should be replaced entirely
```

---

## Appendix A: Red flags for fake / junk security reports

If you receive a "security report" and it has these characteristics, be skeptical:

1. **Only lists open ports** with no service versions, no CVEs, no reproduction steps. That's `nmap` output, not an assessment.
2. **Generic boilerplate** like "MySQL exposure may lead to brute-force attacks" with no proof MySQL is actually yours or actually weak.
3. **Targets a shared-hosting IP** and attributes all services on that IP to your site. Most ports on shared hosting belong to the provider, not you.
4. **Recommendations you cannot act on** ("disable MySQL on the server") because you don't run the server.
5. **No tool disclosure** — won't say what they used or how they tested.
6. **No methodology section** — no scope, no rules of engagement, no test account, no consent letter, but they're reporting findings.
7. **All findings are "High"** with no calibration. Real assessments have a mix.
8. **No "false-positive review" section** — real consultants tell you what they checked and ruled out.
9. **Unsolicited and followed by an offer to fix it for a fee.** Classic shake-down pattern.
10. **Flags normal, required infrastructure** as vulnerabilities (port 443, port 587 on a mail-sending app, etc).

A legitimate report will: name a methodology (OWASP ASVS, NIST, PTES), cite versions and CVEs, include reproduction steps, distinguish your code from infrastructure, calibrate severity, and have a clear scope statement.

---

## Appendix B: Things you, the owner, should always do (regardless of project type)

These are not "audit findings" — they are durable habits.

- **Registrar 2FA + registrar lock** on every domain you own. Domain hijacking is the #1 way small businesses lose their identity online.
- **2FA on hosting/cloud accounts**, payment processors, GitHub, email.
- **Unique passwords via a password manager.** Reuse is how breaches cascade.
- **Backups, tested.** A backup you've never restored from is not a backup.
- **Patch monthly.** Set a calendar reminder; run the dependency audit prompt.
- **Don't commit secrets.** Use `.env` + `.gitignore`. If you ever commit one by accident, rotate it immediately — git history is forever.
- **Least privilege.** Don't give every collaborator admin. Don't give every API key full scope.
- **Have a "what if" plan.** If hacked tomorrow, who do you call, what do you reset, what do you tell customers?

---

End of file. Keep it next to your projects. Update the prompts as your stack evolves.
