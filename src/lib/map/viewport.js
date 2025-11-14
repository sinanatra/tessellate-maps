// @ts-nocheck

export function createViewport(tileSystem, center, zoom, frame) {
	const centerPixel = tileSystem.latLngToPixel(center.lng, center.lat, zoom);
	const left = centerPixel.x - frame.width / 2;
	const top = centerPixel.y - frame.height / 2;
	const right = left + frame.width;
	const bottom = top + frame.height;
	const topLeft = tileSystem.pixelToLatLng(left, top, zoom);
	const bottomRight = tileSystem.pixelToLatLng(right, bottom, zoom);
	return {
		zoom,
		pixelBounds: { left, top, width: frame.width, height: frame.height },
		latLngBounds: { n: topLeft.lat, s: bottomRight.lat, w: topLeft.lng, e: bottomRight.lng },
		centerPixel
	};
}

export function splitViewport(tileSystem, viewport, rows, cols) {
	const { zoom, pixelBounds } = viewport;
	const cellWidth = pixelBounds.width / cols;
	const cellHeight = pixelBounds.height / rows;
	const bboxes = [];
	for (let row = 0; row < rows; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			const left = pixelBounds.left + col * cellWidth;
			const top = pixelBounds.top + row * cellHeight;
			const right = left + cellWidth;
			const bottom = top + cellHeight;
			const nw = tileSystem.pixelToLatLng(left, top, zoom);
			const se = tileSystem.pixelToLatLng(right, bottom, zoom);
			bboxes.push({
				n: nw.lat,
				s: se.lat,
				w: nw.lng,
				e: se.lng,
				row,
				col
			});
		}
	}
	return bboxes;
}
