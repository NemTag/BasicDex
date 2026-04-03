import pokemonData from '@/data/json/pokemon.json'
import abilitiesData from '@/data/json/abilities.json'
import movesData from '@/data/json/moves.json'
import pokemonMovesData from '@/data/json/pokemon_moves.json'
import evolutionData from '@/data/json/evolution.json'
import formsData from '@/data/json/forms.json'

const API_BASE_URL = 'https://pokeapi.co/api/v2'

// Sprite cache — only network calls left
const spriteCache = new Map()
const pending = new Map()

const STAT_LABELS = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense': 'SpD',
    speed: 'Spe'
}

/**
 * Fetch sprite URLs for a pokemon by ID.
 * This is the only network call we still make.
 */
const fetchSprites = async (idOrName) => {
    const url = `${API_BASE_URL}/pokemon/${idOrName}`

    if (spriteCache.has(url)) return spriteCache.get(url)
    if (pending.has(url)) return pending.get(url)

    const request = fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
        })
        .then((data) => {
            const sprites = {
                official: data.sprites?.other?.['official-artwork']?.front_default || null,
                default: data.sprites?.front_default || null
            }
            spriteCache.set(url, sprites)
            pending.delete(url)
            return sprites
        })
        .catch((err) => {
            pending.delete(url)
            throw err
        })

    pending.set(url, request)
    return request
}

/**
 * Look up a pokemon by name from local data.
 */
const getPokemon = (name) => {
    const key = name.toLowerCase()
    return pokemonData[key] || null
}

/**
 * Get all pokemon names for search suggestions.
 */
const getAllPokemonNames = () => Object.keys(pokemonData)

/**
 * Get abilities for a pokemon by its ID.
 */
const getAbilities = (pokemonId) => {
    const entries = abilitiesData[String(pokemonId)]
    if (!entries) return []

    return entries.map((a) => ({
        name: a.name
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        effect: a.effect,
        is_hidden: a.is_hidden
    }))
}

/**
 * Get moves for a pokemon by its ID.
 */
const getMoves = (pokemonId) => {
    const moveIds = pokemonMovesData[String(pokemonId)]
    if (!moveIds) return []

    return moveIds
        .map((id) => {
            const m = movesData[String(id)]
            if (!m) return null

            return {
                name: m.name
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                type: m.type,
                power: m.power,
                accuracy: m.accuracy,
                damage_class: m.damage_class,
                effect: m.effect
            }
        })
        .filter(Boolean)
}

/**
 * Get the evolution chain for a pokemon.
 * Returns an array of stages with trigger info.
 */
const getEvolutionChain = (evolutionChainId) => {
    const chain = evolutionData[String(evolutionChainId)]
    if (!chain) return []

    return chain.map((stage) => {
        let triggerLabel = null

        if (stage.details) {
            const d = stage.details

            if (d.trigger === 'level-up' && d.min_level) {
                triggerLabel = `↑ Lv. ${d.min_level}`
            } else if (d.trigger === 'level-up' && d.min_happiness) {
                triggerLabel = `↑ Happiness ${d.min_happiness}`
            } else if (d.trigger === 'level-up' && d.min_beauty) {
                triggerLabel = `↑ Beauty ${d.min_beauty}`
            } else if (d.trigger === 'level-up' && d.min_affection) {
                triggerLabel = `↑ Affection ${d.min_affection}`
            } else if (d.trigger === 'level-up' && d.needs_overworld_rain) {
                triggerLabel = '↑ Rain'
            } else if (d.trigger === 'level-up') {
                triggerLabel = '↑ Level Up'
            } else {
                triggerLabel = `↑ ${d.trigger.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
            }
        }

        return {
            id: stage.id,
            name: stage.name,
            displayName: stage.name
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' '),
            triggerLabel,
            evolves_from: stage.evolves_from
        }
    })
}

/**
 * Get mega/gmax forms for a pokemon by its species ID.
 */
const getForms = (speciesId) => {
    const entries = formsData[String(speciesId)]
    if (!entries) return []

    return entries
        .filter((f) => f.is_mega || f.is_gmax)
        .map((f) => ({
            name: f.name,
            pokemon_id: f.pokemon_id,
            displayName: f.display_name,
            is_mega: f.is_mega,
            is_gmax: f.is_gmax,
            triggerLabel: f.is_mega ? '↑ Mega Evolution' : '↑ Gigantamax'
        }))
}

/**
 * Build full pokemon detail object — local data + sprite fetch.
 */
const getFullPokemon = async (name) => {
    const pokemon = getPokemon(name)
    if (!pokemon) return null

    const sprites = await fetchSprites(pokemon.id)

    return {
        id: pokemon.id,
        name: pokemon.name
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        dexNumber: String(pokemon.id).padStart(4, '0'),
        types: pokemon.types,
        generation: pokemon.generation,
        evolution_chain_id: pokemon.evolution_chain_id,
        sprite: sprites.official || sprites.default,
        stats: pokemon.stats.map((s) => ({
            name: s.name,
            label: STAT_LABELS[s.name] || s.name,
            base: s.base
        })),
        abilities: getAbilities(pokemon.id),
        moves: getMoves(pokemon.id)
    }
}

export {
    API_BASE_URL,
    fetchSprites,
    getPokemon,
    getAllPokemonNames,
    getAbilities,
    getMoves,
    getEvolutionChain,
    getForms,
    getFullPokemon
}