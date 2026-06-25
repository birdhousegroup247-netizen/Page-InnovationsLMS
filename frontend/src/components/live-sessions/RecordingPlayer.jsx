import { useMemo } from 'react';
import { ExternalLink, Video as VideoIcon } from 'lucide-react';
import { describeRecording } from '../../utils/videoEmbed';

/**
 * Drop-in player for an instructor-uploaded recorded class.
 *
 *  - If the URL is a Drive / YouTube / Vimeo / Loom share, we render
 *    an <iframe> pointing at that provider's no-download embed URL.
 *  - If it's a direct video file (.mp4 / .webm / etc.) we render a
 *    <video> with controlsList="nodownload" and disable PiP +
 *    right-click. Not bulletproof but stops casual saving.
 *  - If it's nothing we recognise, we render a button that opens it
 *    in a new tab as a fallback.
 *
 * Sized at a 16/9 ratio so it fits naturally in the lesson body.
 */
export default function RecordingPlayer({ url, title }) {
  const desc = useMemo(() => describeRecording(url), [url]);

  if (!desc) {
    return (
      <div className="flex items-center justify-center w-full h-64 rounded-xl bg-gray-50 dark:bg-dark-700 border border-dashed border-gray-300 dark:border-border-dark text-sm text-gray-500 dark:text-text-dark-muted">
        Recording not available yet.
      </div>
    );
  }

  if (desc.kind === 'link') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-64 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-border-dark p-6 text-center">
        <VideoIcon className="w-10 h-10 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-3">
          This recording is hosted somewhere we can't embed directly.
        </p>
        <a
          href={desc.src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open recording
        </a>
      </div>
    );
  }

  // Iframe embed (Drive / YouTube / Vimeo / Loom)
  if (desc.kind === 'iframe') {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={desc.src}
          title={title || 'Recorded class'}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          // No allowFullScreen on Drive previews (they have their own
          // fullscreen control built in); YouTube/Vimeo/Loom need it.
          allowFullScreen={desc.provider !== 'drive'}
        />
      </div>
    );
  }

  // Direct video file — anti-download affordances on the player itself.
  // No download chip in the controls, no PiP, right-click suppressed.
  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
      <video
        src={desc.src}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
