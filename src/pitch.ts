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

export function createPlayers(perTeam = 5): Player[] {
  return Array.from({ length: perTeam * 2 }, (_, i) => ({
    x: Math.random() * COURT_LENGTH,
    y: Math.random() * COURT_WIDTH,
    team: i < perTeam ? BLUE : RED,
    number: (i % perTeam) + 1,
  }));
}

// Each team gets its own hue family (blue-ish / red-ish), varied per player so cells stay distinguishable.
function cellColor(p: Player, i: number, perTeam: number): string {
  const j = i % perTeam;
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
        `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}"${portrait ? ` transform="rotate(-90 ${p.x.toFixed(2)} ${p.y.toFixed(2)})"` : ""} fill="#fff" font-size="1" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central" pointer-events="none">${p.number}</text>` +
        `</g>`,
    )
    .join("\n  ");
  return `${cells}\n  ${dots}`;
}
