# Tessellate Maps

An interactive SvelteKit + p5.js playground that lets you compose a printable tessellation of web map tiles and export each cell at a chosen DPI.

## Development

```sh
npm install
npm run dev
```

The dev server is available at <http://localhost:5173>. Update the controls panel to change rows, columns, providers, etc., and the `MapCanvas` updates in realtime.

## Building locally

```sh
npm run build
npm run preview 
```

The project now ships with `@sveltejs/adapter-static` and prerendering enabled, so `npm run build` creates a static bundle in `build/` that can be hosted on any static file server.
