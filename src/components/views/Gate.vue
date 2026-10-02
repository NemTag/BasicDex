<template>
  <main class="container d-flex flex-column align-items-center mt-5">
    <h2 class="mb-3">Who's that Pokémon?</h2>

    <!-- Loading Spinner -->
    <div v-if="loading" class="spinner-border text-danger mb-4" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>

    <!-- Mystery Sprite -->
    <img
        v-else-if="challenge"
        :src="challenge.image"
        alt="Mystery Pokémon"
        class="gate-sprite mb-4"
    />

    <!-- Error Message -->
    <div v-if="error" class="alert alert-danger mb-4" role="alert">
      {{ error }}
    </div>

    <!-- Answer Box -->
    <form class="gate-form" @submit.prevent="submitAnswer">
      <input
          v-model="answer"
          type="text"
          class="form-control gate-input"
          placeholder="It's: "
          :disabled="!challenge"
      />

      <div class="d-flex gap-2 justify-content-center mt-2">
        <button type="submit" class="btn btn-danger" :disabled="!answer.trim() || checking">
          Guess
        </button>
        <button type="button" class="btn btn-outline-secondary" :disabled="loading" @click="loadChallenge">
          New Pokémon
        </button>
      </div>
    </form>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const PASS_MINUTES = 30

const route = useRoute()
const router = useRouter()

const challenge = ref(null)
const answer = ref('')
const error = ref(null)
const loading = ref(false)
const checking = ref(false)

const loadChallenge = async () => {
  loading.value = true
  error.value = null
  answer.value = ''

  try {
    const res = await fetch('/api/challenge')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    challenge.value = await res.json()
  } catch {
    error.value = 'Could not load a Pokémon. Is the backend running?'
  } finally {
    loading.value = false
  }
}

const submitAnswer = async () => {
  checking.value = true
  error.value = null

  try {
    const res = await fetch('/api/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: challenge.value.token, name: answer.value })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const { correct } = await res.json()
    if (correct) {
      localStorage.setItem('gatePassedUntil', Date.now() + PASS_MINUTES * 60 * 1000)
      router.push(route.query.redirect || '/')
    } else {
      error.value = 'Not quite! Try again, or pick a new Pokémon.'
    }
  } catch {
    error.value = 'Could not check your answer.'
  } finally {
    checking.value = false
  }
}

onMounted(loadChallenge)
</script>

<style scoped>
.gate-sprite {
  width: 250px;
  height: 250px;
  object-fit: contain;
}

.gate-form {
  width: 100%;
  max-width: 400px;
}

.gate-input {
  text-align: center;
  font-size: 1.1rem;
  padding: 0.6rem 1rem;
  border-radius: 25px;
  border: 2px solid #dc3545;
}

.gate-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}
</style>
