import { getProviderConfig } from './providers';

export class TileSystem {
	constructor(p, providerKey) {
		this.p = p;
		this.provider = getProviderConfig(providerKey);
		this.cache = new Map();
		this.template = this.provider.template;
		this.subdomains = this.provider.subdomains ?? [];
		this.tileSize = this.provider.tileSize ?? 256;
		this.token = '';
	}

	getTileSize() {
		return this.tileSize;
	}

	setProvider(key) {
		this.provider = getProviderConfig(key);
		this.template = this.provider.template;
		this.subdomains = this.provider.subdomains ?? [];
		this.tileSize = this.provider.tileSize ?? 256;
		this.cache.clear();
	}

	setApiToken(token) {
		this.token = token;
		this.cache.clear();
	}

	latLngToPixel(lng, lat, zoom) {
		const scale = this.tileSize * Math.pow(2, zoom);
		const x = ((lng + 180) / 360) * scale;
		const k = Math.sin((lat * Math.PI) / 180);
		const y = (0.5 - Math.log((1 + k) / (1 - k)) / (4 * Math.PI)) * scale;
		return { x, y };
	}

	pixelToLatLng(x, y, zoom) {
		const scale = this.tileSize * Math.pow(2, zoom);
		const wx = x / scale;
		const wy = y / scale;
		const lng = wx * 360 - 180;
		const n = Math.PI - 2 * Math.PI * wy;
		const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
		return { lng, lat };
	}

	getTile(zoom, x, y) {
		const planet = Math.pow(2, zoom);
		const wrapX = ((x % planet) + planet) % planet;
		const clampY = Math.max(0, Math.min(planet - 1, y));
		const key = `${this.provider.key}/${zoom}/${wrapX}/${clampY}`;

		const cached = this.cache.get(key);
		if (cached) {
			return cached;
		}

		const record = {
			image: null,
			ready: false,
			failed: false,
			waiters: []
		};
		this.cache.set(key, record);

		const url = this.buildUrl(zoom, wrapX, clampY);
		this.p.loadImage(
			url,
			(img) => {
				record.image = img;
				record.ready = true;
				record.failed = false;
				this.resolve(record);
			},
			() => {
				record.ready = true;
				record.failed = true;
				this.resolve(record);
			}
		);

		return record;
	}

	resolve(record) {
		if (!record.waiters.length) return;
		record.waiters.forEach((fn) => fn());
		record.waiters = [];
	}

	buildUrl(zoom, x, y) {
		let url = this.template.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y));
		if (url.includes('{s}') && this.subdomains.length) {
			const idx = Math.abs((x + y) % this.subdomains.length);
			url = url.replace('{s}', this.subdomains[idx]);
		}
		if (url.includes('{token}')) {
			url = url.replace('{token}', encodeURIComponent(this.token));
		}
		return url;
	}
}

export function waitForTile(record) {
	if (record.ready) return Promise.resolve();
	return new Promise((resolve) => {
		record.waiters.push(resolve);
	});
}
