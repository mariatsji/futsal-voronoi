# voronoi

Interactive Voronoi diagram on a futsal court (40m x 20m). Drag the players around and the sectors update live.

## Build and run

```sh
nix-shell                # provides node, npm, curl, jq (see shell.nix)
npm install              # first time only
npm run dev              # dev server with hot reload (http://localhost:5173)
```

Production build:

```sh
npm run build            # typecheck + bundle to dist/
npm start                # serve dist/ (http://localhost:4173)
```

Export a static random diagram as SVG:

```sh
npm run svg -- out.svg
```

## License

MIT, see [LICENSE](LICENSE). Copyright (c) Sjur Millidahl; the copyright notice must be kept in copies.
