import { COURT_LENGTH, COURT_WIDTH, MARGIN, courtSvg } from "./court.js";
import { PLAYER_RADIUS, createBall, createPlayers, renderBall, renderPlayers } from "./pitch.js";

const players = createPlayers();
const ball = createBall();
const app = document.getElementById("app")!;
const portraitQuery = window.matchMedia("(orientation: portrait)");

let dragging: { x: number; y: number } | null = null;
let svg: SVGSVGElement;
let layer: SVGGElement;

const layerContent = () => renderPlayers(players, portraitQuery.matches) + renderBall(ball);

function render(): void {
  const portrait = portraitQuery.matches;
  app.innerHTML = courtSvg(`<g id="layer">${layerContent()}</g>`, portrait);
  svg = app.querySelector("svg")!;
  layer = svg.querySelector("#layer")!;
}

// Players may be dragged into the margin outside the court (the "sideline"), where they have no cell.
function toCourt(e: PointerEvent): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  // The layer's CTM includes the portrait rotation, so this yields court coordinates in both orientations.
  const p = pt.matrixTransform(layer.getScreenCTM()!.inverse());
  const clamp = (v: number, max: number) =>
    Math.min(max + MARGIN - PLAYER_RADIUS, Math.max(-MARGIN + PLAYER_RADIUS, v));
  return { x: clamp(p.x, COURT_LENGTH), y: clamp(p.y, COURT_WIDTH) };
}

app.addEventListener("pointerdown", (e) => {
  const target = e.target as Element;
  if (target.closest("[data-ball]")) {
    dragging = ball;
  } else {
    const el = target.closest("[data-player]");
    if (!el) return;
    dragging = players[Number(el.getAttribute("data-player"))];
  }
  svg.setPointerCapture(e.pointerId);
});

app.addEventListener("pointermove", (e) => {
  if (dragging === null) return;
  Object.assign(dragging, toCourt(e));
  layer.innerHTML = layerContent();
});

const stop = () => (dragging = null);
app.addEventListener("pointerup", stop);
app.addEventListener("pointercancel", stop);

portraitQuery.addEventListener("change", render);
render();

const infoDialog = document.getElementById("info-dialog") as HTMLDialogElement;
document.getElementById("year")!.textContent = String(new Date().getFullYear());
document.getElementById("info-btn")!.addEventListener("click", () => infoDialog.showModal());
document.getElementById("info-close")!.addEventListener("click", () => infoDialog.close());
// Clicking the backdrop (outside the dialog box) also closes it.
infoDialog.addEventListener("click", (e) => {
  if (e.target === infoDialog) infoDialog.close();
});
