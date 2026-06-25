/**
 * Turn any common video-share URL into a safe embed configuration.
 *
 * Returns:
 *   { kind: 'iframe', src, provider }   for Drive / YouTube / Vimeo / Loom
 *   { kind: 'video',  src }              for direct .mp4 / .webm / .mov
 *   { kind: 'link',   src }              fallback — open in new tab
 *
 * Anti-download note: anything in a browser can be ripped if someone's
 * determined enough. What we do is remove the obvious affordances —
 * provider embeds use the /embed or /preview URL (no download button
 * in Drive when its share is set to "no download", YouTube/Vimeo/Loom
 * embeds don't expose the file). Direct video files get
 * controlsList="nodownload" and disabled PiP. For Drive: the
 * instructor MUST set Drive sharing to "Anyone with the link → Viewer"
 * AND check "Disable options to download, print, and copy" — without
 * that, the share UI exposes a download chip.
 */

const DRIVE_FILE_RE = /drive\.google\.com\/file\/d\/([^/]+)/i;
const DRIVE_OPEN_RE = /drive\.google\.com\/open\?id=([^&]+)/i;
const YT_WATCH_RE   = /youtube\.com\/watch\?v=([^&]+)/i;
const YT_SHORT_RE   = /youtu\.be\/([^?]+)/i;
const YT_EMBED_RE   = /youtube\.com\/embed\/([^?]+)/i;
const VIMEO_RE      = /vimeo\.com\/(\d+)/i;
const LOOM_RE       = /loom\.com\/share\/([a-z0-9]+)/i;
const VIDEO_EXT_RE  = /\.(mp4|webm|ogg|m4v|mov)(\?|$)/i;

/**
 * Make sure a user-pasted URL is absolute. Without a protocol the
 * browser treats `meet.google.com/abc` as a RELATIVE path, so an
 * <a href> inside an SPA ends up navigating the React Router to a
 * route like /admin/courses/123/meet.google.com/abc → which falls
 * back to the dashboard. Prefixing https:// fixes that.
 */
export function ensureAbsoluteUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const u = rawUrl.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^\/\//.test(u)) return 'https:' + u;
  return 'https://' + u.replace(/^\/+/, '');
}

export function describeRecording(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = ensureAbsoluteUrl(rawUrl);
  if (!url) return null;

  const driveFile = url.match(DRIVE_FILE_RE);
  if (driveFile) return { kind: 'iframe', provider: 'drive', src: `https://drive.google.com/file/d/${driveFile[1]}/preview` };

  const driveOpen = url.match(DRIVE_OPEN_RE);
  if (driveOpen) return { kind: 'iframe', provider: 'drive', src: `https://drive.google.com/file/d/${driveOpen[1]}/preview` };

  const ytWatch = url.match(YT_WATCH_RE);
  if (ytWatch) return { kind: 'iframe', provider: 'youtube', src: `https://www.youtube.com/embed/${ytWatch[1]}?rel=0&modestbranding=1` };

  const ytShort = url.match(YT_SHORT_RE);
  if (ytShort) return { kind: 'iframe', provider: 'youtube', src: `https://www.youtube.com/embed/${ytShort[1]}?rel=0&modestbranding=1` };

  const ytEmbed = url.match(YT_EMBED_RE);
  if (ytEmbed) return { kind: 'iframe', provider: 'youtube', src: `https://www.youtube.com/embed/${ytEmbed[1]}?rel=0&modestbranding=1` };

  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return { kind: 'iframe', provider: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}` };

  const loom = url.match(LOOM_RE);
  if (loom) return { kind: 'iframe', provider: 'loom', src: `https://www.loom.com/embed/${loom[1]}` };

  if (VIDEO_EXT_RE.test(url)) return { kind: 'video', src: url };

  return { kind: 'link', src: url };
}
