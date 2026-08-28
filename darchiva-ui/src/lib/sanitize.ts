import DOMPurify from 'dompurify';

/**
 * Sanitize untrusted HTML before injecting it into the DOM.
 * Strips scripts, event handlers, and other active content.
 */
export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
	});
}
