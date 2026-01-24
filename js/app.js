import { initMap, getMap } from './map.js';
import { getMarkers, refreshMarkers } from './markers.js';

let map;

document.addEventListener('DOMContentLoaded', async () => {
  map = await initMap();

  // Buscador geográfico con Nominatim
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearSearchBtn');

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (!query) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const place = data[0];
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);

          map.setView([lat, lon], 14);
          
        } else {
          alert("Lugar no encontrado");
        }
      })
      .catch(err => console.error(err));
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
  });

  // Opcional: búsqueda en tiempo real al escribir
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (!query) return;
    // No filtramos marcadores de Supabase aquí, solo buscador geográfico
  });
});
