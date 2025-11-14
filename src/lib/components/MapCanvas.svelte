<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { MapSketch } from '$lib/map/map-sketch';

	const {
		rows = 2,
		cols = 3,
		zoomDelta = 0,
		orientation = 'portrait',
		provider = 'osm',
		dpi = 300,
		filePrefix = 'map'
	} = $props();

	const dispatch = createEventDispatcher();

	let container = null;
	let sketch = null;
	let resizeObserver = null;

	onMount(() => {
		if (!container) return;
		const instance = new MapSketch(container, {
			rows,
			cols,
			zoomDelta,
			orientation,
			provider,
			dpi,
			filePrefix
		});

		const teardown = [];

		instance.init().then(() => dispatch('ready', instance));
		teardown.push(instance.subscribe((state) => dispatch('state', state)));
		teardown.push(instance.onExportShortcut(() => dispatch('exportshortcut')));

		resizeObserver = new ResizeObserver((entries) => {
			if (!entries.length) return;
			const { width, height } = entries[0].contentRect;
			instance.resize(width, height);
		});
		resizeObserver.observe(container);

		sketch = instance;

		return () => {
			teardown.forEach((fn) => fn());
			resizeObserver?.disconnect();
			instance.destroy();
			sketch = null;
		};
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
	});

	$effect(() => {
		if (!sketch) return;
		sketch.setGrid(rows, cols);
	});

	$effect(() => {
		if (!sketch) return;
		sketch.setZoomDelta(zoomDelta);
	});

	$effect(() => {
		if (!sketch) return;
		sketch.setOrientation(orientation);
	});

	$effect(() => {
		if (!sketch) return;
		sketch.setProvider(provider);
	});

	$effect(() => {
		if (!sketch) return;
		sketch.setDpi(dpi);
	});

	$effect(() => {
		if (!sketch) return;
		sketch.setFilePrefix(filePrefix);
	});

	function zoomIn() {
		sketch?.zoomBy(1);
	}

	function zoomOut() {
		sketch?.zoomBy(-1);
	}

	export async function exportGrid() {
		if (!sketch) return;
		await sketch.exportGrid();
	}

	export function focusOn(lat, lng, zoom) {
		sketch?.setCenter(lat, lng, zoom);
	}
</script>

<div class="map-canvas" bind:this={container}>
	<div class="zoom-controls" aria-label="Map zoom controls">
		<button type="button" class="zoom-btn" onclick={zoomIn} aria-label="Zoom in">+</button>
		<button type="button" class="zoom-btn" onclick={zoomOut} aria-label="Zoom out">-</button>
	</div>
</div>

<style>
	.map-canvas {
		position: relative;
		width: 100%;
		/* height: clamp(360px, 90vh, 1200px); */
		overflow: hidden;
		margin: 0 auto;
	}

	.map-canvas :global(canvas) {
		position: absolute;
		inset: 0;
		touch-action: none;
	}

	.zoom-controls {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 2;
	}

	.zoom-btn {
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		border: 1px dashed gainsboro;
		background: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		cursor: pointer;
		transition: transform 120ms ease;
	}

	.zoom-btn:active {
		transform: scale(0.97);
	}
</style>
