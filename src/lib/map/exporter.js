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
  const originX = nw.x;
  const originY = nw.y;
  const width = Math.max(1, Math.ceil(se.x - nw.x));
  const height = Math.max(1, Math.ceil(se.y - nw.y));

  const buffer = p.createGraphics(width, height);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      const record = tiles.getTile(zoom, tx, ty);
      await waitForTile(record);
      if (record.ready && record.image) {
        const dx = tx * tileSize - originX;
        const dy = ty * tileSize - originY;
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
      drawTileLabel(out, getColumnLabel(col), row + 1);
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

function getColumnLabel(index) {
  let n = Math.max(0, Math.floor(index));
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function drawTileLabel(graphics, colLabel, rowNumber) {
  const label = `${colLabel}${rowNumber}`;
  const size = Math.max(
    14,
    Math.round(Math.min(graphics.width, graphics.height) * 0.02)
  );
  const padding = Math.round(size * 0.4);
  const labelX = padding;
  const labelY = padding + Math.round(size * 0.5);

  graphics.push();
  graphics.textSize(size);
  graphics.textAlign(graphics.LEFT, graphics.TOP);
  const textWidth = graphics.textWidth(label);
  
  graphics.fill("#111");
  graphics.text(label, labelX, labelY);
  graphics.pop();
}
