/** Home-page tile: two switches wired into an AND gate that lights a bulb. */
export default function LogicGateArt() {
  return (
    <svg className="art art-logic" viewBox="0 0 200 120" aria-hidden="true">
      <path className="art-logic-wire is-on" d="M38 36 C70 36 66 48 86 48" />
      <path className="art-logic-wire is-on" d="M38 84 C70 84 66 72 86 72" />
      <path className="art-logic-wire is-on" d="M138 60 H156" />
      <rect className="art-logic-switch" x="10" y="24" width="30" height="24" rx="12" />
      <circle className="art-logic-knob" cx="30" cy="36" r="7" />
      <rect className="art-logic-switch" x="10" y="72" width="30" height="24" rx="12" />
      <circle className="art-logic-knob" cx="30" cy="84" r="7" />
      <path className="art-logic-gate" d="M86 36 H112 A24 24 0 0 1 112 84 H86 Z" />
      <text className="art-logic-label" x="108" y="65">AND</text>
      <circle className="art-logic-bulb" cx="172" cy="56" r="16" />
      <rect className="art-logic-base" x="164" y="72" width="16" height="10" rx="2" />
    </svg>
  )
}
