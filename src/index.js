export * from "@/main.js";
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/components/views/Home.vue'
import PokePage from '@/components/PokePage/PokePage.vue'
import Gate from '@/components/views/Gate.vue'

const routes = [
    { path: '/', name: 'home', component: Home },
    { path: '/pokemon/:name', name: 'details', component: PokePage },
    { path: '/gate', name: 'gate', component: Gate }
]

const router = createRouter({
    history: createWebHistory('/'),
    routes,
    // Back/forward restores the old position; new pages start at the top
    scrollBehavior: (to, from, savedPosition) => savedPosition || { top: 0 }
})

router.beforeEach((to) => {
    if (to.name === 'gate') return
    if (Number(localStorage.getItem('gatePassedUntil')) > Date.now()) return

    return { name: 'gate', query: { redirect: to.fullPath } }
})

export default router