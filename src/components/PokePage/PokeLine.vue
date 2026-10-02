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

    <!-- Regional lines sit apart so the main chart reads as Scarlet/Violet evolution -->
    <div v-if="!loading && regional.length" class="regional-variants">
      <h4 class="regional-title">Regional variants</h4>

      <div v-for="group in regional" :key="group.region" class="regional-group">
        <span class="regional-label">{{ group.label }}</span>

        <div class="evolution-scroll">
          <div class="evolution-tree regional-roots">
            <EvolutionNode
                v-for="root in group.roots"
                :key="root.key"
                :node="root"
                :current-id="currentId"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { fetchSprites, getEvolutionTree, getRegionalVariants } from '@/composables/usePokeApi'
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
const regional = ref([])
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
  const groups = getRegionalVariants(chainId)

  if (!root) {
    tree.value = null
    regional.value = []
    return
  }

  loading.value = true

  const allRoots = [root, ...groups.flatMap((g) => g.roots)]
  const ids = [...new Set(allRoots.flatMap(flatten).map((n) => n.pokemonId))]
  const urls = await Promise.all(
      ids.map((id) =>
          fetchSprites(id)
              .then((s) => s.official || s.default)
              .catch(() => null)
      )
  )

  if (loadId !== latestLoad) return

  const sprites = new Map(ids.map((id, i) => [id, urls[i]]))
  allRoots.forEach((r) => assignSprites(r, sprites))
  tree.value = root
  regional.value = groups
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

.regional-variants {
  margin-top: 1rem;
  padding: 0.75rem 1.25rem;
  border: 1px dashed #ced4da;
  border-radius: 12px;
  background-color: #fafbfc;
}

.regional-title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.regional-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.regional-group + .regional-group {
  border-top: 1px solid #e9ecef;
}

.regional-label {
  flex-shrink: 0;
  width: 84px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #dc3545;
}

.regional-group .evolution-scroll {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0;
}

/* A region can hold several separate lines (Paldean Tauros has three breeds) */
.regional-roots {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

@media (max-width: 576px) {
  .regional-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }
}
</style>
