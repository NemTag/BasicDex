<template>
  <main class="container d-flex flex-column align-items-center justify-content-center mt-5">
    <!-- Pokemon Result -->
    <div v-if="pokemonData" class="pokemon-card text-center mb-4">
      <router-link :to="`/pokemon/${pokemonData.name.toLowerCase()}`">
        <img
            :src="pokemonData.sprite"
            :alt="pokemonData.name"
            class="pokemon-sprite clickable"
        />
      </router-link>
      <h2 class="pokemon-name">{{ pokemonData.name }}</h2>
      <span class="badge generation-badge">{{ pokemonData.generation }}</span>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-danger mb-4" role="alert">
      {{ error }}
    </div>

    <!-- Loading Spinner -->
    <div v-if="loading" class="spinner-border text-danger mb-4" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>

    <!-- Search Box -->
    <div class="search-container" ref="searchContainerRef">
      <input
          v-model="searchQuery"
          @input="onInput"
          @keydown.down.prevent="navigateSuggestions(1)"
          @keydown.up.prevent="navigateSuggestions(-1)"
          @keydown.enter.prevent="handleEnter"
          @keydown.esc="showSuggestions = false"
          @focus="showSuggestions = suggestions.length > 0"
          type="text"
          class="form-control search-input"
          placeholder="Enter a Pokémon name..."
      />

      <!-- Suggestions Dropdown -->
      <ul v-if="showSuggestions && suggestions.length" class="suggestions-list">
        <li
            v-for="(name, index) in suggestions"
            :key="name"
            @mousedown.prevent="selectSuggestion(name)"
            @mouseenter="activeIndex = index"
            class="suggestion-item"
            :class="{ active: index === activeIndex }"
        >
          {{ name }}
        </li>
      </ul>

      <button
          @click="searchPokemon"
          class="btn btn-danger mt-2 search-btn"
          :disabled="loading"
      >
        Search
      </button>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const API_BASE_URL = 'https://pokeapi.co/api/v2'

const searchQuery = ref('')
const pokemonData = ref(null)
const loading = ref(false)
const error = ref(null)
const cache = new Map()

const allPokemonNames = ref([])
const suggestions = ref([])
const showSuggestions = ref(false)
const searchContainerRef = ref(null)
const activeIndex = ref(-1)

const MIN_CHARS = 2
const MAX_SUGGESTIONS = 8

const navigateSuggestions = (direction) => {
  if (!showSuggestions.value || !suggestions.value.length) return

  activeIndex.value = (activeIndex.value + direction + suggestions.value.length) % suggestions.value.length
}

const handleEnter = () => {
  if (activeIndex.value >= 0 && showSuggestions.value) {
    selectSuggestion(suggestions.value[activeIndex.value])
  } else {
    searchPokemon()
  }
}

const handleClickOutside = (e) => {
  if (searchContainerRef.value && !searchContainerRef.value.contains(e.target)) {
    showSuggestions.value = false
  }
}

onMounted(async () => {
  try {
    const data = await cachedFetch(`${API_BASE_URL}/pokemon?limit=1302`)
    allPokemonNames.value = data.results.map((p) => p.name)
  } catch (err) {
    console.error('Failed to load Pokémon list:', err)
  }

  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const onInput = () => {
  const query = searchQuery.value.trim().toLowerCase()
  activeIndex.value = -1

  if (query.length < MIN_CHARS) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  suggestions.value = allPokemonNames.value
      .filter((name) => name.startsWith(query))
      .slice(0, MAX_SUGGESTIONS)

  showSuggestions.value = suggestions.value.length > 0
}

const selectSuggestion = (name) => {
  searchQuery.value = name
  suggestions.value = []
  showSuggestions.value = false
  searchPokemon()
}

const cachedFetch = async (url) => {
  if (cache.has(url)) return cache.get(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  cache.set(url, data)
  return data
}

const searchPokemon = async () => {
  const name = searchQuery.value.trim().toLowerCase()

  if (!name) return

  loading.value = true
  error.value = null
  pokemonData.value = null

  try {
    const pokemon = await cachedFetch(`${API_BASE_URL}/pokemon/${name}`)
    const species = await cachedFetch(pokemon.species.url)
    const generation = await cachedFetch(species.generation.url)

    const genName = generation.names.find((n) => n.language.name === 'en')

    pokemonData.value = {
      name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
      sprite:
          pokemon.sprites.other['official-artwork'].front_default ||
          pokemon.sprites.front_default,
      generation: genName ? genName.name : species.generation.name
    }
  } catch (err) {
    error.value = `No Pokémon found matching "${searchQuery.value}"`
    console.error('Search failed:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.search-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  position: relative;
}

.search-input {
  text-align: center;
  font-size: 1.1rem;
  padding: 0.6rem 1rem;
  border-radius: 25px;
  border: 2px solid #dc3545;
}

.search-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
  border-color: #dc3545;
}

.suggestions-list {
  list-style: none;
  margin: 0;
  padding: 0.3rem 0;
  position: absolute;
  top: 48px;
  width: 100%;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 260px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem 1.2rem;
  cursor: pointer;
  text-transform: capitalize;
  font-size: 1rem;
  color: #2c3e50;
  transition: background-color 0.15s ease;
}

.suggestion-item:hover,
.suggestion-item.active {
  background-color: #fce4e6;
  color: #dc3545;
}

.search-btn {
  border-radius: 25px;
  padding: 0.5rem 2.5rem;
  font-weight: 600;
}

.pokemon-card {
  animation: fadeIn 0.4s ease-in-out;
}

.pokemon-sprite {
  width: 200px;
  height: 200px;
  object-fit: contain;
  filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.2));
}

.pokemon-sprite.clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.pokemon-sprite.clickable:hover {
  transform: scale(1.05);
}

.pokemon-name {
  font-size: 1.8rem;
  font-weight: 700;
  margin-top: 0.5rem;
  color: #2c3e50;
}

.generation-badge {
  font-size: 0.95rem;
  padding: 0.4rem 1rem;
  background-color: #dc3545;
  color: white;
  border-radius: 20px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>