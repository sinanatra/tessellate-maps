<script>
  import ControlPanel from "$lib/components/ControlPanel.svelte";
  import MapCanvas from "$lib/components/MapCanvas.svelte";

  let rows = 2;
  let cols = 2;
  let zoomDelta = 0;
  let orientation = "portrait";
  let provider = "osm";
  let dpi = 300;
  let filePrefix = "map";
  let innerGrid = 20;
  let isExporting = false;

  let canvasRef = null;
  let latestState = null;

  function handleControlChange(event) {
    const detail = event.detail;
    if (typeof detail.rows === "number") rows = detail.rows;
    if (typeof detail.cols === "number") cols = detail.cols;
    if (typeof detail.zoomDelta === "number") zoomDelta = detail.zoomDelta;
    if (detail.orientation) orientation = detail.orientation;
    if (detail.provider) provider = detail.provider;
    if (typeof detail.dpi === "number") dpi = detail.dpi;
    if (detail.filePrefix) filePrefix = detail.filePrefix;
    if (typeof detail.innerGrid === "number") innerGrid = detail.innerGrid;
  }

  async function handleExport() {
    if (!canvasRef || isExporting) return;
    isExporting = true;
    try {
      await canvasRef.exportGrid();
    } catch (error) {
      console.error(error);
    }
    isExporting = false;
  }

  function handleLocate(event) {
    if (!canvasRef) return;
    const { lat, lng, zoom } = event.detail;
    canvasRef.focusOn(lat, lng, zoom);
  }
</script>

<main class="page">
  <section class="panel">
    <ControlPanel
      {rows}
      {cols}
      {zoomDelta}
      {orientation}
      {provider}
      zoom={latestState?.zoom ?? 15}
      viewbox={latestState?.viewbox ?? null}
      center={latestState?.center ?? null}
      {isExporting}
      {dpi}
      {filePrefix}
      {innerGrid}
      on:change={handleControlChange}
      on:export={handleExport}
      on:locate={handleLocate}
    />
  </section>
  <section class="canvas">
    <MapCanvas
      bind:this={canvasRef}
      {rows}
      {cols}
      {zoomDelta}
      {orientation}
      {provider}
      {dpi}
      {filePrefix}
      {innerGrid}
      on:state={(event) => (latestState = event.detail)}
      on:exportshortcut={handleExport}
    />
  </section>
</main>

<style>
  .page {
    display: grid;
    grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    gap: 2rem;
    padding: .5rem max(1rem, 1vw);
    min-height: 100vh;
  }

  .panel {
    position: sticky;
    top: 1.5rem;
    align-self: start;
  }

  .canvas {
    min-height: calc(100vh - 5rem);
    display: flex;
    /* align-items: center;
    justify-content: center; */
  }

  .canvas :global(canvas) {
    width: 100% !important;
    height: 100% !important;
  }

  @media (max-width: 960px) {
    .page {
      grid-template-columns: 1fr;
    }

    .panel {
      position: static;
    }

    .canvas {
      min-height: 60vh;
    }
  }
</style>
