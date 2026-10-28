/**
 * The Bulbuli bird as a round avatar: the same drawing as the logo (BrandMark.jsx), in any
 * colours, with an optional accessory. Vector, so it's sharp at any size and costs no download.
 *
 *   <BirdArt palette={{ body: '#8a7466', cap: '#1b2a49', … }} accessory="crown" />
 */
const DEFAULT = {
  body: '#8a7466', // breast and back
  cap: '#1b2a49', // head and crest
  wing: '#6d5a4f',
  tail: '#5c4a40',
  vent: '#e4333f', // the red patch under the tail (it's a red-vented bulbul)
  beak: '#f2b33d',
  line: '#1b2a49',
}

function Accessory({ kind, line }) {
  switch (kind) {
    case 'scholar': // graduation cap
      return (
        <g>
          <path d="M19 9 36 2l17 7-17 7Z" fill="#1f2937" stroke={line} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M26 12v6c4 3 16 3 20 0v-6" fill="#374151" stroke={line} strokeWidth="1.6" />
          <path d="M51 9.6v9" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="51" cy="20" r="2" fill="#f59e0b" />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M23 18 21 4l7 6 6-8 6 8 7-6-2 14Z" fill="#fbbf24" stroke={line} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="34" cy="12" r="1.8" fill="#e11d48" />
          <circle cx="27" cy="14" r="1.3" fill="#2563eb" />
          <circle cx="41" cy="14" r="1.3" fill="#2563eb" />
        </g>
      )
    case 'astro': // space helmet bubble + antenna
      return (
        <g>
          <path d="M34 4V-2" stroke={line} strokeWidth="1.6" />
          <circle cx="34" cy="-3" r="2.2" fill="#f43f5e" stroke={line} strokeWidth="1.2" />
          <circle cx="36" cy="27" r="23" fill="rgb(186 230 253 / 22%)" stroke="#e0f2fe" strokeWidth="2.4" />
          <path d="M22 14a17 17 0 0 1 10-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.9" />
        </g>
      )
    case 'wizard':
      return (
        <g>
          <path d="M17 19 30-8l4 6 13 21Z" fill="#6d28d9" stroke={line} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15 19c10-4 23-4 34-1" stroke={line} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M15 19c10-4 23-4 34-1" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="m30 6 1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3Z" fill="#fde047" />
        </g>
      )
    default:
      return null
  }
}

export default function BirdArt({ palette, accessory, className }) {
  const c = { ...DEFAULT, ...palette }
  const hat = accessory === 'scholar' || accessory === 'crown' || accessory === 'wizard'
  return (
    <svg className={className} viewBox="-4 -8 72 72" aria-hidden="true" focusable="false">
      <path d="M14 44 L3 50 Q2 55 7 56 L19 51 Z" fill={c.tail} stroke={c.line} strokeWidth="2.5" strokeLinejoin="round" />
      {!hat && <path d="M27 17 C23 11 23 5 27 1 C29 6 33 8 38 9 C35 11 36 14 39 16 Z" fill={c.cap} />}
      <ellipse cx="34" cy="38" rx="21" ry="20" fill={c.body} stroke={c.line} strokeWidth="3" />
      <path d="M15 31 C16 20 24 14 34 14 C44 14 51 21 53 30 C47 33 41 35 34 34 C27 33 20 31 15 31 Z" fill={c.cap} />
      <circle cx="41" cy="25" r="4.6" fill="#fff" />
      <circle cx="42" cy="25.5" r="2.3" fill={c.line} />
      <circle cx="43" cy="24.4" r="0.8" fill="#fff" />
      <path d="M51 27 L62 31 L51 35 Z" fill={c.beak} stroke={c.line} strokeWidth="2" strokeLinejoin="round" />
      <path d="M28 40 C35 37 45 41 46 50 C38 51 31 47 28 40 Z" fill={c.wing} />
      <path d="M16 46 C18 53 23 57 29 57 C26 52 22 48 16 46 Z" fill={c.vent} stroke={c.line} strokeWidth="2" strokeLinejoin="round" />
      <Accessory kind={accessory} line={c.line} />
    </svg>
  )
}
