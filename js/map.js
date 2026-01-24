import { refreshMarkers, setMap } from './markers.js';

let map;
export async function initMap() {
  map = L.map('map', { zoomSnap: 0.25, zoomControl:false }).setView([40.4168, -3.7038], 5);

  // Capa normal
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  });

  // Capa satélite
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles © Esri'
  });

  // Capa de etiquetas (nombres de calles y ciudades)
  const labels = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Labels © Esri',
    pane: 'labelsPane'
  });

  // Crear un pane para las etiquetas, para que siempre estén encima
  map.createPane('labelsPane');
  map.getPane('labelsPane').style.zIndex = 650;        // encima de las capas base
  map.getPane('labelsPane').style.pointerEvents = 'none'; // clic pasa por debajo

  // Añadimos capas al mapa
  satellite.addTo(map);   // satélite como capa base
  labels.addTo(map);      // etiquetas encima

  // Control de capas (opcional)
  const baseMaps = {
    "Calle": street,
    "Satélite": satellite
  };

  const overlayMaps = {
    "Etiquetas": labels
  };

  // L.control.layers(baseMaps, overlayMaps).addTo(map);

//   L.control.layers(baseMaps, overlayMaps, {
//   position: 'bottomright'
// }).addTo(map);

  setMap(map);

  // Llamamos a refreshMarkers SIN filtrar
  await refreshMarkers();

  return map;
}





// Función para obtener la instancia del mapa
export function getMap() {
  return map;
}
