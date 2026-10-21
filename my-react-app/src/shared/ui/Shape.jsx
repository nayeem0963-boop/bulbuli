const POINTS = {
  triangle: '20,5 35,33 5,33',
  star: '20,3 24.5,14.5 37,15 27,22.5 30.5,35 20,28 9.5,35 13,22.5 3,15 15.5,14.5',
  diamond: '20,3 36,20 20,37 4,20',
  hexagon: '11,6 29,6 38,20 29,34 11,34 2,20',
};

/** A puzzle shape. `color` is a semantic id ('red'); the hex lives in the --shape-* CSS tokens. */
export default function Shape({ shape, color, size }) {
  const style = { fill: `var(--shape-${color})` };
  let body;
  if (shape === 'circle') body = <circle cx="20" cy="20" r="15" style={style} />;
  else if (shape === 'square') body = <rect x="5" y="5" width="30" height="30" rx="4" style={style} />;
  else body = <polygon points={POINTS[shape] ?? POINTS.hexagon} style={style} />;
  return (
    <svg className="shape" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">
      {body}
    </svg>
  );
}
