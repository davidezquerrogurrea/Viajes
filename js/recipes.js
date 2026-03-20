import { supabaseClient } from './supabase.js';

const recipesList = document.getElementById('recipesList');
const recipeModal = document.getElementById('recipeModal');
const openRecipeModalBtn = document.getElementById('openRecipeModalBtn');
const saveRecipeBtn = document.getElementById('saveRecipeBtn');
const cancelRecipeBtn = document.getElementById('cancelRecipeBtn');
const recipeTitleInput = document.getElementById('recipeTitle');
const recipeTypeInput = document.getElementById('recipeType');
const recipeDifficultyInput = document.getElementById('recipeDifficulty');
const recipeTimeInput = document.getElementById('recipeTime');
const recipeStatusInput = document.getElementById('recipeStatus');
const recipeIngredientsInput = document.getElementById('recipeIngredients');
const recipeInstructionsInput = document.getElementById('recipeInstructions');
const recipeLinkInput = document.getElementById('recipeLink');
const recipeModalTitle = recipeModal.querySelector('.modal-content h3');

const recipeSearch = document.getElementById('recipeSearch');
const recipeTypeFilter = document.getElementById('recipeTypeFilter');
const recipeDifficultyFilter = document.getElementById('recipeDifficultyFilter');
const recipeStatusFilter = document.getElementById('recipeStatusFilter');

const CREATE_MODAL_TITLE = 'Agregar receta';
const EDIT_MODAL_TITLE = 'Editar receta';
const CREATE_SAVE_TEXT = 'Guardar';
const EDIT_SAVE_TEXT = 'Guardar cambios';

let editingRecipeId = null;
let recipeItems = [];

function openModal() {
  recipeModal.style.display = 'flex';
  recipeTitleInput.focus();
}

function closeModal() {
  recipeModal.style.display = 'none';
  editingRecipeId = null;
  recipeModalTitle.textContent = CREATE_MODAL_TITLE;
  saveRecipeBtn.textContent = CREATE_SAVE_TEXT;
  recipeTitleInput.value = '';
  recipeTypeInput.value = 'Desayuno';
  recipeDifficultyInput.value = 'Facil';
  recipeTimeInput.value = '';
  recipeStatusInput.value = 'Pendiente';
  recipeIngredientsInput.value = '';
  recipeInstructionsInput.value = '';
  recipeLinkInput.value = '';
}

function startCreate() {
  editingRecipeId = null;
  recipeModalTitle.textContent = CREATE_MODAL_TITLE;
  saveRecipeBtn.textContent = CREATE_SAVE_TEXT;
  recipeTitleInput.value = '';
  recipeTypeInput.value = 'Desayuno';
  recipeDifficultyInput.value = 'Facil';
  recipeTimeInput.value = '';
  recipeStatusInput.value = 'Pendiente';
  recipeIngredientsInput.value = '';
  recipeInstructionsInput.value = '';
  recipeLinkInput.value = '';
  openModal();
}

function startEdit(item) {
  editingRecipeId = item.id;
  recipeModalTitle.textContent = EDIT_MODAL_TITLE;
  saveRecipeBtn.textContent = EDIT_SAVE_TEXT;
  recipeTitleInput.value = item.title || '';
  recipeTypeInput.value = item.type || 'Desayuno';
  recipeDifficultyInput.value = item.difficulty || 'Facil';
  recipeTimeInput.value = item.time_minutes || '';
  recipeStatusInput.value = item.status || 'Pendiente';
  recipeIngredientsInput.value = item.ingredients || '';
  recipeInstructionsInput.value = item.instructions || '';
  recipeLinkInput.value = item.link || '';
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
  if (value === 'hecha') return 'status-hecha';
  return 'status-default';
}

function getNextStatus(status) {
  const value = (status || 'Pendiente').toLowerCase();
  if (value === 'hecha') return { value: 'Pendiente', label: 'Volver pendiente' };
  return { value: 'Hecha', label: 'Marcar hecha' };
}

function renderRecipes(items) {
  recipesList.innerHTML = '';

  if (!items.length) return;

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'list-card recipe-card';

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title || 'Sin titulo';

    const tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    tagRow.appendChild(createTag(item.type || 'Desayuno', 'tag-type'));
    tagRow.appendChild(createTag(item.difficulty || 'Facil', 'tag-difficulty'));
    if (item.time_minutes) {
      tagRow.appendChild(createTag(`${item.time_minutes} min`, 'tag-time'));
    }
    tagRow.appendChild(createTag(item.status || 'Pendiente', getStatusClass(item.status)));

    header.appendChild(title);
    header.appendChild(tagRow);

    const ingredients = document.createElement('div');
    ingredients.className = 'card-section';

    const ingredientsTitle = document.createElement('h4');
    ingredientsTitle.className = 'card-section-title';
    ingredientsTitle.textContent = 'Ingredientes';

    const ingredientsContent = document.createElement('p');
    ingredientsContent.className = 'card-section-content';
    ingredientsContent.textContent = item.ingredients || 'Sin ingredientes';

    ingredients.appendChild(ingredientsTitle);
    ingredients.appendChild(ingredientsContent);

    const instructions = document.createElement('div');
    instructions.className = 'card-section';

    const instructionsTitle = document.createElement('h4');
    instructionsTitle.className = 'card-section-title';
    instructionsTitle.textContent = 'Instrucciones';

    const instructionsContent = document.createElement('p');
    instructionsContent.className = 'card-section-content';
    instructionsContent.textContent = item.instructions || 'Sin instrucciones';

    instructions.appendChild(instructionsTitle);
    instructions.appendChild(instructionsContent);

    let linkWrapper = null;
    if (item.link) {
      linkWrapper = document.createElement('p');
      linkWrapper.className = 'card-section-content';
      const link = document.createElement('a');
      link.className = 'card-link';
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver receta';
      linkWrapper.appendChild(link);
    }

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
    card.appendChild(ingredients);
    card.appendChild(instructions);
    if (linkWrapper) card.appendChild(linkWrapper);
    card.appendChild(actions);

    recipesList.appendChild(card);
  });
}

function getFilteredItems() {
  const text = recipeSearch.value.trim().toLowerCase();
  const typeFilter = recipeTypeFilter.value;
  const difficultyFilter = recipeDifficultyFilter.value;
  const statusFilter = recipeStatusFilter.value;

  return recipeItems.filter(item => {
    const matchesText = !text || [item.title, item.type, item.ingredients]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(text));

    const matchesType = typeFilter === 'all' || (item.type || '').toLowerCase() === typeFilter.toLowerCase();
    const matchesDifficulty = difficultyFilter === 'all' || (item.difficulty || '').toLowerCase() === difficultyFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || (item.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesText && matchesType && matchesDifficulty && matchesStatus;
  });
}

function applyFilters() {
  renderRecipes(getFilteredItems());
}

async function loadRecipes() {
  const { data, error } = await supabaseClient
    .from('recipes')
    .select('id, title, type, difficulty, time_minutes, ingredients, instructions, status, link')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error cargando recetas:', error);
    recipesList.innerHTML = '';
    return;
  }

  recipeItems = data || [];
  applyFilters();
}

async function saveRecipe() {
  const title = recipeTitleInput.value.trim();
  const timeValue = parseInt(recipeTimeInput.value, 10);
  const payload = {
    title,
    type: recipeTypeInput.value,
    difficulty: recipeDifficultyInput.value,
    time_minutes: Number.isNaN(timeValue) ? null : timeValue,
    status: recipeStatusInput.value,
    ingredients: recipeIngredientsInput.value.trim() || null,
    instructions: recipeInstructionsInput.value.trim() || null,
    link: recipeLinkInput.value.trim() || null
  };

  if (!title) {
    alert('El titulo es obligatorio');
    recipeTitleInput.focus();
    return;
  }

  saveRecipeBtn.disabled = true;
  saveRecipeBtn.textContent = editingRecipeId ? 'Guardando cambios...' : 'Guardando...';

  let error = null;

  if (editingRecipeId) {
    ({ error } = await supabaseClient
      .from('recipes')
      .update(payload)
      .eq('id', editingRecipeId));
  } else {
    ({ error } = await supabaseClient
      .from('recipes')
      .insert([payload]));
  }

  saveRecipeBtn.disabled = false;
  saveRecipeBtn.textContent = editingRecipeId ? EDIT_SAVE_TEXT : CREATE_SAVE_TEXT;

  if (error) {
    console.error('Error guardando receta:', error);
    alert('No se pudo guardar la receta en Supabase.');
    return;
  }

  closeModal();
  await loadRecipes();
}

async function updateStatus(item, triggerBtn) {
  const nextStatus = getNextStatus(item.status);

  triggerBtn.disabled = true;
  triggerBtn.textContent = 'Guardando...';

  const { error } = await supabaseClient
    .from('recipes')
    .update({ status: nextStatus.value })
    .eq('id', item.id);

  triggerBtn.disabled = false;
  triggerBtn.textContent = nextStatus.label;

  if (error) {
    console.error('Error actualizando estado:', error);
    alert('No se pudo actualizar el estado.');
    return;
  }

  await loadRecipes();
}

async function deleteItem(itemId, triggerBtn) {
  if (!confirm('Seguro que quieres borrar esta receta?')) return;

  triggerBtn.disabled = true;
  triggerBtn.textContent = 'Borrando...';

  const { error } = await supabaseClient
    .from('recipes')
    .delete()
    .eq('id', itemId);

  triggerBtn.disabled = false;
  triggerBtn.textContent = 'Borrar';

  if (error) {
    console.error('Error borrando receta:', error);
    alert('No se pudo borrar la receta.');
    return;
  }

  await loadRecipes();
}

openRecipeModalBtn.addEventListener('click', startCreate);
cancelRecipeBtn.addEventListener('click', closeModal);
saveRecipeBtn.addEventListener('click', saveRecipe);

recipeModal.addEventListener('click', event => {
  if (event.target === recipeModal) closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && recipeModal.style.display === 'flex') {
    closeModal();
  }
});

recipeSearch.addEventListener('input', applyFilters);
recipeTypeFilter.addEventListener('change', applyFilters);
recipeDifficultyFilter.addEventListener('change', applyFilters);
recipeStatusFilter.addEventListener('change', applyFilters);

loadRecipes();
