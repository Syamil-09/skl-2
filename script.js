// API Source URL DummyJSON Recipes
const API_URL = 'https://dummyjson.com/recipes?limit=0';

// Element DOM Selectors
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const cuisineFilter = document.getElementById('cuisine-filter');
const difficultyFilter = document.getElementById('difficulty-filter');
const sectionTitle = document.getElementById('section-title');
const recipeCount = document.getElementById('recipe-count');
const resetFilterBtn = document.getElementById('reset-filter-button');
const recipeGrid = document.getElementById('recipe-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const favoriteToggleBtn = document.getElementById('favorite-toggle-btn');
const favoriteCountBadge = document.getElementById('favorite-count');
const recipeDialog = document.getElementById('recipe-dialog');
const closeDialogBtn = document.getElementById('close-dialog');
const dialogContent = document.getElementById('dialog-content');

// Application States
let allRecipes = [];
let favorites = getFavoritesFromStorage();
let showingFavoritesOnly = false;

// 1. Inisialisasi Aplikasi saat DOM Siap
document.addEventListener('DOMContentLoaded', () => {
  fetchRecipes();
  updateFavoriteBadge();
  setupEventListeners();
});

// 2. Mengambil Data dari DummyJSON API menggunakan Fetch API
async function fetchRecipes() {
  showState('loading');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    allRecipes = data.recipes || [];

    populateCuisineOptions(allRecipes);
    applyFiltersAndRender();
  } catch (error) {
    console.error('Error fetching recipes:', error);
    showState('error');
  }
}

// 3. Mengisi Opsi Dropdown Cuisine Secara Dinamis berdasarkan Data API
function populateCuisineOptions(recipes) {
  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))].sort();
  cuisineFilter.innerHTML = '<option value="">All Cuisine</option>';
  cuisines.forEach((cuisine) => {
    const option = document.createElement('option');
    option.value = cuisine;
    option.textContent = cuisine;
    cuisineFilter.appendChild(option);
  });
}

// 4. Menyaring Data (Search, Filter Cuisine, Filter Difficulty, Filter Favorite)
function applyFiltersAndRender() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCuisine = cuisineFilter.value;
  const selectedDifficulty = difficultyFilter.value;

  const filteredRecipes = allRecipes.filter((recipe) => {
    // Search matching name, cuisine, or tags
    const matchesSearch =
      !searchTerm ||
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.cuisine.toLowerCase().includes(searchTerm) ||
      (recipe.tags && recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm)));

    // Cuisine matching
    const matchesCuisine = !selectedCuisine || recipe.cuisine === selectedCuisine;

    // Difficulty matching
    const matchesDifficulty = !selectedDifficulty || recipe.difficulty === selectedDifficulty;

    // Favorite matching
    const matchesFavorite = !showingFavoritesOnly || favorites.includes(recipe.id);

    return matchesSearch && matchesCuisine && matchesDifficulty && matchesFavorite;
  });

  // Tampilkan/Sembunyikan tombol Reset
  const isFiltered = searchTerm || selectedCuisine || selectedDifficulty || showingFavoritesOnly;
  resetFilterBtn.hidden = !isFiltered;

  // Render Hasil Filter
  renderRecipes(filteredRecipes);
}

// 5. Menampilkan Daftar Card Resep ke Halaman Web
function renderRecipes(recipes) {
  recipeCount.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;

  if (recipes.length === 0) {
    showState('empty');
    return;
  }

  showState('grid');
  recipeGrid.innerHTML = recipes
    .map((recipe) => {
      const isFav = favorites.includes(recipe.id);
      return `
        <article class="recipe-card">
          <img class="recipe-image" src="${recipe.image}" alt="${recipe.name}" loading="lazy">
          <div class="recipe-body">
            <span class="recipe-cuisine">${recipe.cuisine}</span>
            <h3 class="recipe-title">${recipe.name}</h3>
            <div class="recipe-meta">
              <span>⏱️️ ${recipe.prepTimeMinutes + recipe.cookTimeMinutes} mnt</span>
              <span>⭐ ${recipe.rating} (${recipe.reviewCount})</span>
              <span>🔥 ${recipe.difficulty}</span>
            </div>
            <div class="recipe-actions">
              <button class="detail-button" data-id="${recipe.id}">Detail</button>
              <button class="like-button" data-id="${recipe.id}" aria-label="Favorite">
                ${isFav ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

// 6. Pengaturan Event Listeners (DOM Events)
function setupEventListeners() {
  // Submit Form Pencarian
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFiltersAndRender();
  });

  // Real-time Search Input
  searchInput.addEventListener('input', () => {
    applyFiltersAndRender();
  });

  // Filter Dropdown Event
  cuisineFilter.addEventListener('change', applyFiltersAndRender);
  difficultyFilter.addEventListener('change', applyFiltersAndRender);

  // Reset Filter Button
  resetFilterBtn.addEventListener('click', resetFilters);

  // Toggle View Favorit pada Navbar
  favoriteToggleBtn.addEventListener('click', () => {
    showingFavoritesOnly = !showingFavoritesOnly;
    if (showingFavoritesOnly) {
      sectionTitle.textContent = 'Resep Favorit Saya';
      favoriteToggleBtn.style.background = '#fff0f3';
    } else {
      sectionTitle.textContent = 'Explore Recipes';
      favoriteToggleBtn.style.background = '#fff';
    }
    applyFiltersAndRender();
  });

  // Event Delegation pada Recipe Grid (Klik Detail & Favorit)
  recipeGrid.addEventListener('click', (e) => {
    const detailBtn = e.target.closest('.detail-button');
    const likeBtn = e.target.closest('.like-button');

    if (detailBtn) {
      const recipeId = parseInt(detailBtn.dataset.id, 10);
      openRecipeDetail(recipeId);
    } else if (likeBtn) {
      const recipeId = parseInt(likeBtn.dataset.id, 10);
      toggleFavorite(recipeId);
    }
  });

  // Tutup Modal Dialog Detail
  closeDialogBtn.addEventListener('click', () => recipeDialog.close());

  // Tutup Modal saat mengeklik backdrop luar dialog
  recipeDialog.addEventListener('click', (e) => {
    const dialogBounds = recipeDialog.getBoundingClientRect();
    if (
      e.clientX < dialogBounds.left ||
      e.clientX > dialogBounds.right ||
      e.clientY < dialogBounds.top ||
      e.clientY > dialogBounds.bottom
    ) {
      recipeDialog.close();
    }
  });
}

// 7. Menampilkan Detail Recipe pada Modal Dialog
function openRecipeDetail(recipeId) {
  const recipe = allRecipes.find((r) => r.id === recipeId);
  if (!recipe) return;

  dialogContent.innerHTML = `
    <img class="dialog-image" src="${recipe.image}" alt="${recipe.name}">
    <div class="dialog-body">
      <h2>${recipe.name}</h2>
      <div class="dialog-meta">
        <span>🌍 ${recipe.cuisine}</span>
        <span>⏱️ Persiapan: ${recipe.prepTimeMinutes} mnt | Memasak: ${recipe.cookTimeMinutes} mnt</span>
        <span>🔥 ${recipe.difficulty}</span>
        <span>⭐ ${recipe.rating} (${recipe.reviewCount} ulasan)</span>
        <span>🔥 ${recipe.caloriesPerServing} kal/porsi</span>
        <span>🍽️ ${recipe.servings} Porsi</span>
      </div>

      <h3>Bahan-Bahan (Ingredients)</h3>
      <ul class="ingredients">
        ${recipe.ingredients.map((ing) => `<li>${ing}</li>`).join('')}
      </ul>

      <h3>Langkah Pembuatan (Instructions)</h3>
      <div class="instructions">
        ${recipe.instructions.map((inst) => `<p>${inst}</p>`).join('')}
      </div>
    </div>
  `;

  recipeDialog.showModal();
}

// 8. Manajemen Favorit & LocalStorage
function toggleFavorite(recipeId) {
  if (favorites.includes(recipeId)) {
    favorites = favorites.filter((id) => id !== recipeId);
  } else {
    favorites.push(recipeId);
  }

  saveFavoritesToStorage(favorites);
  updateFavoriteBadge();
  applyFiltersAndRender();
}

function getFavoritesFromStorage() {
  try {
    const data = localStorage.getItem('favoriteRecipes');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveFavoritesToStorage(favs) {
  localStorage.setItem('favoriteRecipes', JSON.stringify(favs));
}

function updateFavoriteBadge() {
  favoriteCountBadge.textContent = favorites.length;
}

// 9. Reset Semua Filter
function resetFilters() {
  searchInput.value = '';
  cuisineFilter.value = '';
  difficultyFilter.value = '';
  showingFavoritesOnly = false;
  sectionTitle.textContent = 'Explore Recipes';
  favoriteToggleBtn.style.background = '#fff';
  applyFiltersAndRender();
}

// 10. Helper Mengontrol State UI (Loading, Error, Empty, Grid)
function showState(state) {
  loadingState.hidden = state !== 'loading';
  errorState.hidden = state !== 'error';
  emptyState.hidden = state !== 'empty';
  recipeGrid.hidden = state !== 'grid';
}