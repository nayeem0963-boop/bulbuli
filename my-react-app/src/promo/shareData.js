// What the share sheet receives when the talking video is shared.

/** The public site address sent with every shared video. */
export const SHARE_URL = 'https://bulbuli.org'

/**
 * Share-sheet data for the video: the file, a title, the caption text and the site link as `url`.
 * Chat apps (WhatsApp, Messenger, SMS) post the text with the link under the video, and turn
 * https://bulbuli.org into a tappable link.
 *
 * If the browser says it can't share a file together with a `url`, the link is written into the
 * caption instead, so it is never lost.
 */
export function buildVideoShareData({ file, title, text, url = SHARE_URL }, canShare = globalThis.navigator?.canShare?.bind(globalThis.navigator)) {
  const data = { files: [file], title, text, url }
  if (!canShare || canShare(data)) return data
  return { files: [file], title, text: `${text} ${url}` }
}

/** The Math Hero landing page that the "Share with Friends" button sends. */
export const SHARE_PAGE_URL = 'https://bulbuli.org/share/math-hero'

/** Share-sheet data for the landing-page link: a title, a friendly message and the page URL. */
export function buildLinkShareData({ title, text, url = SHARE_PAGE_URL }) {
  return { title, text, url }
}
