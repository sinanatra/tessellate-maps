export const TILE_PROVIDERS = {
  osm: {
    key: "osm",
    label: "OpenStreetMap",
    template: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: "© OpenStreetMap contributors",
  },
  satellite: {
    key: "satellite",
    label: "ArcGIS World Imagery",
    template:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  cartoLight: {
    key: "cartoLight",
    label: "CARTO Positron",
    template:
      "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
    attribution: "© OpenStreetMap contributors, © CARTO",
  },
  osmHot: {
    key: "osmHot",
    label: "OSM Humanitarian",
    template: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: "© OpenStreetMap contributors, Humanitarian style",
  },
  esriTopo: {
    key: "esriTopo",
    label: "Esri World Topographic",
    template:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Source: Esri, HERE, Garmin, FAO, NOAA, USGS | Tiles © Esri",
  },
  esriGray: {
    key: "esriGray",
    label: "Esri Light Gray",
    template:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Source: Esri | Esri Light Gray Canvas",
  },
  esriStreets: {
    key: "esriStreets",
    label: "Esri World Street Map",
    template:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Source: Esri, HERE, Garmin, FAO, NOAA, USGS | Tiles © Esri",
  },
};

export function getProviderConfig(key) {
  return TILE_PROVIDERS[key];
}

export const TILE_PROVIDER_OPTIONS = Object.values(TILE_PROVIDERS).filter(
  (provider) => !provider.requiresToken || Boolean(provider.token)
);
