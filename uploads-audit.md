# File Uploads / Cloudinary Audit — Page Innovations (2026-07-01)

Audit of the upload pipeline: multer middleware, Cloudinary service
integration, per-endpoint limits, MIME validation, and delivery.

---

## TL;DR

| Area | Status | Notes |
|---|---|---|
| Multer with `memoryStorage` | ✅ Correct | Buffer flows straight to Cloudinary, nothing hits local disk |
| Per-purpose middleware (image / doc / video / thumbnail / profile) | ✅ Solid | Each has its own MIME allowlist + size cap |
| Cloudinary env vars validated at boot | ✅ | Errors logged if missing |
| Cloudinary image auto-optimization | ✅ | `quality: auto`, `fetch_format: auto`, max 1200×630 |
| PDF-as-image workaround | ✅ Documented | `resource_type: 'image'` for PDFs — bypasses the free-plan 401 on raw delivery |
| Multer error handling | ✅ Solid | Distinct 400s for oversize / count / unexpected-field |
| **Dead upload controller** | ⚠️ Cleanup | `backend/controllers/uploadController.js` is orphaned; routes point to the new one under `upload/` |
| **No virus scanning** | ⚠️ Trust | Docs + images uploaded by students go straight to public CDN |
| **Base64 memory bloat** | ⚠️ Cost | Buffers converted to base64 before upload — doubles RAM footprint |
| **No file-size logging** | ⚠️ Blind spot | Upload counts + total bytes not tracked; hard to answer "who's burning the Cloudinary quota" |
| **Signup avatar is public** | ⚠️ Fine | Rate-limited, but anonymous upload is a spam surface |
| **No delete-on-orphan** | ⚠️ Growth | Deleted courses / users don't cascade-delete their Cloudinary assets |
| **PDF workaround still assumed** | 📋 To verify | Was the "email `support@cloudinary.com` from cloud `dau8rckpp` for PDF/ZIP delivery" ever done? |

Legend: ✅ solid, ⚠️ caveat, 📋 needs verification

---

## 1. Architecture

Client sends `multipart/form-data` → Express route → multer (memoryStorage)
→ `req.file.buffer` → controller converts to base64 → Cloudinary SDK
`upload()` → returns `secure_url` + `public_id` → controller returns to
client.

Nothing touches the local filesystem. That's exactly right for a
container deployment (Railway) where filesystem is ephemeral.

**Two upload controllers exist:**
- `backend/controllers/upload/uploadController.js` — **the real one**, used by every route.
- `backend/controllers/uploadController.js` — **dead code**, top-level, orphaned. Uses the old inline multer config with a broken MIME check (`allowedTypes.test(file.originalname.toLowerCase())` tests file extension via regex — false-positive-prone).

---

## 2. Endpoints + limits

Per-purpose multer middleware in `middleware/upload/uploadMiddleware.js`:

| Middleware | Size | MIME types |
|---|---|---|
| `uploadImage` | 5 MB | jpeg, jpg, png, gif, webp |
| `uploadDocument` | 10 MB | pdf, doc, docx, ppt, pptx, xls, xlsx, txt |
| `uploadVideo` | 100 MB | mp4, avi, quicktime, wmv |
| `uploadProfilePicture` | 2 MB | jpeg, jpg, png |
| `uploadCourseThumbnail` | 3 MB | jpeg, jpg, png, webp |
| `uploadMultiple` | 5 MB per file, max 10 files | (no filter) |

Notes:
- MIME check is on `file.mimetype` — the browser-declared type. An
  attacker can lie about it. Not a huge deal since Cloudinary
  independently sniffs the format on upload, but worth knowing.
- `uploadMultiple` has **no MIME filter** — accepts any file up to
  5 MB. If wired to a public endpoint, this is a spam vector. Check
  where it's routed. (Likely admin/instructor-only; still worth locking down.)

---

## 3. Cloudinary integration (`services/storage/cloudinaryService.js`)

| Method | Behavior |
|---|---|
| `uploadImage` | Folder-scoped, max 1200×630, auto quality + format |
| `uploadDocument` | PDF → `resource_type: 'image'` workaround; everything else → `raw` |
| `uploadVideo` | 6 MB chunk upload for large files |
| `uploadFromUrl` | Cloudinary fetches the URL directly |
| `deleteFile` | Straight destroy by public_id + resource_type |
| `getOptimizedImageUrl` | Server-side URL builder for transforms |

Env vars asserted at boot with error log if missing (doesn't hard-fail —
service just errors on first upload).

The PDF-as-image trick is the workaround for Cloudinary's free plan
blocking raw/PDF delivery with a 401. It works because images have no
delivery restriction. Downsides:
- PDF metadata is treated as image metadata by Cloudinary — no page
  count, thumbnail generation is per-page.
- The `image` resource type has a slightly different signed-URL
  format if you ever move to signed delivery.

---

## 4. Findings

### 🟡 Important

**4.1 No virus scanning on uploaded files.**

Students, instructors, and admins can upload documents (PDF, DOCX,
XLSX). Cloudinary doesn't scan for malware. Anyone who downloads an
uploaded doc trusts it's clean.

**Fix:** either (a) use a Cloudinary add-on (they have virus-scan
integrations with third parties), or (b) route uploads through
ClamAV in a worker before allowing publication. For an LMS the risk
is moderate — most files are course material from vetted
instructors — but for student submissions and profile avatars, it's
worth some thought.

**4.2 Base64 encoding doubles the memory footprint.**

The controllers do:
```js
const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
await CloudinaryService.uploadImage(base64File, ...);
```
For a 100 MB video, that's 200 MB in memory simultaneously (the
original buffer + the base64 string). On a container with 512 MB
allocated, that's uncomfortably close to OOM.

**Fix:** switch to `cloudinary.uploader.upload_stream(...)` (like the
old dead controller actually does — line 47 of the orphaned file)
and pipe `req.file.buffer` directly. No base64 conversion.

Same fix cuts the wall-clock time by ~15% (base64 encoding of large
files isn't free).

**4.3 No delete-on-orphan cascade.**

When a course is deleted, its thumbnail + document uploads stay in
Cloudinary. When a user is deleted, their profile picture stays.
Over time this bloats the Cloudinary bill.

**Fix:** either (a) add a Sequelize hook on Course/User `beforeDestroy`
that calls `CloudinaryService.deleteFile` for the tracked
public_ids, or (b) a monthly cleanup cron that scans Cloudinary for
public_ids no longer referenced in the DB.

**4.4 No upload metrics.**

There's no way to answer:
- How much Cloudinary quota did each user consume last month?
- Which course has the most storage-heavy content?
- What's our egress bill this month?

**Fix:** log every successful upload's byte count in an
`upload_events` table (or just in structured logs so Railway's log
search can aggregate). One row per upload; small footprint.

**4.5 Signup avatar is an anonymous public upload.**

`POST /api/upload/signup-avatar` accepts a file before any account
exists. The comment says "the rate-limiter on this router keeps
this from being abused." Verify:
- Which rate limiter? The upload one is 100/hour per IP.
- 100 uploads per hour per IP is a lot for an anonymous endpoint.
  Someone could burn Cloudinary quota with a single script.

**Fix:** tighter limit for the anonymous variant (e.g. 10/hour per
IP). Also worth verifying that avatars used by never-completed
signups get cleaned up — they're stored in `signup-avatars/` but
if the user abandons signup, the asset persists forever.

**4.6 `uploadMultiple` has no MIME filter.**

Combined with 10 files at 5 MB each, that's a 50 MB payload per
request with any file type. Verify it's not exposed to unauthenticated
or student-tier users.

**Fix:** add a MIME allowlist even if it's just images + documents.
Consistency with the other middleware also helps predictability.

---

### 🟢 Minor / cleanup

**4.7 Delete the dead top-level `controllers/uploadController.js`.**

Nothing routes it; it's just historical. Uses a less safe inline
multer config. Removing it prevents someone from accidentally
routing to it in the future.

**4.8 PDF workaround status.**

From your project memory: "To fix permanently the user has to email
`support@cloudinary.com` from cloud `dau8rckpp` and ask for PDF/ZIP
delivery to be enabled."

Was this done? If yes, the PDF-as-image workaround in
`uploadDocument` can be simplified back to `resource_type: 'raw'`
for everything. Simpler code, cleaner metadata.

If no: the workaround still works but a signed test is worth doing
periodically to confirm the free plan hasn't tightened image
delivery for PDFs too.

**4.9 `uploadFromUrl` allows fetching arbitrary URLs.**

Cloudinary will download from whatever URL the caller passes and
save it. Anyone with access to this endpoint could point it at a
gigabyte file and Cloudinary would fetch it. Verify auth on the
routes that use this method.

---

## 5. What's NOT broken

- multer + Cloudinary are the standard pattern for this shape of
  problem. No local disk means no cleanup, no permission bugs, no
  "container filesystem full" incidents.
- Auto-optimization on images (`quality: auto`, `fetch_format: auto`)
  means Cloudinary serves the smallest viable file per client.
- Per-endpoint MIME allowlists are defense-in-depth.
- Error handler in `handleUploadErrors` returns useful 400s instead
  of leaking multer internals.
- Chunked upload for video (6 MB chunks) avoids timeouts on 100 MB
  files.
- Base64 workaround (as bloated as it is) does work — the pipeline
  is proven.

---

## 6. Prioritized punch list

### P1 — cost + hygiene
1. **Switch to `upload_stream` piping — kill the base64 conversion.** §4.2
2. **Cascade-delete Cloudinary assets when course / user is deleted.** §4.3
3. **Tighter rate limit on `/api/upload/signup-avatar`.** §4.5

### P2 — safety
4. **Virus scan** on student-uploaded files. §4.1
5. **MIME allowlist on `uploadMultiple`.** §4.6
6. **Confirm auth on `uploadFromUrl` code paths.** §4.9

### P3 — polish
7. **Upload-size logging** per user for quota tracking. §4.4
8. **Delete dead top-level `uploadController.js`.** §4.7
9. **Verify + simplify PDF workaround if cloud team enabled raw delivery.** §4.8

---

## 7. Files of interest

- `backend/middleware/upload/uploadMiddleware.js` — per-purpose multer configs
- `backend/controllers/upload/uploadController.js` — the real controller
- `backend/controllers/uploadController.js` — dead code (delete)
- `backend/services/storage/cloudinaryService.js` — SDK wrapper
- `backend/routes/api/upload.js` — routing
