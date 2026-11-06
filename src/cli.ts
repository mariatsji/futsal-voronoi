import { writeFileSync } from "node:fs";
import { courtSvg } from "./court.js";
import { createPlayers, renderPlayers } from "./pitch.js";

const out = process.argv[2] ?? "voronoi.svg";
writeFileSync(out, courtSvg(renderPlayers(createPlayers())));
console.log(`Wrote ${out}`);
