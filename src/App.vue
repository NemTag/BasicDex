<template>
  <div id="app">
    <header>
      <h1 @click="$router.push('/')" class="header-title">Simple Pokédex</h1>
    </header>

    <router-view />
  </div>
</template>

<script setup>
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  color: #2c3e50;
}

header {
  padding: 1.5rem;
  background-color: #dc3545;
  color: white;
  margin-bottom: 2rem;
}

header .header-title {
  margin: 0;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
}
</style>