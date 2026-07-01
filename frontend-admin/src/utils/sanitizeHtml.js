import DOMPurify from 'dompurify';

/**
 * Same sanitizer as the student app — kept in sync so any tag / attr
 * an instructor can use in a lesson also renders in the admin preview.
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
    RETURN_TRUSTED_TYPE: false,
  });
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export default sanitizeHtml;
