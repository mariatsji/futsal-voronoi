export const COURT_LENGTH = 40;
export const COURT_WIDTH = 20;
export const GOAL_WIDTH = 3;
export const PENALTY_RADIUS = 6;
export const GOAL_DEPTH = 0.5;
export const CENTER_CIRCLE_RADIUS = 3;
export const MARGIN = 2;

const LINE = 0.08;

// Draws the goal and penalty area for one end. Penalty area = a quarter circle
// (radius 6m) around each goal post, joined by a straight line 6m from the goal line.
function end(side: "left" | "right"): string {
  const left = side === "left";
  const x = (v: number) => (left ? v : COURT_LENGTH - v);
  const sweep = left ? 1 : 0;
  const mid = COURT_WIDTH / 2;
  const topPost = mid - GOAL_WIDTH / 2;
  const bottomPost = mid + GOAL_WIDTH / 2;
  const r = PENALTY_RADIUS;

  const area =
    `M ${x(0)} ${topPost - r} A ${r} ${r} 0 0 ${sweep} ${x(r)} ${topPost} ` +
    `L ${x(r)} ${bottomPost} A ${r} ${r} 0 0 ${sweep} ${x(0)} ${bottomPost + r}`;
  const goalX = left ? -GOAL_DEPTH : COURT_LENGTH;

  return `
    <path d="${area}" fill="none"/>
    <rect x="${goalX}" y="${topPost}" width="${GOAL_DEPTH}" height="${GOAL_WIDTH}" fill="none"/>`;
}

/** SVG fragment for the court lines, in metres (origin at the top-left corner of the court). */
export function courtLines(): string {
  const mid = COURT_WIDTH / 2;
  return `<g stroke="#fff" stroke-width="${LINE}" stroke-linejoin="round">
    <rect x="0" y="0" width="${COURT_LENGTH}" height="${COURT_WIDTH}" fill="none"/>
    <line x1="${COURT_LENGTH / 2}" y1="0" x2="${COURT_LENGTH / 2}" y2="${COURT_WIDTH}"/>
    <circle cx="${COURT_LENGTH / 2}" cy="${mid}" r="${CENTER_CIRCLE_RADIUS}" fill="none"/>
    ${end("left")}${end("right")}
  </g>`;
}

/**
 * Full SVG document of the court seen from above, optionally with extra content drawn under the lines.
 * `aspect` (container width / height) makes the drawing grow to fill the container, so no unused space is left.
 */
export function courtSvg(underlay = "", portrait = false, aspect = 0): string {
  const w = COURT_LENGTH + 2 * MARGIN;
  const h = COURT_WIDTH + 2 * MARGIN;
  // In portrait the court is rotated 90° clockwise so it fills a tall screen.
  const [baseW, baseH] = portrait ? [h, w] : [w, h];
  let vw = baseW;
  let vh = baseH;
  if (aspect > 0) {
    if (aspect > baseW / baseH) vw = baseH * aspect;
    else vh = baseW / aspect;
  }
  const offX = (vw - baseW) / 2;
  const offY = (vh - baseH) / 2;
  const transform = portrait ? `translate(${h} 0) rotate(90)` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vw * 20}" height="${vh * 20}" viewBox="0 0 ${vw} ${vh}">
  <rect width="${vw}" height="${vh}" fill="#2d6a4f"/>
  <g id="court" transform="translate(${offX} ${offY}) ${transform} translate(${MARGIN} ${MARGIN})">
  <rect x="0" y="0" width="${COURT_LENGTH}" height="${COURT_WIDTH}" fill="#d98c3f"/>
  ${underlay}
  ${courtLines()}
  </g>
  <text x="0.3" y="${MARGIN / 2}" fill="#fff" fill-opacity="0.9" font-size="1.2" font-weight="bold" font-family="sans-serif" text-anchor="start" dominant-baseline="central" pointer-events="none">Futsal Voronoi</text>
</svg>
`;
}
