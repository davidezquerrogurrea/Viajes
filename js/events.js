import { supabaseClient } from './supabase.js';

const eventsList = document.getElementById('eventsList');
const eventModal = document.getElementById('eventModal');
const openEventModalBtn = document.getElementById('openEventModalBtn');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const eventTitleInput = document.getElementById('eventTitle');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventModalTitle = eventModal.querySelector('.modal-content h3');
const EVENT_PHOTOS_BUCKET = 'market-photos';
const EVENT_PHOTOS_PREFIX = 'events';
const CREATE_MODAL_TITLE = 'Agregar evento';
const EDIT_MODAL_TITLE = 'Editar evento';
const CREATE_SAVE_TEXT = 'Guardar';
const EDIT_SAVE_TEXT = 'Guardar cambios';
let editingEventId = null;

function getEventPhotoFolder(eventId) {
  return `${EVENT_PHOTOS_PREFIX}/${eventId}`;
}

function resizeImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    img.onload = () => {
      let { width, height } = img;

      if (width > height && width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      } else if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function openModal() {
  eventModal.style.display = 'flex';
  eventTitleInput.focus();
}

function closeModal() {
  eventModal.style.display = 'none';
  editingEventId = null;
  eventModalTitle.textContent = CREATE_MODAL_TITLE;
  saveEventBtn.textContent = CREATE_SAVE_TEXT;
  eventTitleInput.value = '';
  eventDescriptionInput.value = '';
}

function startCreateEvent() {
  editingEventId = null;
  eventModalTitle.textContent = CREATE_MODAL_TITLE;
  saveEventBtn.textContent = CREATE_SAVE_TEXT;
  eventTitleInput.value = '';
  eventDescriptionInput.value = '';
  openModal();
}

function startEditEvent(row) {
  editingEventId = row.id;
  eventModalTitle.textContent = EDIT_MODAL_TITLE;
  saveEventBtn.textContent = EDIT_SAVE_TEXT;
  eventTitleInput.value = row.title || '';
  eventDescriptionInput.value = row.description || '';
  openModal();
}

async function renderEvents(rows) {
  eventsList.innerHTML = '';

  if (!rows.length) return;

  for (const row of rows) {
    const eventCard = document.createElement('article');
    eventCard.className = 'event-item';

    const title = document.createElement('h3');
    title.textContent = row.title || 'Sin titulo';

    const description = document.createElement('p');
    description.textContent = row.description || 'Sin descripcion';

    const photosContainer = document.createElement('div');
    photosContainer.className = 'photos';
    photosContainer.id = `eventPhotos-${row.id}`;
    photosContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:220px;color:#999;">
        📷 Cargando fotos...
      </div>
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = `eventFileInput-${row.id}`;
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.hidden = true;

    const addPhotosBtn = document.createElement('button');
    addPhotosBtn.className = 'add-event-photos-btn';
    addPhotosBtn.id = `addEventPhotosBtn-${row.id}`;
    addPhotosBtn.textContent = 'Anadir fotos';

    addPhotosBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async event => {
      const files = event.target.files;
      if (!files || !files.length) return;

      addPhotosBtn.disabled = true;
      addPhotosBtn.textContent = 'Subiendo...';

      for (const file of files) {
        const resizedBlob = await resizeImage(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const filePath = `${getEventPhotoFolder(row.id)}/${fileName}`;

        const { error } = await supabaseClient
          .storage
          .from(EVENT_PHOTOS_BUCKET)
          .upload(filePath, resizedBlob, { contentType: 'image/jpeg' });

        if (error) {
          console.error('Error subiendo foto del evento:', error);
        }
      }

      fileInput.value = '';
      addPhotosBtn.disabled = false;
      addPhotosBtn.textContent = 'Anadir fotos';
      await loadEventPhotos(row.id);
    });

    const deleteEventBtn = document.createElement('button');
    deleteEventBtn.className = 'delete-event-btn';
    deleteEventBtn.textContent = 'Borrar evento';
    deleteEventBtn.addEventListener('click', () => {
      deleteEvent(row.id, deleteEventBtn);
    });

    const editEventBtn = document.createElement('button');
    editEventBtn.className = 'edit-event-btn';
    editEventBtn.textContent = '\u270F\uFE0F Editar';
    editEventBtn.addEventListener('click', () => {
      startEditEvent(row);
    });

    const actions = document.createElement('div');
    actions.className = 'event-item-actions';
    actions.appendChild(addPhotosBtn);
    actions.appendChild(editEventBtn);
    actions.appendChild(deleteEventBtn);

    eventCard.appendChild(title);
    eventCard.appendChild(description);
    eventCard.appendChild(photosContainer);
    eventCard.appendChild(fileInput);
    eventCard.appendChild(actions);
    eventsList.appendChild(eventCard);

    await loadEventPhotos(row.id);
  }
}

async function loadEventPhotos(eventId) {
  const container = document.getElementById(`eventPhotos-${eventId}`);
  if (!container) return;

  container.innerHTML = '';

  const folder = getEventPhotoFolder(eventId);
  const { data: files, error } = await supabaseClient
    .storage
    .from(EVENT_PHOTOS_BUCKET)
    .list(folder);

  if (error || !files?.length) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:220px;color:#999;">
        📷 Sin fotos
      </div>
    `;
    return;
  }

  const photos = files.map(file => {
    const { data } = supabaseClient
      .storage
      .from(EVENT_PHOTOS_BUCKET)
      .getPublicUrl(`${folder}/${file.name}`);

    return {
      name: file.name,
      url: data.publicUrl
    };
  }).filter(photo => Boolean(photo.url));

  if (!photos.length) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:220px;color:#999;">
        📷 Sin fotos
      </div>
    `;
    return;
  }

  const carousel = document.createElement('div');
  carousel.className = 'carousel';

  const mainImg = document.createElement('img');
  mainImg.className = 'carousel-main';
  mainImg.loading = 'lazy';
  mainImg.src = photos[0].url;
  mainImg.alt = `Foto del evento ${eventId}`;
  mainImg.style.cursor = 'pointer';
  mainImg.addEventListener('click', () => {
    const index = photos.findIndex(photo => photo.url === mainImg.src);
    openLightbox(photos, index >= 0 ? index : 0);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 5;
    padding: 8px 12px;
    background: #ff4757;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  deleteBtn.title = 'Borrar esta foto';

  deleteBtn.addEventListener('click', async e => {
    e.stopPropagation();

    if (!confirm('Seguro que quieres borrar esta foto?')) return;

    const currentPhoto = photos.find(photo => photo.url === mainImg.src);
    if (!currentPhoto) return;

    deleteBtn.disabled = true;

    const { error } = await supabaseClient
      .storage
      .from(EVENT_PHOTOS_BUCKET)
      .remove([`${folder}/${currentPhoto.name}`]);

    deleteBtn.disabled = false;

    if (error) {
      alert('Error al borrar la foto');
      console.error(error);
      return;
    }

    await loadEventPhotos(eventId);
  });

  const mainWrapper = document.createElement('div');
  mainWrapper.style.position = 'relative';
  mainWrapper.appendChild(mainImg);
  mainWrapper.appendChild(deleteBtn);

  const thumbs = document.createElement('div');
  thumbs.className = 'carousel-thumbs';

  photos.forEach((photo, index) => {
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.alt = `Miniatura ${index + 1} del evento ${eventId}`;
    thumb.style.width = '80px';
    thumb.style.height = '80px';
    thumb.style.objectFit = 'cover';
    thumb.style.margin = '6px';
    thumb.style.borderRadius = '8px';
    thumb.style.cursor = 'pointer';
    if (index === 0) thumb.classList.add('active');

    thumb.addEventListener('click', () => {
      mainImg.src = photo.url;
      thumbs.querySelectorAll('img').forEach(img => img.classList.remove('active'));
      thumb.classList.add('active');
    });

    thumbs.appendChild(thumb);
  });

  carousel.appendChild(mainWrapper);
  carousel.appendChild(thumbs);
  container.appendChild(carousel);
}

function openLightbox(photos, startIndex = 0) {
  let currentIndex = startIndex;

  const lightbox = document.createElement('div');
  lightbox.style.cssText = `
    position: fixed;
    top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.95);
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    z-index:9999;
    overflow:hidden;
  `;

  const img = document.createElement('img');
  img.style.cssText = `
    max-width:90%;
    max-height:75%;
    border-radius:12px;
    margin-bottom:20px;
    transition:opacity .2s ease;
  `;

  function updateThumbs() {
    thumbImgs.forEach((thumb, index) => {
      thumb.style.opacity = index === currentIndex ? '1' : '0.5';
      thumb.style.border = index === currentIndex
        ? '2px solid white'
        : '2px solid transparent';
    });
  }

  function updateImage() {
    img.style.opacity = 0;
    setTimeout(() => {
      img.src = photos[currentIndex].url;
      img.style.opacity = 1;
      updateThumbs();
    }, 100);
  }

  function next() {
    currentIndex = (currentIndex + 1) % photos.length;
    updateImage();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    updateImage();
  }

  const thumbs = document.createElement('div');
  thumbs.style.cssText = `
    display:flex;
    overflow-x:auto;
    max-width:95%;
    padding:10px;
  `;

  const thumbImgs = [];

  photos.forEach((photo, index) => {
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.style.cssText = `
      width:70px;
      height:70px;
      object-fit:cover;
      margin:5px;
      border-radius:8px;
      cursor:pointer;
      opacity:0.6;
      border:2px solid transparent;
      flex-shrink:0;
    `;

    thumb.addEventListener('click', () => {
      currentIndex = index;
      updateImage();
    });

    thumbs.appendChild(thumb);
    thumbImgs.push(thumb);
  });

  let startX = 0;
  let endX = 0;

  lightbox.addEventListener('touchstart', e => {
    startX = e.changedTouches[0].clientX;
  });

  lightbox.addEventListener('touchend', e => {
    endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if (Math.abs(diff) < 50) return;
    if (diff > 0) next();
    else prev();
  });

  function keyHandler(e) {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape') close();
  }

  function close() {
    document.removeEventListener('keydown', keyHandler);
    lightbox.remove();
  }

  document.addEventListener('keydown', keyHandler);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });

  updateImage();

  lightbox.appendChild(img);
  lightbox.appendChild(thumbs);
  document.body.appendChild(lightbox);
}

async function deleteEvent(eventId, triggerBtn) {
  if (!confirm('Seguro que quieres borrar este evento?')) return;

  triggerBtn.disabled = true;
  triggerBtn.textContent = 'Borrando...';

  const { error } = await supabaseClient
    .from('events')
    .delete()
    .eq('id', eventId);

  triggerBtn.disabled = false;
  triggerBtn.textContent = 'Borrar evento';

  if (error) {
    console.error('Error borrando evento:', error);
    alert('No se pudo borrar el evento.');
    return;
  }

  await loadEvents();
}

async function loadEvents() {
  const { data, error } = await supabaseClient
    .from('events')
    .select('id, title, description')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error cargando eventos:', error);
    eventsList.innerHTML = '';
    return;
  }

  await renderEvents(data || []);
}

async function saveEvent() {
  const title = eventTitleInput.value.trim();
  const description = eventDescriptionInput.value.trim();
  const isEditing = editingEventId !== null;

  if (!title) {
    alert('El evento es obligatorio');
    eventTitleInput.focus();
    return;
  }

  saveEventBtn.disabled = true;
  saveEventBtn.textContent = isEditing ? 'Guardando cambios...' : 'Guardando...';
  let error = null;

  if (isEditing) {
    ({ error } = await supabaseClient
      .from('events')
      .update({ title, description })
      .eq('id', editingEventId));
  } else {
    ({ error } = await supabaseClient
      .from('events')
      .insert([{ title, description }]));
  }

  saveEventBtn.disabled = false;
  saveEventBtn.textContent = isEditing ? EDIT_SAVE_TEXT : CREATE_SAVE_TEXT;

  if (error) {
    if (isEditing) {
      console.error('Error actualizando evento:', error);
      alert('No se pudo actualizar el evento en Supabase.');
    } else {
      console.error('Error guardando evento:', error);
      alert('No se pudo guardar el evento en Supabase.');
    }
    return;
  }

  closeModal();
  await loadEvents();
}

openEventModalBtn.addEventListener('click', startCreateEvent);
cancelEventBtn.addEventListener('click', closeModal);
saveEventBtn.addEventListener('click', saveEvent);

eventModal.addEventListener('click', event => {
  if (event.target === eventModal) closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && eventModal.style.display === 'flex') {
    closeModal();
  }
});

loadEvents();
