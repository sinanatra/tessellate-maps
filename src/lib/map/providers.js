// @ts-nocheck
export const TILE_PROVIDERS = {
	osm: {
		key: 'osm',
		label: 'OpenStreetMap',
		template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		subdomains: ['a', 'b', 'c'],
		attribution: '© OpenStreetMap contributors'
	},
	satellite: {
		key: 'satellite',
		label: 'ArcGIS World Imagery',
		template:
			'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Source: Esri, Maxar, Earthstar Geographics',
		maxZoom: 19
	}
};

export function getProviderConfig(key) {
	return TILE_PROVIDERS[key];
}

export const TILE_PROVIDER_OPTIONS = Object.values(TILE_PROVIDERS);
