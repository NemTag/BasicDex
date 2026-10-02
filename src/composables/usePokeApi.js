import pokemonData from '@/data/json/pokemon.json'
import abilitiesData from '@/data/json/abilities.json'
import movesData from '@/data/json/moves.json'
import pokemonMovesData from '@/data/json/pokemon_moves.json'
import evolutionData from '@/data/json/evolution.json'
import formsData from '@/data/json/forms.json'

const API_BASE_URL = '/api'

// Sprite cache — only network calls left
// ponytail: cached signed URLs expire after an hour (see getSprite); add a TTL here if sessions run longer
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
    const url = `${API_BASE_URL}/pokemon/${idOrName}/sprite`

    if (spriteCache.has(url)) return spriteCache.get(url)
    if (pending.has(url)) return pending.get(url)

    const request = fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
        })
        .then((data) => {
            const sprites = {
                official: data.url,
                default: null
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

const titleCase = (identifier) =>
    identifier
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

const TIME_OF_DAY = { day: 'during the day', night: 'at night', dusk: 'at dusk' }
const RELATIVE_STATS = { 1: 'Atk > Def', 0: 'Atk = Def', '-1': 'Atk < Def' }
const MOVE_STYLES = { 'agile-style-move': ' (agile style)', 'strong-style-move': ' (strong style)' }

/**
 * Turn one evolution method from evolution.json into a short label,
 * e.g. "Lv. 20, Atk > Def" or "Dawn Stone, ♀".
 */
const formatEvolutionMethod = (m) => {
    let head
    switch (m.trigger) {
        case 'level-up':
            head = m.min_level ? `Lv. ${m.min_level}` : 'Level up'
            break
        case 'use-item':
            head = m.item
            break
        case 'trade':
            head = 'Trade'
            break
        case 'use-move':
        case 'agile-style-move':
        case 'strong-style-move':
            head = `${titleCase(m.used_move)} ×${m.min_move_count}${MOVE_STYLES[m.trigger] || ''}`
            break
        case 'take-damage':
            head = `Take ${m.min_damage_taken} damage, then pass the stone arch`
            break
        case 'recoil-damage':
            head = `Take ${m.min_damage_taken} recoil damage`
            break
        default:
            head = m.trigger_label || titleCase(m.trigger)
    }

    const conditions = [
        m.min_happiness && `Happiness ${m.min_happiness}`,
        m.min_beauty && `Beauty ${m.min_beauty}`,
        m.min_affection && `Affection ${m.min_affection}`,
        m.held_item && `holding ${m.held_item}`,
        m.known_move && `knowing ${titleCase(m.known_move)}`,
        m.known_move_type && `knowing a ${titleCase(m.known_move_type)} move`,
        m.location && `at ${m.location}`,
        m.time_of_day && TIME_OF_DAY[m.time_of_day],
        m.gender === 'female' && '♀',
        m.gender === 'male' && '♂',
        m.relative_physical_stats !== undefined && RELATIVE_STATS[m.relative_physical_stats],
        m.party_species && `with ${titleCase(m.party_species)} in party`,
        m.party_type && `with a ${titleCase(m.party_type)} type in party`,
        m.trade_species && `for ${titleCase(m.trade_species)}`,
        m.needs_overworld_rain && 'in rain',
        m.turn_upside_down && 'console upside down',
        m.min_steps && `after ${m.min_steps} steps`
    ].filter(Boolean)

    // A phrase straight after the head reads as one clause ("Level up at Mt. Coronet");
    // everything else is comma-separated ("Lv. 20, Atk > Def")
    return conditions.reduce(
        (label, c, i) => label + (i === 0 && /^[a-z]/.test(c) ? ' ' : ', ') + c,
        head
    )
}

/**
 * Labels for every way a species evolves. Methods that differ only by
 * location (Magnezone has five) collapse into one label; the full list
 * goes in `detail` for a tooltip.
 */
const formatEvolutionMethods = (methods) => {
    const groups = new Map()

    for (const m of methods) {
        const { location, ...rest } = m
        const key = JSON.stringify(rest)
        if (!groups.has(key)) groups.set(key, { method: rest, locations: [] })
        if (location) groups.get(key).locations.push(location)
    }

    return [...groups.values()].map(({ method, locations }) => {
        if (locations.length <= 1) {
            return { text: formatEvolutionMethod({ ...method, location: locations[0] }), detail: null }
        }

        const others = locations.length - 1
        return {
            text: `${formatEvolutionMethod({ ...method, location: locations[0] })} or ${others} other place${others > 1 ? 's' : ''}`,
            detail: locations.join(', ')
        }
    })
}

/**
 * Build the evolution chain as a tree. Each node:
 *   { key, pokemonId, name, displayName, kind: 'species' | 'mega' | 'gmax', methods, children }
 * `methods` are the labels for how the parent becomes this node. Mega and
 * Gigantamax forms hang off their species as leaf nodes, since they don't evolve further.
 */
const getEvolutionTree = (evolutionChainId) => {
    const chain = evolutionData[String(evolutionChainId)]
    if (!chain?.length) return null

    const nodes = new Map(
        chain.map((stage) => [stage.id, {
            key: stage.name,
            pokemonId: stage.id,
            name: stage.name,
            displayName: titleCase(stage.name),
            kind: 'species',
            methods: formatEvolutionMethods(stage.methods),
            children: []
        }])
    )

    let root = null
    for (const stage of chain) {
        const node = nodes.get(stage.id)
        const parent = nodes.get(stage.evolves_from)

        if (parent) parent.children.push(node)
        else root ??= node
    }

    // Forms go after evolutions so the main line reads first
    for (const node of nodes.values()) {
        for (const form of getForms(node.pokemonId)) {
            node.children.push({
                key: form.name,
                pokemonId: form.pokemon_id,
                name: form.name,
                displayName: form.displayName,
                kind: form.is_mega ? 'mega' : 'gmax',
                methods: [{ text: form.is_mega ? 'Mega Evolution' : 'Gigantamax', detail: null }],
                children: []
            })
        }
    }

    return root
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
            displayName: f.display_name || titleCase(f.name),
            is_mega: f.is_mega,
            is_gmax: f.is_gmax
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
    getEvolutionTree,
    getForms,
    getFullPokemon
}