import { Delaunay } from "d3-delaunay";
import { COURT_LENGTH, COURT_WIDTH } from "./court.js";

export interface Player {
  x: number;
  y: number;
  team: string;
  number: number;
  /** Velocity vector (court units), drawn as an arrow. */
  vx?: number;
  vy?: number;
}

const BLUE = "#3366cc";
const RED = "#cc3333";

// Starting formation (1-2-1) for the blue team, defending the left goal; red is the same rotated 180°.
const FORMATION: [number, number][] = [
  [1, 10], // 1: goalkeeper
  [7, 10], // 2: defender
  [13, 4], // 3: left wing
  [13, 16], // 4: right wing
  [18, 10], // 5: pivot
];

export function createPlayers(): Player[] {
  const blue = FORMATION.map(([x, y], i) => ({ x, y, team: BLUE, number: i + 1 }));
  const red = FORMATION.map(([x, y], i) => ({
    x: COURT_LENGTH - x,
    y: COURT_WIDTH - y,
    team: RED,
    number: i + 1,
  }));
  return [...blue, ...red];
}

// Each team gets its own hue family (blue-ish / red-ish), varied per player so cells stay distinguishable.
function cellColor(p: Player, i: number, perTeam: number): string {
  const last = perTeam - 1;
  const own = i % perTeam;
  // Blue players 1 and 5 trade colors.
  const j = p.team === BLUE && (own === 0 || own === last) ? last - own : own;
  const t = perTeam > 1 ? j / (perTeam - 1) : 0;
  const hue = p.team === BLUE ? 185 + t * 70 : (340 + t * 70) % 360;
  const light = j % 2 === 0 ? 50 : 62;
  return `hsl(${hue.toFixed(0)} 85% ${light}%)`;
}

export const PLAYER_RADIUS = 0.8;

/** A player is in play only while inside the court lines; players outside have no Voronoi cell. */
export const isOnCourt = (p: Player) =>
  p.x >= 0 && p.x <= COURT_LENGTH && p.y >= 0 && p.y <= COURT_WIDTH;

/** Seconds of lookahead per unit of speed, so faster players are projected further ahead. */
const LOOKAHEAD_PER_SPEED = 0.3;

/** Longest speed vector (arrow) a player can be given. */
export const MAX_SPEED = 8;

/** Each projection step keeps this fraction of the previous step's speed. */
const SPEED_RETENTION = 0.8;
const PROJECTION_STEPS = 4;
/** A projected site may reach this fraction of the way to the nearest rival site, so the player stays in his cell. */
const CELL_MARGIN = 0.95;

type Point = { x: number; y: number };

/** Unconstrained projected positions of a player, starting at his current one; steps are kept on court. */
function rawPath(p: Player): Point[] {
  let { vx = 0, vy = 0 } = p;
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const path = [{ x: p.x, y: p.y }];
  for (let k = 0; k < PROJECTION_STEPS; k++) {
    const t = Math.hypot(vx, vy) * LOOKAHEAD_PER_SPEED;
    const last = path[path.length - 1];
    path.push({ x: clamp(last.x + vx * t, COURT_LENGTH), y: clamp(last.y + vy * t, COURT_WIDTH) });
    vx *= SPEED_RETENTION;
    vy *= SPEED_RETENTION;
  }
  return path;
}

/**
 * Projected path for every player (empty for off-court players). Each step moves by the current velocity times a
 * speed-dependent horizon, then the velocity is retained at a reduced rate for the next step, so a fast player is
 * projected far ahead while the path tapers off.
 * Paths are then shrunk towards the player until each player is strictly closer to his own final site than to any
 * other, i.e. he stays inside his cell. Shrinking only ever tightens other constraints by shrinking, so it terminates.
 */
export function futurePaths(players: Player[]): Point[][] {
  const paths = players.map((p) => (isOnCourt(p) ? rawPath(p) : []));
  const full = paths.map((path) => path.at(-1));
  const scale = players.map(() => 1);
  const site = (i: number): Point =>
    full[i] ? { x: players[i].x + (full[i]!.x - players[i].x) * scale[i], y: players[i].y + (full[i]!.y - players[i].y) * scale[i] } : players[i];
  for (let pass = 0; pass < 200; pass++) {
    let changed = false;
    players.forEach((p, i) => {
      if (!full[i]) return;
      const reach = Math.hypot(full[i]!.x - p.x, full[i]!.y - p.y);
      if (reach === 0) return;
      let nearest = Infinity;
      players.forEach((q, j) => {
        if (j === i || !full[j]) return;
        const f = site(j);
        nearest = Math.min(nearest, Math.hypot(f.x - p.x, f.y - p.y));
      });
      const allowed = (CELL_MARGIN * nearest) / reach;
      if (scale[i] > allowed + 1e-9) {
        scale[i] = allowed;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return paths.map((path, i) =>
    path.map((q) => ({
      x: players[i].x + (q.x - players[i].x) * scale[i],
      y: players[i].y + (q.y - players[i].y) * scale[i],
    })),
  );
}

/** SVG fragment (court coordinates) with one Voronoi cell per on-court player and one dot per player. */
export function renderPlayers(players: Player[], portrait = false): string {
  const paths = futurePaths(players);
  const active = players
    .map((p, i) => ({ p, i, f: paths[i].at(-1) ?? p, path: paths[i] }))
    .filter(({ p }) => isOnCourt(p));
  const voronoi = Delaunay.from(
    active,
    ({ f }) => f.x,
    ({ f }) => f.y,
  ).voronoi([0, 0, COURT_LENGTH, COURT_WIDTH]);

  const cells = active
    .map(
      ({ p, i }, k) =>
        `<path d="${voronoi.renderCell(k)}" fill="${cellColor(p, i, players.length / 2)}" fill-opacity="0.7" stroke="#222" stroke-width="0.05"/>`,
    )
    .join("\n  ");
  const ghosts = active
    .filter(({ p, f }) => f.x !== p.x || f.y !== p.y)
    .map(
      ({ p, f, path }) =>
        `<polyline points="${path.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${p.team}" stroke-width="0.08" stroke-opacity="0.5" pointer-events="none"/>` +
        `<circle cx="${f.x.toFixed(2)}" cy="${f.y.toFixed(2)}" r="${PLAYER_RADIUS * 0.6}" fill="none" stroke="${p.team}" stroke-width="0.12" stroke-dasharray="0.25 0.2" pointer-events="none"/>`,
    )
    .join("");
  const dots = players
    .map(
      (p, i) =>
        `<g data-player="${i}" style="cursor:grab" opacity="${isOnCourt(p) ? 1 : 0.6}">` +
        `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${PLAYER_RADIUS}" fill="${p.team}" stroke="#fff" stroke-width="0.1"/>` +
        `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}"${portrait ? ` transform="rotate(-90 ${p.x.toFixed(2)} ${p.y.toFixed(2)})"` : ""} fill="#fff" font-size="1" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central" dy="-0.08" pointer-events="none">${p.number}</text>` +
        `</g>`,
    )
    .join("\n  ");
  const arrows = players.map((p, i) => renderArrow(p, i)).join("");
  return `${cells}\n  ${ghosts}\n  ${dots}\n  ${arrows}`;
}

export const MIN_ARROW = 0.3;

/** Velocity arrow from the player's centre; the head is the handle for re-dragging it. */
function renderArrow(p: Player, i: number): string {
  const { vx = 0, vy = 0 } = p;
  const len = Math.hypot(vx, vy);
  if (len < MIN_ARROW) return "";
  const ux = vx / len;
  const uy = vy / len;
  const tx = p.x + vx;
  const ty = p.y + vy;
  const h = Math.min(0.7, len);
  const bx = tx - ux * h;
  const by = ty - uy * h;
  const w = h * 0.5;
  const f = (n: number) => n.toFixed(2);
  return (
    `<line x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(bx)}" y2="${f(by)}" stroke="${p.team}" stroke-width="0.2" stroke-linecap="round" pointer-events="none"/>` +
    `<polygon data-arrow="${i}" style="cursor:grab" points="${f(tx)},${f(ty)} ${f(bx - uy * w)},${f(by + ux * w)} ${f(bx + uy * w)},${f(by - ux * w)}" fill="${p.team}" stroke="#fff" stroke-width="0.08"/>`
  );
}

export interface Ball {
  x: number;
  y: number;
}

export const BALL_RADIUS = PLAYER_RADIUS;

// Starts at the red goalkeeper's feet, just in front of him.
export const createBall = (): Ball => ({ x: COURT_LENGTH - 1 - PLAYER_RADIUS - BALL_RADIUS, y: COURT_WIDTH / 2 });

/** SVG fragment for a draggable ball: a white circle with three equal black pentagons, some cut off by the edge. */
export function renderBall(ball: Ball): string {
  const r = BALL_RADIUS;
  const size = r * 0.528;
  // One pentagon near the centre, two straddling the rim so they appear half visible.
  const centres: [number, number, number][] = [
    [-r * 0.15, -r * 0.1, -Math.PI / 2],
    [r * 0.95, r * 0.3, Math.PI / 2 + 0.4],
    [-r * 0.5, r * 0.95, -Math.PI / 2 + 0.9],
  ];
  const pentagons = centres
    .map(([cx, cy, rot]) => {
      const pts = Array.from({ length: 5 }, (_, k) => {
        const a = (k * 2 * Math.PI) / 5 + rot;
        return `${(cx + Math.cos(a) * size).toFixed(3)},${(cy - r * 0.15 + Math.sin(a) * size).toFixed(3)}`;
      }).join(" ");
      return `<polygon points="${pts}" fill="#222"/>`;
    })
    .join("");
  return (
    `<g data-ball style="cursor:grab" transform="translate(${ball.x.toFixed(2)} ${ball.y.toFixed(2)})">` +
    `<clipPath id="ball-clip"><circle r="${r}"/></clipPath>` +
    `<circle r="${r}" fill="#fff"/>` +
    `<g clip-path="url(#ball-clip)">${pentagons}</g>` +
    `<circle r="${r}" fill="none" stroke="#222" stroke-width="0.07"/>` +
    `</g>`
  );
}
