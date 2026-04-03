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
import { fetchSprites, getEvolutionChain, getForms } from '@/composables/usePokeApi'

const props = defineProps({
  evolutionChainId: {
    type: Number,
    required: true
  }
})

const chain = ref([])
const loading = ref(false)

const formatName = (name) =>
    name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

onMounted(async () => {
  if (!props.evolutionChainId) return

  loading.value = true

  try {
    const stages = getEvolutionChain(props.evolutionChainId)
    const builtChain = []

    for (const stage of stages) {
      const sprites = await fetchSprites(stage.id)

      builtChain.push({
        ...stage,
        sprite: sprites.official || sprites.default
      })

      // Check for mega / gmax forms
      const forms = getForms(stage.id)

      for (const form of forms) {
        let formSprite = null

        try {
          const formSprites = await fetchSprites(form.pokemon_id)
          formSprite = formSprites.official || formSprites.default
        } catch {
          formSprite = sprites.official || sprites.default
        }

        builtChain.push({
          name: form.name,
          displayName: form.displayName || formatName(form.name),
          triggerLabel: form.triggerLabel,
          sprite: formSprite
        })
      }
    }

    chain.value = builtChain
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