import { supabaseClient } from './supabase.js';

const watchlistList = document.getElementById('watchlistList');
const watchlistModal = document.getElementById('watchlistModal');
const openWatchlistModalBtn = document.getElementById('openWatchlistModalBtn');
const saveWatchlistBtn = document.getElementById('saveWatchlistBtn');
const cancelWatchlistBtn = document.getElementById('cancelWatchlistBtn');
const watchlistTitleInput = document.getElementById('watchlistTitle');
const watchlistTypeInput = document.getElementById('watchlistType');
const watchlistStatusInput = document.getElementById('watchlistStatus');
const watchlistPlatformInput = document.getElementById('watchlistPlatform');
const watchlistNotesInput = document.getElementById('watchlistNotes');
const watchlistModalTitle = watchlistModal.querySelector('.modal-content h3');

const watchlistSearch = document.getElementById('watchlistSearch');
const watchlistTypeFilter = document.getElementById('watchlistTypeFilter');
const watchlistStatusFilter = document.getElementById('watchlistStatusFilter');

const CREATE_MODAL_TITLE = 'Agregar peli/serie';
const EDIT_MODAL_TITLE = 'Editar peli/serie';
const CREATE_SAVE_TEXT = 'Guardar';
const EDIT_SAVE_TEXT = 'Guardar cambios';

let editingWatchlistId = null;
let watchlistItems = [];

function openModal() {
  watchlistModal.style.display = 'flex';
  watchlistTitleInput.focus();
}

function closeModal() {
  watchlistModal.style.display = 'none';
  editingWatchlistId = null;
  watchlistModalTitle.textContent = CREATE_MODAL_TITLE;
  saveWatchlistBtn.textContent = CREATE_SAVE_TEXT;
  watchlistTitleInput.value = '';
  watchlistTypeInput.value = 'Pelicula';
  watchlistStatusInput.value = 'Pendiente';
  watchlistPlatformInput.value = '';
  watchlistNotesInput.value = '';
}

function startCreate() {
  editingWatchlistId = null;
  watchlistModalTitle.textContent = CREATE_MODAL_TITLE;
  saveWatchlistBtn.textContent = CREATE_SAVE_TEXT;
  watchlistTitleInput.value = '';
  watchlistTypeInput.value = 'Pelicula';
  watchlistStatusInput.value = 'Pendiente';
  watchlistPlatformInput.value = '';
  watchlistNotesInput.value = '';
  openModal();
}

function startEdit(item) {
  editingWatchlistId = item.id;
  watchlistModalTitle.textContent = EDIT_MODAL_TITLE;
  saveWatchlistBtn.textContent = EDIT_SAVE_TEXT;
  watchlistTitleInput.value = item.title || '';
  watchlistTypeInput.value = item.type || 'Pelicula';
  watchlistStatusInput.value = item.status || 'Pendiente';
  watchlistPlatformInput.value = item.platform || '';
  watchlistNotesInput.value = item.notes || '';
  openModal();
}

function createTag(text, className) {
  const tag = document.createElement('span');
  tag.className = `tag ${className || ''}`.trim();
  tag.textContent = text;
  return tag;
}

function getStatusClass(status) {
  const value = (status || '').toLowerCase();
  if (value === 'pendiente') return 'status-pendiente';
  if (value === 'viendo') return 'status-viendo';
  if (value === 'vista') return 'status-vista';
  return 'status-default';
}

function getNextStatus(status) {
  const value = (status || 'Pendiente').toLowerCase();
  if (value === 'pendiente') return { value: 'Viendo', label: 'Poner viendo' };
  if (value === 'viendo') return { value: 'Vista', label: 'Marcar vista' };
  return { value: 'Pendiente', label: 'Volver pendiente' };
}

function renderWatchlist(items) {
  watchlistList.innerHTML = '';

  if (!items.length) return;

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'list-card watch-card';

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title || 'Sin titulo';

    const tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    tagRow.appendChild(createTag(item.type || 'Pelicula', 'tag-type'));
    tagRow.appendChild(createTag(item.status || 'Pendiente', getStatusClass(item.status)));
    if (item.platform) {
      tagRow.appendChild(createTag(item.platform, 'platform'));
    }

    header.appendChild(title);
    header.appendChild(tagRow);

    const notes = document.createElement('p');
    notes.className = 'card-notes';
    notes.textContent = item.notes || 'Sin notas';

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const nextStatus = getNextStatus(item.status);
    const statusBtn = document.createElement('button');
    statusBtn.className = 'card-action-btn card-action-primary';
    statusBtn.textContent = nextStatus.label;
    statusBtn.addEventListener('click', () => updateStatus(item, statusBtn));

    const editBtn = document.createElement('button');
    editBtn.className = 'card-action-btn card-action-edit';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => startEdit(item));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn card-action-danger';
    deleteBtn.textContent = 'Borrar';
    deleteBtn.addEventListener('click', () => deleteItem(item.id, deleteBtn));

    actions.appendChild(statusBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(notes);
    card.appendChild(actions);
    watchlistList.appendChild(card);
  });
}

function getFilteredItems() {
  const text = watchlistSearch.value.trim().toLowerCase();
  const typeFilter = watchlistTypeFilter.value;
  const statusFilter = watchlistStatusFilter.value;

  return watchlistItems.filter(item => {
    const matchesText = !text || [item.title, item.platform, item.notes]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(text));

    const matchesType = typeFilter === 'all' || (item.type || '').toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || (item.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesText && matchesType && matchesStatus;
  });
}

function applyFilters() {
  renderWatchlist(getFilteredItems());
}

async function loadWatchlist() {
  const { data, error } = await supabaseClient
    .from('watchlist')
    .select('id, title, type, status, platform, notes')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error cargando watchlist:', error);
    watchlistList.innerHTML = '';
    return;
  }

  watchlistItems = data || [];
  applyFilters();
}

async function saveWatchlistItem() {
  const title = watchlistTitleInput.value.trim();
  const payload = {
    title,
    type: watchlistTypeInput.value,
    status: watchlistStatusInput.value,
    platform: watchlistPlatformInput.value.trim() || null,
    notes: watchlistNotesInput.value.trim() || null
  };

  if (!title) {
    alert('El titulo es obligatorio');
    watchlistTitleInput.focus();
    return;
  }

  saveWatchlistBtn.disabled = true;
  saveWatchlistBtn.textContent = editingWatchlistId ? 'Guardando cambios...' : 'Guardando...';

  let error = null;

  if (editingWatchlistId) {
    ({ error } = await supabaseClient
      .from('watchlist')
      .update(payload)
      .eq('id', editingWatchlistId));
  } else {
    ({ error } = await supabaseClient
      .from('watchlist')
      .insert([payload]));
  }

  saveWatchlistBtn.disabled = false;
  saveWatchlistBtn.textContent = editingWatchlistId ? EDIT_SAVE_TEXT : CREATE_SAVE_TEXT;

  if (error) {
    console.error('Error guardando item:', error);
    alert('No se pudo guardar el item en Supabase.');
    return;
  }

  closeModal();
  await loadWatchlist();
}

async function updateStatus(item, triggerBtn) {
  const nextStatus = getNextStatus(item.status);

  triggerBtn.disabled = true;
  triggerBtn.textContent = 'Guardando...';

  const { error } = await supabaseClient
    .from('watchlist')
    .update({ status: nextStatus.value })
    .eq('id', item.id);

  triggerBtn.disabled = false;
  triggerBtn.textContent = nextStatus.label;

  if (error) {
    console.error('Error actualizando estado:', error);
    alert('No se pudo actualizar el estado.');
    return;
  }

  await loadWatchlist();
}

async function deleteItem(itemId, triggerBtn) {
  if (!confirm('Seguro que quieres borrar este item?')) return;

  triggerBtn.disabled = true;
  triggerBtn.textContent = 'Borrando...';

  const { error } = await supabaseClient
    .from('watchlist')
    .delete()
    .eq('id', itemId);

  triggerBtn.disabled = false;
  triggerBtn.textContent = 'Borrar';

  if (error) {
    console.error('Error borrando item:', error);
    alert('No se pudo borrar el item.');
    return;
  }

  await loadWatchlist();
}

openWatchlistModalBtn.addEventListener('click', startCreate);
cancelWatchlistBtn.addEventListener('click', closeModal);
saveWatchlistBtn.addEventListener('click', saveWatchlistItem);

watchlistModal.addEventListener('click', event => {
  if (event.target === watchlistModal) closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && watchlistModal.style.display === 'flex') {
    closeModal();
  }
});

watchlistSearch.addEventListener('input', applyFilters);
watchlistTypeFilter.addEventListener('change', applyFilters);
watchlistStatusFilter.addEventListener('change', applyFilters);

loadWatchlist();
