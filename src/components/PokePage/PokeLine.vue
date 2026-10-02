<template>
  <section class="evolution-section mt-5">
    <h3 class="section-title">Evolution Chain</h3>

    <div v-if="loading" class="d-flex justify-content-center">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else-if="tree" class="evolution-scroll">
      <div class="evolution-tree">
        <EvolutionNode :node="tree" :current-id="currentId" />
      </div>
      <p v-if="!tree.children.length" class="text-muted text-center mb-0">
        This Pokémon does not evolve.
      </p>
    </div>

    <p v-else class="text-muted">No evolution data available.</p>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { fetchSprites, getEvolutionTree } from '@/composables/usePokeApi'
import EvolutionNode from './EvolutionNode.vue'

const props = defineProps({
  evolutionChainId: {
    type: Number,
    required: true
  },
  currentId: {
    type: Number,
    default: null
  }
})

const tree = ref(null)
const loading = ref(false)

const flatten = (node) => [node, ...node.children.flatMap(flatten)]

const assignSprites = (node, sprites, fallback = null) => {
  node.sprite = sprites.get(node.pokemonId) || fallback
  node.children.forEach((child) => assignSprites(child, sprites, node.sprite))
}

let latestLoad = 0

const load = async (chainId) => {
  const loadId = ++latestLoad
  const root = getEvolutionTree(chainId)

  if (!root) {
    tree.value = null
    return
  }

  loading.value = true

  const ids = [...new Set(flatten(root).map((n) => n.pokemonId))]
  const urls = await Promise.all(
      ids.map((id) =>
          fetchSprites(id)
              .then((s) => s.official || s.default)
              .catch(() => null)
      )
  )

  if (loadId !== latestLoad) return

  assignSprites(root, new Map(ids.map((id, i) => [id, urls[i]])))
  tree.value = root
  loading.value = false
}

watch(() => props.evolutionChainId, load, { immediate: true })
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

/* Deep chains scroll sideways on narrow screens instead of squashing */
.evolution-scroll {
  overflow-x: auto;
  padding: 1rem 0;
}

.evolution-tree {
  width: max-content;
  margin: 0 auto;
}
</style>
