<template>
  <div class="evo-node">
    <div
        class="evo-card"
        :class="[`kind-${node.kind}`, { current: node.pokemonId === currentId }]"
    >
      <img
          v-if="node.sprite"
          :src="node.sprite"
          :alt="node.displayName"
          class="evo-sprite"
      />
      <div v-else class="evo-sprite evo-sprite-missing">?</div>
      <span class="evo-name">{{ node.displayName }}</span>
    </div>

    <!-- One branch per evolution / form; the spine on the left joins them -->
    <div v-if="node.children.length" class="evo-children">
      <div
          v-for="child in node.children"
          :key="child.key"
          class="evo-branch"
          :class="`kind-${child.kind}`"
      >
        <div class="evo-edge">
          <span
              v-for="method in child.methods"
              :key="method.text"
              class="evo-method"
              :title="method.detail"
          >
            {{ method.text }}
          </span>
        </div>

        <EvolutionNode :node="child" :current-id="currentId" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  node: {
    type: Object,
    required: true
  },
  currentId: {
    type: Number,
    default: null
  }
})
</script>

<style scoped>
.evo-node {
  --evo-line: #ced4da;
  --evo-stub: 16px;

  display: flex;
  align-items: center;
}

/* Card */
.evo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  width: 104px;
  padding: 0.4rem 0.3rem;
  border-radius: 12px;
  border: 2px solid transparent;
  flex-shrink: 0;
}

.evo-card.current {
  background-color: #fce4e6;
  border-color: #dc3545;
}

.evo-sprite {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.15));
  transition: transform 0.2s ease;
}

.evo-sprite:hover {
  transform: scale(1.1);
}

.evo-sprite-missing {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #e9ecef;
  color: #adb5bd;
  font-size: 2rem;
  font-weight: 700;
  filter: none;
}

.evo-name {
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.2;
  text-align: center;
  color: #2c3e50;
}

/* Children column + connectors */
.evo-children {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-left: var(--evo-stub);
}

/* Stub from the parent card to the spine */
.evo-children::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: var(--evo-stub);
  border-top: 2px solid var(--evo-line);
}

.evo-branch {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.3rem 0;
}

/* Vertical spine: runs from the first branch's centre to the last's */
.evo-branch::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-left: 2px solid var(--evo-line);
}

.evo-branch:first-child::before { top: 50%; }
.evo-branch:last-child::before { bottom: 50%; }
.evo-branch:only-child::before { display: none; }

/* Arrow with the method labels sitting on it */
.evo-edge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 132px;
  flex-shrink: 0;
  padding: 0 14px 0 6px;
}

.evo-edge::before {
  content: '';
  position: absolute;
  left: 0;
  right: 8px;
  top: 50%;
  border-top: 2px solid var(--evo-edge-color, #dc3545);
}

.evo-edge::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  border-style: solid;
  border-width: 6px 0 6px 10px;
  border-color: transparent transparent transparent var(--evo-edge-color, #dc3545);
}

.evo-method {
  position: relative;
  max-width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  color: #555;
  background-color: #f0f0f5;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}

.evo-method[title] {
  cursor: help;
  text-decoration: underline dotted;
}

/* Forms: dashed arrow, so they read as a side state rather than an evolution */
.evo-branch.kind-mega,
.evo-branch.kind-gmax {
  --evo-edge-color: #6f42c1;
}

.evo-branch.kind-gmax {
  --evo-edge-color: #d63384;
}

.evo-branch.kind-mega > .evo-edge::before,
.evo-branch.kind-gmax > .evo-edge::before {
  border-top-style: dashed;
}

.evo-branch.kind-mega > .evo-edge > .evo-method {
  background-color: #efe8fa;
  color: #6f42c1;
}

.evo-branch.kind-gmax > .evo-edge > .evo-method {
  background-color: #fbe6f1;
  color: #d63384;
}
</style>
