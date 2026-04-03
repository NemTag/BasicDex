<template>
  <section class="moves-section mt-5">
    <h3 class="section-title">Moves</h3>

    <div class="moves-table-wrapper">
      <table class="moves-table">
        <thead>
        <tr>
          <th class="sortable" @click="toggleSort('name')">
            Name <span class="sort-icon">{{ sortIndicator('name') }}</span>
          </th>
          <th class="type-filter-header">
            <select
                class="type-filter-select"
                :value="activeTypeFilter || ''"
                @change="onTypeFilterChange"
            >
              <option value="">All ({{ moves.length }})</option>
              <option
                  v-for="t in uniqueMoveTypes"
                  :key="t.type"
                  :value="t.type"
              >
                {{ t.type.charAt(0).toUpperCase() + t.type.slice(1) }} ({{ t.count }})
              </option>
            </select>
          </th>
          <th class="sortable" @click="toggleSort('power')">
            Power <span class="sort-icon">{{ sortIndicator('power') }}</span>
          </th>
          <th>Accuracy</th>
          <th>Class</th>
          <th>Effect</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="move in paginatedMoves" :key="move.name">
          <td class="move-name">{{ move.name }}</td>
          <td>
              <span class="badge type-badge" :class="`type-${move.type}`">
                {{ move.type }}
              </span>
          </td>
          <td>{{ move.power ?? '—' }}</td>
          <td>{{ move.accuracy ? move.accuracy + '%' : '—' }}</td>
          <td>
              <span
                  class="damage-class-badge"
                  :class="`dc-${move.damage_class}`"
              >
                <span class="dc-icon" v-if="move.damage_class === 'physical'">💥</span>
                <span class="dc-icon" v-else-if="move.damage_class === 'special'">✦</span>
                <span class="dc-icon" v-else>◉</span>
                {{ move.damage_class }}
              </span>
          </td>
          <td class="move-effect">{{ move.effect }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination-controls mt-3">
      <button
          class="btn btn-sm btn-outline-secondary"
          :disabled="currentPage === 1"
          @click="currentPage--"
      >
        ← Prev
      </button>

      <span class="page-info">
        Page {{ currentPage }} of {{ totalPages }}
      </span>

      <button
          class="btn btn-sm btn-outline-secondary"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
      >
        Next →
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  moves: {
    type: Array,
    required: true
  }
})

const currentPage = ref(1)
const perPage = 20

const sortField = ref(null)
const sortDirection = ref(null)
const activeTypeFilter = ref(null)

const uniqueMoveTypes = computed(() => {
  const typeCounts = {}
  props.moves.forEach((m) => {
    typeCounts[m.type] = (typeCounts[m.type] || 0) + 1
  })
  return Object.entries(typeCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => ({ type, count }))
})

const filteredAndSortedMoves = computed(() => {
  let result = [...props.moves]

  if (activeTypeFilter.value) {
    result = result.filter((m) => m.type === activeTypeFilter.value)
  }

  if (sortField.value && sortDirection.value) {
    result.sort((a, b) => {
      if (sortField.value === 'name') {
        return sortDirection.value === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
      }

      if (sortField.value === 'power') {
        const aVal = a.power ?? -1
        const bVal = b.power ?? -1
        return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }

  return result
})

const paginatedMoves = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredAndSortedMoves.value.slice(start, start + perPage)
})

const totalPages = computed(() =>
    Math.ceil(filteredAndSortedMoves.value.length / perPage)
)

const toggleSort = (field) => {
  if (sortField.value === field) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc'
    else if (sortDirection.value === 'desc') { sortField.value = null; sortDirection.value = null }
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
  currentPage.value = 1
}

const onTypeFilterChange = (e) => {
  activeTypeFilter.value = e.target.value || null
  currentPage.value = 1
}

const sortIndicator = (field) => {
  if (sortField.value !== field) return '⇅'
  return sortDirection.value === 'asc' ? '↑' : '↓'
}
</script>

<style scoped>
.moves-section {
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

.moves-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.moves-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.moves-table thead th {
  background-color: #2c3e50;
  color: white;
  padding: 0.6rem 0.8rem;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}

.moves-table tbody tr {
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.15s ease;
}

.moves-table tbody tr:hover {
  background-color: #f8f9fa;
}

.moves-table td {
  padding: 0.5rem 0.8rem;
  vertical-align: middle;
}

.move-name {
  font-weight: 600;
  white-space: nowrap;
  color: #2c3e50;
}

.move-effect {
  color: #555;
  font-size: 0.85rem;
  line-height: 1.4;
  max-width: 320px;
}

.type-badge {
  font-size: 0.9rem;
  padding: 0.35rem 0.9rem;
  border-radius: 16px;
  color: white;
  text-transform: capitalize;
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

.damage-class-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  color: white;
}

.dc-physical { background-color: #c92112; }
.dc-special { background-color: #4f5abb; }
.dc-status { background-color: #737373; }

.dc-icon {
  font-size: 0.75rem;
}

/* Sortable Headers */
.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}

.sortable:hover {
  background-color: #3a4f63;
}

.sort-icon {
  font-size: 0.75rem;
  margin-left: 0.3rem;
  opacity: 0.8;
}

/* Type Filter Dropdown */
.type-filter-header {
  padding: 0.3rem 0.4rem !important;
}

.type-filter-select {
  background-color: #3a4f63;
  color: white;
  border: 1px solid #5a7a96;
  border-radius: 6px;
  padding: 0.25rem 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.type-filter-select:focus {
  outline: none;
  border-color: #dc3545;
}

/* Pagination */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.page-info {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
}
</style>