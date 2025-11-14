// @ts-nocheck
import { waitForTile } from "./tile-system";

const MM_PER_INCH = 25.4;

export function getA4Dimensions(orientation, dpi) {
  const widthMm = orientation === "portrait" ? 210 : 297;
  const heightMm = orientation === "portrait" ? 297 : 210;
  return {
    widthPx: Math.round((widthMm / MM_PER_INCH) * dpi),
    heightPx: Math.round((heightMm / MM_PER_INCH) * dpi),
  };
}

export function getA4Ratio(orientation) {
  return orientation === "portrait" ? 210 / 297 : 297 / 210;
}

async function renderBoundingBox(p, tiles, bbox, zoom) {
  const tileSize = tiles.getTileSize();
  const nw = tiles.latLngToPixel(bbox.w, bbox.n, zoom);
  const se = tiles.latLngToPixel(bbox.e, bbox.s, zoom);
  const minX = Math.floor(nw.x / tileSize);
  const maxX = Math.floor(se.x / tileSize);
  const minY = Math.floor(nw.y / tileSize);
  const maxY = Math.floor(se.y / tileSize);
  const offsetX = minX * tileSize;
  const offsetY = minY * tileSize;
  const width = Math.max(1, Math.ceil(se.x - nw.x));
  const height = Math.max(1, Math.ceil(se.y - nw.y));

  const buffer = p.createGraphics(width, height);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      const record = tiles.getTile(zoom, tx, ty);
      await waitForTile(record);
      if (record.ready && record.image) {
        const dx = tx * tileSize - offsetX;
        const dy = ty * tileSize - offsetY;
        buffer.image(record.image, dx, dy, tileSize, tileSize);
      }
    }
  }

  return buffer;
}

export async function exportGrid(p, tiles, bboxes, options) {
  const {
    rows,
    cols,
    zoom,
    zoomDelta,
    orientation,
    dpi,
    filePrefix = "map",
  } = options;

  const targetZoom = Math.min(19, zoom + zoomDelta);
  const { widthPx, heightPx } = getA4Dimensions(orientation, dpi);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const bbox = bboxes[index];
      const graphics = await renderBoundingBox(
        p,
        tiles,
        {
          n: bbox.n,
          s: bbox.s,
          w: bbox.w,
          e: bbox.e,
        },
        targetZoom
      );
      const out = p.createGraphics(widthPx, heightPx);
      out.image(graphics, 0, 0, widthPx, heightPx);
      const filename = `${filePrefix}_${String(row + 1).padStart(
        2,
        "0"
      )}_${String(col + 1).padStart(2, "0")}_${orientation}_z${targetZoom}.png`;
      p.save(out, filename);
      await pause(140);
    }
  }
}

function pause(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
