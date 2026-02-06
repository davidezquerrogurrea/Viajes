// gallery.js
import { supabaseClient } from './supabase.js';

const galleryContent = document.getElementById('galleryContent');
const isMobile = window.innerWidth < 768;

/* ===============================
   Redimensionar imagen antes de subir
================================ */
function resizeImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => img.src = e.target.result;

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

      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
    };

    reader.readAsDataURL(file);
  });
}

/* ===============================
   Función para cargar la galería
================================ */
async function loadGallery() {
  const { data: markers, error } = await supabaseClient
    .from('markers')
    .select('*');

  if (error) return console.error('Error cargando marcadores:', error);

  galleryContent.innerHTML = '';

  for (const marker of markers) {
    const item = document.createElement('div');
    item.classList.add('gallery-item');

    item.innerHTML = `
      <h3>${marker.title}</h3>
      <div class="photos" id="photos-${marker.id}">
        <div style="display:flex;align-items:center;justify-content:center;height:220px;color:#999;">
          📷 Cargando fotos...
        </div>
      </div>
      <input type="file" id="fileInput-${marker.id}" multiple accept="image/*" hidden />
      <button id="addPhotosBtn-${marker.id}">📸 Añadir fotos</button>
    `;

    galleryContent.appendChild(item);

    const fileInput = document.getElementById(`fileInput-${marker.id}`);
    const addBtn = document.getElementById(`addPhotosBtn-${marker.id}`);

    addBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async event => {
      const files = event.target.files;
      if (!files.length) return;

      addBtn.textContent = '⏳ Subiendo...';
      addBtn.disabled = true;

      for (const file of files) {
        const resizedBlob = await resizeImage(file);
        const fileName = `${Date.now()}.jpg`;
        const filePath = `${marker.id}/${fileName}`;

        const { error } = await supabaseClient
          .storage
          .from('market-photos')
          .upload(filePath, resizedBlob);

        if (error) console.error('Error subiendo foto:', error.message);
      }

      fileInput.value = '';
      addBtn.textContent = '📸 Añadir fotos';
      addBtn.disabled = false;

      await loadPhotos(marker.id);
    });

    await loadPhotos(marker.id);
  }
}

/* ===============================
   Cargar fotos y carrusel
================================ */
async function loadPhotos(markerId) {
  const container = document.getElementById(`photos-${markerId}`);
  container.innerHTML = '';

  // Listar fotos del storage
  const { data: files, error } = await supabaseClient
    .storage
    .from('market-photos')
    .list(markerId);

  if (error || !files?.length) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:220px;color:#999;">
      📷 Sin fotos
    </div>`;
    return;
  }

  // Creamos array de objetos { url, name }
  const photos = files.map(file => {
    const { data } = supabaseClient
      .storage
      .from('market-photos')
      .getPublicUrl(`${markerId}/${file.name}`);
    return { url: data.publicUrl, name: file.name };
  }).filter(Boolean);

  // Contenedor carrusel
  const carousel = document.createElement('div');
  carousel.className = 'carousel';

  // Imagen principal
  const mainImg = document.createElement('img');
  mainImg.className = 'carousel-main';
  mainImg.loading = 'lazy';
  mainImg.src = photos[0].url;
  mainImg.style.cursor = 'pointer';

  // Click para abrir lightbox
  // mainImg.addEventListener('click', () => openLightbox(mainImg.src));
  mainImg.addEventListener('click', () => {
    const index = photos.findIndex(p => p.url === mainImg.src);
    openLightbox(photos, index);
  });


  // Botón borrar
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
    if (!confirm('¿Seguro que quieres borrar esta foto?')) return;

    const currentPhoto = photos.find(p => p.url === mainImg.src);
    if (!currentPhoto) return;

    const { error } = await supabaseClient
      .storage
      .from('market-photos')
      .remove([`${markerId}/${currentPhoto.name}`]);

    if (error) {
      alert('Error al borrar la foto');
      console.error(error);
      return;
    }

    // Recargar todas las fotos
    await loadPhotos(markerId);
  });

  // Wrapper principal
  const mainWrapper = document.createElement('div');
  mainWrapper.style.position = 'relative';
  mainWrapper.appendChild(mainImg);
  mainWrapper.appendChild(deleteBtn);

  // Miniaturas
  const thumbs = document.createElement('div');
  thumbs.className = 'carousel-thumbs';
  photos.forEach((photo, index) => {
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.style.width = '80px';
    thumb.style.height = '80px';
    thumb.style.objectFit = 'cover';
    thumb.style.margin = '6px';
    thumb.style.borderRadius = '8px';
    thumb.style.cursor = 'pointer';
    if (index === 0) thumb.classList.add('active');

    thumb.addEventListener('click', () => {
      mainImg.src = photo.url;
      thumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });

    thumbs.appendChild(thumb);
  });

  carousel.appendChild(mainWrapper);
  carousel.appendChild(thumbs);
  container.appendChild(carousel);
}

// function openLightbox(src) {
//   const lightbox = document.createElement('div');
//   lightbox.className = 'lightbox';
//   lightbox.style.cssText = `
//     position: fixed;
//     top: 0; left: 0; width: 100%; height: 100%;
//     background: rgba(0,0,0,0.8);
//     display: flex;
//     justify-content: center;
//     align-items: center;
//     z-index: 9999;
//     cursor: pointer;
//   `;
  
//   const img = document.createElement('img');
//   img.src = src;
//   img.style.maxWidth = '90%';
//   img.style.maxHeight = '90%';
//   img.style.borderRadius = '12px';
//   lightbox.appendChild(img);

//   document.body.appendChild(lightbox);

//   lightbox.addEventListener('click', () => lightbox.remove());
// }

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

  /* =========================
     IMAGEN PRINCIPAL
  ========================= */
  const img = document.createElement('img');
  img.style.cssText = `
    max-width:90%;
    max-height:75%;
    border-radius:12px;
    margin-bottom:20px;
    transition:opacity .2s ease;
  `;

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

  /* =========================
     MINIATURAS ABAJO
  ========================= */
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

  function updateThumbs() {
    thumbImgs.forEach((t,i)=>{
      t.style.opacity = i === currentIndex ? '1' : '0.5';
      t.style.border = i === currentIndex
        ? '2px solid white'
        : '2px solid transparent';
    });
  }

  /* =========================
     SWIPE TOUCH
  ========================= */
  let startX = 0;
  let endX = 0;

  lightbox.addEventListener('touchstart', e=>{
    startX = e.changedTouches[0].clientX;
  });

  lightbox.addEventListener('touchend', e=>{
    endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if(Math.abs(diff)<50) return;

    if(diff>0) next();
    else prev();
  });

  /* =========================
     TECLADO
  ========================= */
  function keyHandler(e){
    if(e.key==='ArrowRight') next();
    if(e.key==='ArrowLeft') prev();
    if(e.key==='Escape') close();
  }

  document.addEventListener('keydown', keyHandler);

  function close(){
    document.removeEventListener('keydown', keyHandler);
    lightbox.remove();
  }

  lightbox.addEventListener('click', e=>{
    if(e.target===lightbox) close();
  });

  updateImage();

  lightbox.appendChild(img);
  lightbox.appendChild(thumbs);

  document.body.appendChild(lightbox);
}



/* ===============================
   Buscador
================================ */
document.getElementById('searchInput').addEventListener('input', e => {
  const text = e.target.value.toLowerCase();
  document.querySelectorAll('#galleryContent > div').forEach(item => {
    const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
    item.style.display = title.includes(text) ? '' : 'none';
  });
});

/* ===============================
   Inicializar
================================ */
document.addEventListener('DOMContentLoaded', loadGallery);
