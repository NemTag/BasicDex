<template>
  <div class="poke-details">
    <button class="btn btn-outline-danger back-btn" @click="$router.push('/')">
      ← Back
    </button>

    <div v-if="loading" class="d-flex justify-content-center mt-5">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger mt-4" role="alert">
      {{ error }}
    </div>

    <div v-if="pokemon" class="detail-content mt-4">
      <div class="detail-card d-flex align-items-start">
        <img
            :src="pokemon.sprite"
            :alt="pokemon.name"
            class="detail-sprite"
        />

        <div class="detail-info ms-4">
          <h1 class="pokemon-name">{{ pokemon.name }}</h1>

          <p class="dex-number text-muted">#{{ pokemon.dexNumber }}</p>

          <div class="type-badges mb-2">
            <span
                v-for="type in pokemon.types"
                :key="type"
                class="badge type-badge"
                :class="`type-${type}`"
            >
              {{ type }}
            </span>
          </div>

          <span class="badge generation-badge">{{ pokemon.generation }}</span>
        </div>
      </div>

      <!-- Abilities Section -->
      <section class="abilities-section mt-5">
        <h3 class="section-title">Abilities</h3>

        <div v-if="abilities.length" class="ability-list">
          <div
              v-for="ability in normalAbilities"
              :key="ability.name"
              class="ability-row"
          >
            <span class="ability-name">{{ ability.name }}</span>
            <span class="ability-desc">{{ ability.effect }}</span>
          </div>
        </div>

        <div v-if="hiddenAbilities.length" class="mt-4">
          <h5 class="hidden-title">Hidden</h5>

          <div class="ability-list">
            <div
                v-for="ability in hiddenAbilities"
                :key="ability.name"
                class="ability-row hidden"
            >
              <span class="ability-name">{{ ability.name }}</span>
              <span class="ability-desc">{{ ability.effect }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'

const API_BASE_URL = 'https://pokeapi.co/api/v2'

const route = useRoute()
const pokemon = ref(null)
const abilities = ref([])
const loading = ref(false)
const error = ref(null)
const cache = new Map()

const normalAbilities = computed(() =>
    abilities.value.filter((a) => !a.is_hidden)
)

const hiddenAbilities = computed(() =>
    abilities.value.filter((a) => a.is_hidden)
)

const cachedFetch = async (url) => {
  if (cache.has(url)) return cache.get(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  cache.set(url, data)
  return data
}

onMounted(async () => {
  const name = route.params.name

  loading.value = true
  error.value = null

  try {
    const data = await cachedFetch(`${API_BASE_URL}/pokemon/${name}`)
    const species = await cachedFetch(data.species.url)
    const generation = await cachedFetch(species.generation.url)

    const genName = generation.names.find((n) => n.language.name === 'en')

    pokemon.value = {
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      sprite:
          data.sprites.other['official-artwork'].front_default ||
          data.sprites.front_default,
      types: data.types.map((t) => t.type.name),
      dexNumber: String(data.id).padStart(4, '0'),
      generation: genName ? genName.name : species.generation.name
    }

    // Fetch ability details
    abilities.value = await Promise.all(
        data.abilities.map(async (a) => {
          const abilityData = await cachedFetch(a.ability.url)

          const effectEntry = abilityData.effect_entries.find(
              (e) => e.language.name === 'en'
          )

          return {
            name: a.ability.name
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' '),
            effect: effectEntry ? effectEntry.short_effect : 'No description available.',
            is_hidden: a.is_hidden
          }
        })
    )
  } catch (err) {
    error.value = 'Failed to load Pokémon details.'
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.poke-details {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.back-btn {
  border-radius: 20px;
  font-weight: 600;
}

.detail-card {
  animation: fadeIn 0.4s ease-in-out;
}

.detail-sprite {
  width: 220px;
  height: 220px;
  object-fit: contain;
  filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.2));
}

.pokemon-name {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 0.1rem;
}

.dex-number {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.type-badge {
  font-size: 0.9rem;
  padding: 0.35rem 0.9rem;
  margin-right: 0.4rem;
  border-radius: 16px;
  color: white;
  text-transform: capitalize;
}

.generation-badge {
  font-size: 0.9rem;
  padding: 0.35rem 0.9rem;
  background-color: #6c757d;
  border-radius: 16px;
  color: white;
}

/* Type colors */
.type-normal { background-color: #A8A77A; }
.type-fire { background-color: #EE8130; }
.type-water { background-color: #6390F0; }
.type-electric { background-color: #F7D02C; }
.type-grass { background-color: #7AC74C; }
.type-ice { background-color: #96D9D6; }
.type-fighting { background-color: #C22E28; }
.type-poison { background-color: #A33EA1; }
.type-ground { background-color: #E2BF65; }
.type-flying { background-color: #A98FF3; }
.type-psychic { background-color: #F95587; }
.type-bug { background-color: #A6B91A; }
.type-rock { background-color: #B6A136; }
.type-ghost { background-color: #735797; }
.type-dragon { background-color: #6F35FC; }
.type-dark { background-color: #705746; }
.type-steel { background-color: #B7B7CE; }
.type-fairy { background-color: #D685AD; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Abilities */
.abilities-section {
  text-align: left;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid #dc3545;
}

.hidden-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.6rem;
}

.ability-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ability-row {
  display: flex;
  align-items: baseline;
  padding: 0.6rem 0.8rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.ability-row.hidden {
  background-color: #f0f0f5;
  border-left: 3px solid #6c757d;
}

.ability-name {
  font-weight: 600;
  min-width: 160px;
  flex-shrink: 0;
  color: #2c3e50;
}

.ability-desc {
  color: #555;
  font-size: 0.92rem;
  line-height: 1.4;
}
</style>