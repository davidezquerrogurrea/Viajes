import { supabaseClient } from './supabase.js';

let mapRef;
let tempLatLng;
let editMarkerId = null;
let allMarkers = []; // todos los marcadores para referencia

// Inicializar interacción con el mapa
export function setMap(map) {
  mapRef = map;

  map.on('click', e => {
    tempLatLng = e.latlng;
    editMarkerId = null; // nuevo marcador
    openModal();
  });
}

// Abrir modal (para editar o nuevo)
function openModal(title = '', notes = '') {
  document.getElementById('markerTitle').value = title;
  document.getElementById('markerNotes').value = notes;
  document.getElementById('markerModal').style.display = 'flex';
}

// Cerrar modal
export function closeModal() {
  document.getElementById('markerModal').style.display = 'none';
  document.getElementById('markerTitle').value = '';
  document.getElementById('markerNotes').value = '';
  tempLatLng = null;
  editMarkerId = null;
}

// Cancelar botón
document.getElementById('cancelMarkerBtn').addEventListener('click', closeModal);

// Guardar botón
document.getElementById('saveMarkerBtn').addEventListener('click', async () => {
  const title = document.getElementById('markerTitle').value.trim();
  const notes = document.getElementById('markerNotes').value.trim();

  if (!title) return alert("El título es obligatorio");

  if (editMarkerId) {
    // Actualizar marcador existente
    const { error } = await supabaseClient
      .from('markers')
      .update({ title, notes })
      .eq('id', editMarkerId);

    if (error) return console.error(error);

  } else {
    // Crear nuevo marcador
    if (!tempLatLng) return;

    const { error } = await supabaseClient
      .from('markers')
      .insert([{
        lat: tempLatLng.lat,
        lng: tempLatLng.lng,
        title,
        notes
      }]);

    if (error) return console.error(error);
  }

  closeModal();
  await refreshMarkers();
});

export function createPopupContent(marker) {
  const container = document.createElement('div');
  container.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-width: 250px;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    color: white;
  `;

  const title = document.createElement('h3');
  title.textContent = marker.title;
  title.style.cssText = `
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
  `;

  const notes = document.createElement('p');
  notes.textContent = marker.notes;
  notes.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255,255,255,0.9);
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    margin-top: 16px;
  `;

  const editBtn = document.createElement('button');
  editBtn.textContent = '✏️ Editar';
  editBtn.style.cssText = `
    flex: 1;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
  editBtn.onmouseover = () => {
    editBtn.style.transform = 'translateY(-2px)';
    editBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  editBtn.onmouseout = () => {
    editBtn.style.transform = 'translateY(0)';
    editBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  };
  editBtn.onclick = () => {
    editMarkerId = marker.id;
    tempLatLng = { lat: marker.lat, lng: marker.lng };
    openModal(marker.title, marker.notes);
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️ Borrar';
  deleteBtn.style.cssText = `
    flex: 1;
    background: #ff4757;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
  deleteBtn.onmouseover = () => {
    deleteBtn.style.background = '#ee5a6f';
    deleteBtn.style.transform = 'translateY(-2px)';
    deleteBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  deleteBtn.onmouseout = () => {
    deleteBtn.style.background = '#ff4757';
    deleteBtn.style.transform = 'translateY(0)';
    deleteBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  };
  deleteBtn.onclick = async () => {
    const { error } = await supabaseClient
      .from('markers')
      .delete()
      .eq('id', marker.id);

    if (error) return console.error(error);
    await refreshMarkers();
  };

  container.appendChild(title);
  container.appendChild(notes);
  buttonContainer.appendChild(editBtn);
  buttonContainer.appendChild(deleteBtn);
  container.appendChild(buttonContainer);

  return container;
}

// Leer todos los marcadores desde Supabase
export async function getMarkers() {
  const { data, error } = await supabaseClient.from('markers').select('*');
  if (error) return console.error(error);
  allMarkers = data;
  return data;
}

// Refrescar todos los marcadores en el mapa
export async function refreshMarkers(filterText = '') {
  if (!mapRef) return;

  // eliminar todos los marcadores
  mapRef.eachLayer(layer => {
    if (layer instanceof L.Marker) mapRef.removeLayer(layer);
  });

  // obtener marcadores desde Supabase
  const { data, error } = await supabaseClient.from('markers').select('*');
  if (error) return console.error(error);

  allMarkers = data; // actualizar referencia

  // aplicar filtro
  let markersToShow = allMarkers;
  if (filterText) {
    markersToShow = allMarkers.filter(m =>
      (m.title && m.title.toLowerCase().includes(filterText.toLowerCase())) ||
      (m.notes && m.notes.toLowerCase().includes(filterText.toLowerCase()))
    );
  }

  markersToShow.forEach(m => {
    L.marker([m.lat, m.lng])
      .addTo(mapRef)
      .bindPopup(createPopupContent(m));
  });
}

