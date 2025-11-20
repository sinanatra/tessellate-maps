<script>
  import { createEventDispatcher } from "svelte";
  import { TILE_PROVIDER_OPTIONS } from "$lib/map/providers";

  const {
    rows = 2,
    cols = 2,
    zoomDelta = 1,
    orientation = "portrait",
    provider = "osm",
    zoom = 15,
    viewbox = null,
    center = null,
    isExporting = false,
    dpi = 300,
    filePrefix = "map",
    innerGrid = 0,
  } = $props();

  const dispatch = createEventDispatcher();

  let searchQuery = $state("");
  let searchResults = $state([]);
  let searching = $state(false);
  let searchError = $state("");
  let searchMessage = $state("");

  function updateNumber(field, value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    const minimum =
      field === "dpi" ? 72 : field === "zoomDelta" || field === "innerGrid"
        ? 0
        : 1;
    dispatch("change", {
      [field]: Math.max(minimum, parsed),
    });
  }

  function updateOrientation(value) {
    dispatch("change", { orientation: value });
  }

  function updateProvider(value) {
    dispatch("change", { provider: value });
  }

  function updatePrefix(value) {
    const trimmed = value.trim();
    dispatch("change", { filePrefix: trimmed || "map" });
  }

  function handleExport() {
    dispatch("export");
  }

  function emitLocate(lat, lng, label) {
    dispatch("locate", { lat, lng, label });
    searchMessage = label
      ? `Centered on ${label}`
      : `Centered on ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  function parseCoordinates(input) {
    const parts = input.split(/[,\s]+/).filter(Boolean);
    if (parts.length < 2) return null;
    const lat = Number.parseFloat(parts[0]);
    const lng = Number.parseFloat(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  async function searchLocation(event) {
    event?.preventDefault();
    const query = searchQuery.trim();
    searchError = "";
    searchResults = [];
    searchMessage = "";
    if (!query) return;

    const coords = parseCoordinates(query);
    if (coords) {
      emitLocate(coords.lat, coords.lng);
      return;
    }

    searching = true;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "tessellate-maps/1.0 (https://github.com/giacomonanni/tessellate-maps)",
          },
        }
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      if (!data.length) {
        searchMessage = "No results found.";
        searching = false;
        return;
      }
      searchResults = data;
    } catch (error) {
      console.error(error);
      searchError = "Unable to reach the geocoding service.";
    }
    searching = false;
  }

  function selectResult(result) {
    const lat = Number.parseFloat(result.lat);
    const lng = Number.parseFloat(result.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    searchResults = [];
    searchQuery = result.display_name;
    emitLocate(lat, lng, result.display_name);
  }
</script>

<section class="panel">
  <header>
    <div>
      <h1>Export map tiles into <br /> a printable A4 grid</h1>
    </div>
    <button class="export" onclick={handleExport} disabled={isExporting}>
      {#if isExporting}
        Exporting…
      {:else}
        Export Grid
      {/if}
    </button>
  </header>

  <div class="grid">
    <label>
      <span>Rows</span>
      <input
        type="number"
        min="1"
        value={rows}
        oninput={(event) => updateNumber("rows", event.currentTarget.value)}
      />
    </label>
    <label>
      <span>Cols</span>
      <input
        type="number"
        min="1"
        value={cols}
        oninput={(event) => updateNumber("cols", event.currentTarget.value)}
      />
    </label>
    <label>
      <span>Zoom +Δ</span>
      <input
        type="number"
        min="0"
        value={zoomDelta}
        oninput={(event) =>
          updateNumber("zoomDelta", event.currentTarget.value)}
      />
    </label>
    <label>
      <span>Inner grid</span>
      <input
        type="number"
        min="0"
        value={innerGrid}
        oninput={(event) => updateNumber("innerGrid", event.currentTarget.value)}
      />
    </label>
    <label>
      <span>Orientation</span>
      <select
        value={orientation}
        onchange={(event) => updateOrientation(event.currentTarget.value)}
      >
        <option value="portrait">Portrait</option>
        <option value="landscape">Landscape</option>
      </select>
    </label>
    <label>
      <span>Provider</span>
      <select
        value={provider}
        onchange={(event) => updateProvider(event.currentTarget.value)}
      >
        {#each TILE_PROVIDER_OPTIONS as option}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>DPI</span>
      <input
        type="number"
        min="72"
        step="1"
        value={dpi}
        oninput={(event) => updateNumber("dpi", event.currentTarget.value)}
      />
    </label>
    <label>
      <span>File Prefix</span>
      <input
        type="text"
        value={filePrefix}
        oninput={(event) => updatePrefix(event.currentTarget.value)}
      />
    </label>
  </div>

  <form class="search" onsubmit={searchLocation}>
    <label>
      <span>Jump to location</span>
      <div class="search-row">
        <input
          type="text"
          placeholder="City, address or lat,lng"
          value={searchQuery}
          oninput={(event) => (searchQuery = event.currentTarget.value)}
        />
        <button type="submit" disabled={searching}
          >{searching ? "Searching…" : "Go"}</button
        >
      </div>
    </label>
    {#if searchError}
      <p class="search-error">{searchError}</p>
    {:else if searchMessage}
      <p class="search-message">{searchMessage}</p>
    {:else if searchResults.length}
      <ul class="search-results">
        {#each searchResults as result}
          <li>
            <button type="button" onclick={() => selectResult(result)}
              >{result.display_name}</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </form>

  <div class="meta">
    <div>
      <span>Zoom</span>
      <strong>z{zoom}</strong>
    </div>
    {#if center}
      <div>
        <span>Center Lat</span>
        <strong>{center.lat.toFixed(4)}</strong>
      </div>
      <div>
        <span>Center Lng</span>
        <strong>{center.lng.toFixed(4)}</strong>
      </div>
    {/if}
    {#if viewbox}
      <div>
        <span>North</span>
        <strong>{viewbox.n.toFixed(4)}</strong>
      </div>
      <div>
        <span>South</span>
        <strong>{viewbox.s.toFixed(4)}</strong>
      </div>
      <div>
        <span>West</span>
        <strong>{viewbox.w.toFixed(4)}</strong>
      </div>
      <div>
        <span>East</span>
        <strong>{viewbox.e.toFixed(4)}</strong>
      </div>
    {:else}
      <div class="placeholder">Map loading… pan or zoom on canvas</div>
    {/if}
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px dashed gainsboro;
    background-color: white;
  }

  h1 {
    font-size: 1.6rem;
    margin: 0;
    padding-bottom: 1rem;
  }

  p {
    margin: 0.1rem 0 0;
    padding-bottom: 1rem;
  }

  .export {
    background: rgb(198, 255, 255);

    border: none;
    border-radius: 0.2rem;
    padding: 0.2rem 0.2rem;
    cursor: pointer;
  }

  .export:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .export:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  input,
  select {
    background-color: azure;
    border: 1px dashed gainsboro;
    padding: 0.45rem 0.6rem;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  footer,
  .meta {
    border: 1px dashed gainsboro;
    padding: 0.5rem;
    font-size: 0.875rem;
  }
  .search {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-row {
    display: flex;
    gap: 0.5rem;
  }

  .search-row button {
    background: rgb(148, 255, 255);

    border: none;
    border-radius: 0.5rem;
    padding: 0.1rem 0.5rem;

    cursor: pointer;
    white-space: nowrap;
  }

  .search-row button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .search-results {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .search-results button,
  .search-message {
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px dashed gainsboro;
    background: rgb(246, 252, 252);
    cursor: pointer;
  }

  .search-error {
    color: #fca5a5;
    margin: 0;
  }
</style>
