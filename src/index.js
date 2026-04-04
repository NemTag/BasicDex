export * from "@/main.js";
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/components/views/Home.vue'
import PokePage from '@/components/PokePage/PokePage.vue'

const routes = [
    { path: '/', name: 'home', component: Home },
    { path: '/pokemon/:name', name: 'details', component: PokePage }
]

export default createRouter({
    history: createWebHistory('/'),
    routes
})