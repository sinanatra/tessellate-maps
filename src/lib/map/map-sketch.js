import { TileSystem } from "./tile-system";
import { exportGrid, getA4Ratio } from "./exporter";
import { TILE_PROVIDER_OPTIONS } from "./providers";
import { createViewport, splitViewport } from "./viewport";

export class MapSketch {
  constructor(target, initial = {}) {
    this.target = target;
    this.options = {
      rows: initial.rows ?? 2,
      cols: initial.cols ?? 3,
      zoom: initial.zoom ?? 15,
      zoomDelta: initial.zoomDelta ?? 0,
      orientation: initial.orientation ?? "portrait",
      provider: initial.provider ?? "osm",
      dpi: initial.dpi ?? 300,
      filePrefix: initial.filePrefix ?? "map",
    };

    this.rows = this.options.rows;
    this.cols = this.options.cols;
    this.zoom = this.options.zoom;
    this.zoomDelta = this.options.zoomDelta;
    this.orientation = this.options.orientation;
    this.provider = this.options.provider;
    this.dpi = this.options.dpi;
    this.filePrefix = this.options.filePrefix ?? "map";

    this.p = null;
    this.p5Constructor = null;
    this.tileSystem = null;
    this.viewbox = null;
    this.center = { lat: 52.52, lng: 13.405 };
    this.stateSubscribers = new Set();
    this.shortcutListeners = new Set();
    this.viewport = null;
  }

  async init() {
    if (this.p) return;
    if (!this.p5Constructor) {
      const mod = await import("p5");
      this.p5Constructor = mod.default;
    }

    await new Promise((resolve) => {
      if (!this.p5Constructor) return resolve();
      this.p = new this.p5Constructor(
        (instance) => this.defineSketch(instance, resolve),
        this.target
      );
    });
  }

  defineSketch(p, resolve) {
    p.setup = () => {
      const rect = this.target.getBoundingClientRect();
      p.createCanvas(Math.max(1, rect.width), Math.max(1, rect.height));
      p.pixelDensity(1);
      this.tileSystem = new TileSystem(p, this.provider);
      this.notifyState();
      resolve();
    };

    p.windowResized = () => {
      this.resize();
    };

    p.draw = () => {
      this.render(p);
    };

    p.mouseDragged = () => {
      this.handleDrag(p);
    };

    p.touchMoved = () => {
      this.handleDrag(p);
      return false;
    };

    // p.mouseWheel = (event) => {
    //   const delta = event.deltaY > 0 ? -1 : 1;
    //   this.setZoom(this.zoom + delta, p.mouseX, p.mouseY);
    //   return false;
    // };

    p.keyPressed = () => {
      if (p.key === "+" || p.key === "=") {
        this.setZoom(this.zoom + 1, p.width / 2, p.height / 2);
      } else if (p.key === "-" || p.key === "_") {
        this.setZoom(this.zoom - 1, p.width / 2, p.height / 2);
      }
      //    else if (p.key === "s" || p.key === "S") {
      //     this.cycleProvider();
      //   }
      //   else if (p.key === "e" || p.key === "E") {
      //     this.triggerExportShortcut();
      //   }
    };
  }

  render(p) {
    if (!this.tileSystem) return;
    p.background("azure");
    const frame = this.computeGridFrame(p.width, p.height);
    const viewport = createViewport(
      this.tileSystem,
      this.center,
      this.zoom,
      frame
    );
    this.applyViewport(viewport);
    const tileSize = this.tileSystem.getTileSize();
    const { left: viewLeft, top: viewTop, width, height } =
      viewport.pixelBounds;
    const minX = Math.floor(viewLeft / tileSize);
    const maxX = Math.floor((viewLeft + width) / tileSize);
    const minY = Math.floor(viewTop / tileSize);
    const maxY = Math.floor((viewTop + height) / tileSize);

    const ctx = p.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(frame.left, frame.top, frame.width, frame.height);
    ctx.clip();

    for (let ty = minY; ty <= maxY; ty += 1) {
      for (let tx = minX; tx <= maxX; tx += 1) {
        const record = this.tileSystem.getTile(this.zoom, tx, ty);
        if (record.ready && record.image) {
          const dx = tx * tileSize - viewLeft + frame.left;
          const dy = ty * tileSize - viewTop + frame.top;
          p.image(record.image, dx, dy, tileSize, tileSize);
        }
      }
    }

    ctx.restore();
    this.drawGrid(p, frame);
  }

  drawGrid(p, frame) {
    p.stroke("blue");
    p.noFill();
    p.rect(frame.left, frame.top, frame.width, frame.height);
    const cellWidth = frame.width / this.cols;
    const cellHeight = frame.height / this.rows;
    for (let row = 0; row <= this.rows; row += 1) {
      const y = frame.top + row * cellHeight;
      p.line(frame.left, y, frame.left + frame.width, y);
    }
    for (let col = 0; col <= this.cols; col += 1) {
      const x = frame.left + col * cellWidth;
      p.line(x, frame.top, x, frame.top + frame.height);
    }
  }

  handleDrag(p) {
    if (!this.tileSystem) return;
    if (Array.isArray(p.touches) && p.touches.length > 1) {
      return;
    }
    const current = this.screenToWorld(p.mouseX, p.mouseY);
    const previous = this.screenToWorld(p.pmouseX, p.pmouseY);
    this.center.lat += previous.lat - current.lat;
    this.center.lng += previous.lng - current.lng;
    this.center.lat = this.clampLatitude(this.center.lat);
    this.center.lng = this.normalizeLongitude(this.center.lng);
    this.invalidateViewport();
  }

  setZoom(nextZoom, focusX, focusY) {
    if (!this.tileSystem || !this.p) return;
    const clamped = Math.max(1, Math.min(19, nextZoom));
    if (clamped === this.zoom) return;
    const before = this.screenToWorld(focusX, focusY);
    this.zoom = clamped;
    const after = this.screenToWorld(focusX, focusY);
    this.center.lat += before.lat - after.lat;
    this.center.lng += before.lng - after.lng;
    this.invalidateViewport();
    this.notifyState();
  }

  zoomBy(step) {
    if (!this.p) return;
    const focusX = this.p.width / 2;
    const focusY = this.p.height / 2;
    this.setZoom(this.zoom + step, focusX, focusY);
  }

  screenToWorld(x, y) {
    if (!this.tileSystem || !this.p) return this.center;
    const frame = this.computeGridFrame(this.p.width, this.p.height);
    const centerPixel = this.tileSystem.latLngToPixel(
      this.center.lng,
      this.center.lat,
      this.zoom
    );
    const relativeX = x - frame.left;
    const relativeY = y - frame.top;
    const px = centerPixel.x - frame.width / 2 + relativeX;
    const py = centerPixel.y - frame.height / 2 + relativeY;
    return this.tileSystem.pixelToLatLng(px, py, this.zoom);
  }

  cycleProvider() {
    const index = TILE_PROVIDER_OPTIONS.findIndex(
      (item) => item.key === this.provider
    );
    const next =
      TILE_PROVIDER_OPTIONS[(index + 1) % TILE_PROVIDER_OPTIONS.length];
    this.setProvider(next.key);
  }

  resize(width, height) {
    if (!this.p) return;
    const rect = this.target.getBoundingClientRect();
    const nextWidth = Math.max(1, width ?? rect.width);
    const nextHeight = Math.max(1, height ?? rect.height);
    this.p.resizeCanvas(nextWidth, nextHeight);
    this.invalidateViewport();
  }

  applyViewport(viewport) {
    this.viewport = viewport;
    this.viewbox = { ...viewport.latLngBounds };
    this.notifyState();
  }

  invalidateViewport() {
    this.viewport = null;
    this.viewbox = null;
  }

  updateViewbox(currentViewport) {
    if (!this.tileSystem || !this.p) return;
    let viewport = currentViewport;
    if (!viewport) {
      const frame = this.computeGridFrame(this.p.width, this.p.height);
      viewport = createViewport(this.tileSystem, this.center, this.zoom, frame);
    }
    this.applyViewport(viewport);
  }

  async exportGrid() {
    if (!this.tileSystem || !this.p) return;
    let viewport = this.viewport;
    if (!viewport) {
      const frame = this.computeGridFrame(this.p.width, this.p.height);
      viewport = createViewport(this.tileSystem, this.center, this.zoom, frame);
      this.applyViewport(viewport);
    }
    const bboxes = splitViewport(this.tileSystem, viewport, this.rows, this.cols);

    await exportGrid(this.p, this.tileSystem, bboxes, {
      rows: this.rows,
      cols: this.cols,
      zoom: this.zoom,
      zoomDelta: this.zoomDelta,
      orientation: this.orientation,
      dpi: this.dpi,
      filePrefix: this.filePrefix,
    });
  }

  setCenter(lat, lng, zoomLevel) {
    const boundedLat = this.clampLatitude(lat);
    const wrappedLng = this.normalizeLongitude(lng);
    this.center.lat = boundedLat;
    this.center.lng = wrappedLng;
    if (typeof zoomLevel === "number") {
      this.zoom = Math.max(1, Math.min(19, Math.round(zoomLevel)));
    }
    this.invalidateViewport();
    this.notifyState();
  }

  subscribe(fn) {
    this.stateSubscribers.add(fn);
    fn(this.snapshot());
    return () => {
      this.stateSubscribers.delete(fn);
    };
  }

  onExportShortcut(handler) {
    this.shortcutListeners.add(handler);
    return () => {
      this.shortcutListeners.delete(handler);
    };
  }

  triggerExportShortcut() {
    this.shortcutListeners.forEach((listener) => listener());
  }

  snapshot() {
    return {
      center: { ...this.center },
      rows: this.rows,
      cols: this.cols,
      zoom: this.zoom,
      zoomDelta: this.zoomDelta,
      provider: this.provider,
      orientation: this.orientation,
      viewbox: this.viewbox ? { ...this.viewbox } : null,
    };
  }

  notifyState() {
    const state = this.snapshot();
    this.stateSubscribers.forEach((fn) => fn(state));
  }

  setGrid(rows, cols) {
    const safeRows = Math.max(1, Math.round(rows));
    const safeCols = Math.max(1, Math.round(cols));
    if (safeRows === this.rows && safeCols === this.cols) return;
    this.rows = safeRows;
    this.cols = safeCols;
    this.invalidateViewport();
    this.notifyState();
  }

  setZoomDelta(delta) {
    const safe = Math.max(0, Math.round(delta));
    if (safe === this.zoomDelta) return;
    this.zoomDelta = safe;
    this.notifyState();
  }

  setOrientation(orientation) {
    if (orientation === this.orientation) return;
    this.orientation = orientation;
    this.invalidateViewport();
    this.notifyState();
  }

  setProvider(key) {
    if (key === this.provider) return;
    this.provider = key;
    if (this.tileSystem) {
      this.tileSystem.setProvider(key);
    }
    this.invalidateViewport();
    this.notifyState();
  }

  setDpi(dpi) {
    if (dpi === this.dpi) return;
    this.dpi = dpi;
  }

  setFilePrefix(prefix) {
    this.filePrefix = prefix;
  }

  destroy() {
    if (this.p) {
      this.p.remove();
    }
    this.p = null;
    this.tileSystem = null;
    this.stateSubscribers.clear();
    this.shortcutListeners.clear();
  }

  getCellRatio() {
    return getA4Ratio(this.orientation);
  }

  computeGridFrame(width, height) {
    const cellRatio = this.getCellRatio();
    const gridRatio = (this.cols * cellRatio) / Math.max(1, this.rows);
    let gridWidth = width;
    let gridHeight = gridWidth / gridRatio;
    if (gridHeight > height) {
      gridHeight = height;
      gridWidth = gridHeight * gridRatio;
    }
    const left = (width - gridWidth) / 2;
    const top = (height - gridHeight) / 2;
    return { left, top, width: gridWidth, height: gridHeight };
  }

  clampLatitude(lat) {
    return Math.max(-85, Math.min(85, lat));
  }

  normalizeLongitude(lng) {
    let normalized = lng % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    return normalized;
  }
}
