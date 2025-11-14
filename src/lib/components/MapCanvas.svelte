<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { MapSketch } from '$lib/map/map-sketch';

	const {
		rows = 2,
		cols = 3,
		zoomDelta = 2,
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

	export async function exportGrid() {
		if (!sketch) return;
		await sketch.exportGrid();
	}

	export function focusOn(lat, lng, zoom) {
		sketch?.setCenter(lat, lng, zoom);
	}
</script>

<div class="map-canvas" bind:this={container}></div>

<style>
	.map-canvas {
		position: relative;
		width: 100%;
		/* height: clamp(360px, 90vh, 1200px); */
		border-radius: 1rem;
		overflow: hidden;
		margin: 0 auto;
	}

	.map-canvas :global(canvas) {
		position: absolute;
		inset: 0;
	}
</style>
