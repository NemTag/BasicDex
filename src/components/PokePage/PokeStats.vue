<template>
  <section class="stats-section mt-5">
    <h3 class="section-title">Base Stats</h3>

    <div class="stat-list">
      <div
          v-for="stat in stats"
          :key="stat.name"
          class="stat-row"
      >
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">{{ stat.base }}</span>
        <div class="stat-bar-track">
          <div
              class="stat-bar-fill"
              :style="{
              width: (stat.base / statMax) * 100 + '%',
              backgroundColor: statColor(stat.base)
            }"
          ></div>
        </div>
      </div>

      <div class="stat-row total-row">
        <span class="stat-label">Total</span>
        <span class="stat-value stat-total">{{ statTotal }}</span>
        <div class="stat-bar-track"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Array,
    required: true
  }
})

const statMax = computed(() =>
    Math.max(255, ...props.stats.map((s) => s.base))
)

const statTotal = computed(() =>
    props.stats.reduce((sum, s) => sum + s.base, 0)
)

const statColor = (value) => {
  if (value < 30) return '#f34444'
  if (value < 60) return '#ff7f0f'
  if (value < 90) return '#ffdd57'
  if (value < 120) return '#a0e515'
  if (value < 150) return '#23cd5e'
  return '#00c2b8'
}
</script>

<style scoped>
.stats-section {
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

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.stat-label {
  font-weight: 600;
  min-width: 40px;
  color: #2c3e50;
  font-size: 0.92rem;
}

.stat-value {
  min-width: 36px;
  text-align: right;
  font-weight: 600;
  font-size: 0.92rem;
  color: #555;
}

.stat-bar-track {
  flex: 1;
  height: 14px;
  background-color: #e9ecef;
  border-radius: 7px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.6s ease;
}

.total-row {
  margin-top: 0.3rem;
  padding-top: 0.5rem;
  border-top: 1px solid #dee2e6;
}

.stat-total {
  font-weight: 700;
  color: #2c3e50;
}
</style>