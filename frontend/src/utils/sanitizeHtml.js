import DOMPurify from 'dompurify';

/**
 * Defense-in-depth XSS sanitizer for anywhere we use
 * `dangerouslySetInnerHTML`. The server smartSanitizer already strips
 * `<script>` before storage — this is the client-side second wall so a
 * bypass in one layer doesn't instantly become code execution in the
 * browser.
 *
 * Preserves the formatting used in KnowledgeBase articles, course
 * lesson `article_content`, and instructor lesson previews (headings,
 * lists, links, images, code blocks, tables, iframes for embeds).
 *
 * If DOMPurify is ever tripped by a legitimate embed, add it to the
 * ALLOWED_TAGS / ATTR list here rather than removing the sanitizer.
 */
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'div', 'span', 'blockquote', 'pre', 'code',
  'strong', 'em', 'b', 'i', 'u', 'sub', 'sup', 's', 'mark', 'small',
  'a', 'img', 'figure', 'figcaption', 'video', 'audio', 'source',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
  'iframe',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title', 'name',
  'src', 'alt', 'width', 'height', 'loading', 'poster',
  'class', 'style',
  'colspan', 'rowspan',
  'frameborder', 'allow', 'allowfullscreen', 'sandbox',
  'controls',
  'data-lang', 'data-course-id', 'data-lesson-id',
];

export function sanitizeHtml(dirty) {
  if (typeof dirty !== 'string' || !dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Force target=_blank links to also get rel=noopener noreferrer
    // via a hook (prevents window.opener tab-nabbing).
    RETURN_TRUSTED_TYPE: false,
  });
}

// Register a hook once (module load) that hardens <a target=_blank>.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export default sanitizeHtml;
