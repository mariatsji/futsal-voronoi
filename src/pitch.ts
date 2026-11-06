import { Delaunay } from "d3-delaunay";
import { COURT_LENGTH, COURT_WIDTH } from "./court.js";

export interface Player {
  x: number;
  y: number;
  team: string;
  number: number;
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

/** SVG fragment (court coordinates) with one Voronoi cell per on-court player and one dot per player. */
export function renderPlayers(players: Player[], portrait = false): string {
  const active = players.map((p, i) => ({ p, i })).filter(({ p }) => isOnCourt(p));
  const voronoi = Delaunay.from(
    active,
    ({ p }) => p.x,
    ({ p }) => p.y,
  ).voronoi([0, 0, COURT_LENGTH, COURT_WIDTH]);

  const cells = active
    .map(
      ({ p, i }, k) =>
        `<path d="${voronoi.renderCell(k)}" fill="${cellColor(p, i, players.length / 2)}" fill-opacity="0.7" stroke="#222" stroke-width="0.05"/>`,
    )
    .join("\n  ");
  const dots = players
    .map(
      (p, i) =>
        `<g data-player="${i}" style="cursor:grab" opacity="${isOnCourt(p) ? 1 : 0.6}">` +
        `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${PLAYER_RADIUS}" fill="${p.team}" stroke="#fff" stroke-width="0.1"/>` +
        `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}"${portrait ? ` transform="rotate(-90 ${p.x.toFixed(2)} ${p.y.toFixed(2)})"` : ""} fill="#fff" font-size="1" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central" dy="-0.08" pointer-events="none">${p.number}</text>` +
        `</g>`,
    )
    .join("\n  ");
  return `${cells}\n  ${dots}`;
}

export interface Ball {
  x: number;
  y: number;
}

export const BALL_RADIUS = 0.5;

// Starts at the red goalkeeper's feet, just in front of him.
export const createBall = (): Ball => ({ x: COURT_LENGTH - 1 - PLAYER_RADIUS - BALL_RADIUS, y: COURT_WIDTH / 2 });

/** SVG fragment for a draggable ball: a white circle with a black pentagon, as seen from above. */
export function renderBall(ball: Ball): string {
  const r = BALL_RADIUS;
  const pentagon = Array.from({ length: 5 }, (_, k) => {
    const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
    return `${(Math.cos(a) * r * 0.45).toFixed(3)},${(Math.sin(a) * r * 0.45).toFixed(3)}`;
  }).join(" ");
  return (
    `<g data-ball style="cursor:grab" transform="translate(${ball.x.toFixed(2)} ${ball.y.toFixed(2)})">` +
    `<circle r="${r}" fill="#fff" stroke="#222" stroke-width="0.07"/>` +
    `<polygon points="${pentagon}" fill="#222"/>` +
    `</g>`
  );
}
