<template>
  <section class="evolution-section mt-5">
    <h3 class="section-title">Evolution Chain</h3>

    <div v-if="loading" class="d-flex justify-content-center">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="chain.length" class="evolution-chain">
      <template v-for="(stage, index) in chain" :key="stage.name">
        <!-- Arrow between stages -->
        <div v-if="index > 0" class="evolution-arrow">
          <span class="arrow-icon">→</span>
          <span class="trigger-label">{{ stage.triggerLabel }}</span>
        </div>

        <!-- Pokemon stage -->
        <div class="evolution-stage">
          <img
              :src="stage.sprite"
              :alt="stage.name"
              class="evolution-sprite"
          />
          <span class="evolution-name">{{ stage.displayName }}</span>
        </div>
      </template>
    </div>

    <p v-else-if="!loading" class="text-muted">No evolution data available.</p>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  evolutionChainUrl: {
    type: String,
    required: true
  }
})

const chain = ref([])
const loading = ref(false)
const cache = new Map()

const cachedFetch = async (url) => {
  if (cache.has(url)) return cache.get(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  cache.set(url, data)
  return data
}

const API_BASE_URL = 'https://pokeapi.co/api/v2'

const formatName = (name) =>
    name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const parseTrigger = (details) => {
  if (!details || !details.length) return null

  const d = details[0]
  const triggerName = d.trigger?.name

  if (triggerName === 'level-up' && d.min_level) {
    return `↑ Lv. ${d.min_level}`
  }

  if (triggerName === 'level-up' && d.min_happiness) {
    return `↑ Happiness ${d.min_happiness}`
  }

  if (triggerName === 'level-up' && d.min_beauty) {
    return `↑ Beauty ${d.min_beauty}`
  }

  if (triggerName === 'level-up' && d.min_affection) {
    return `↑ Affection ${d.min_affection}`
  }

  if (triggerName === 'level-up' && d.needs_overworld_rain) {
    return '↑ Rain'
  }

  if (triggerName === 'level-up' && d.party_species) {
    return `↑ w/ ${formatName(d.party_species.name)}`
  }

  if (triggerName === 'level-up' && d.party_type) {
    return `↑ w/ ${formatName(d.party_type.name)} type`
  }

  if (triggerName === 'level-up') {
    return '↑ Level Up'
  }

  return `↑ ${formatName(triggerName)}`
}

const flattenChain = (node, result = []) => {
  result.push({
    name: node.species.name,
    displayName: formatName(node.species.name),
    triggerLabel: parseTrigger(node.evolution_details),
    speciesUrl: node.species.url
  })

  for (const next of node.evolves_to) {
    flattenChain(next, result)
  }

  return result
}

onMounted(async () => {
  if (!props.evolutionChainUrl) return

  loading.value = true

  try {
    const chainData = await cachedFetch(props.evolutionChainUrl)
    const stages = flattenChain(chainData.chain)

    // Fetch sprites for each stage
    chain.value = await Promise.all(
        stages.map(async (stage) => {
          const id = stage.speciesUrl.split('/').filter(Boolean).pop()
          const pokemon = await cachedFetch(`${API_BASE_URL}/pokemon/${id}`)

          return {
            ...stage,
            sprite:
                pokemon.sprites.other['official-artwork'].front_default ||
                pokemon.sprites.front_default
          }
        })
    )
  } catch (err) {
    console.error('Failed to load evolution chain:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.evolution-section {
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

.evolution-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1.5rem 0;
}

.evolution-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.evolution-sprite {
  width: 100px;
  height: 100px;
  object-fit: contain;
  filter: drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.15));
  transition: transform 0.2s ease;
}

.evolution-sprite:hover {
  transform: scale(1.1);
}

.evolution-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #2c3e50;
}

.evolution-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0 0.5rem;
}

.arrow-icon {
  font-size: 1.6rem;
  color: #dc3545;
  font-weight: 700;
}

.trigger-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
  background-color: #f0f0f5;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}
</style>