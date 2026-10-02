import pokemonData from '@/data/json/pokemon.json'
import abilitiesData from '@/data/json/abilities.json'
import movesData from '@/data/json/moves.json'
import pokemonMovesData from '@/data/json/pokemon_moves.json'
import evolutionData from '@/data/json/evolution.json'
import formsData from '@/data/json/forms.json'
import regionalData from '@/data/json/regional.json'

const API_BASE_URL = '/api'

const pokemonNameById = Object.fromEntries(
    Object.values(pokemonData).map((p) => [p.id, p.name])
)

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
        case 'other': // only Maushold: "Level up in battle" at Lv. 25
            head = m.min_level ? `Lv. ${m.min_level} in battle` : m.trigger_label
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
        m.min_steps && `after ${m.min_steps} steps`,
        m.region && `in ${m.region}`,
        m.note
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
 * goes in `detail` for a tooltip. Otherwise `detail` is the method's
 * `note_detail` (Toxtricity's nature list), if any.
 */
const formatEvolutionMethods = (methods) => {
    const groups = new Map()

    for (const m of methods) {
        const { location, note_detail, ...rest } = m
        const key = JSON.stringify(rest)
        if (!groups.has(key)) groups.set(key, { method: rest, locations: [], noteDetail: note_detail })
        if (location) groups.get(key).locations.push(location)
    }

    return [...groups.values()].map(({ method, locations, noteDetail }) => {
        if (locations.length <= 1) {
            return {
                text: formatEvolutionMethod({ ...method, location: locations[0] }),
                detail: noteDetail || null
            }
        }

        const others = locations.length - 1
        return {
            text: `${formatEvolutionMethod({ ...method, location: locations[0] })} or ${others} other place${others > 1 ? 's' : ''}`,
            detail: locations.join(', ')
        }
    })
}

/**
 * For species whose form is settled on evolving (see FORM_EVOLUTIONS in
 * build.js): one { node, from } per variant. The default form's variant
 * reuses `node`, setting its methods and form label ("Single Strike
 * Style"); every other variant gets its own node ("Rapid Strike Urshifu").
 * `from` is the Pokémon ID of the form it evolves from, if any.
 */
const variantNodes = (stage, node) => {
    if (!stage.variants) return []

    const forms = getForms(stage.id)
    const formFor = (pokemonId) => forms.find((f) => f.pokemon_id === pokemonId)

    return stage.variants.map((variant) => {
        const methods = formatEvolutionMethods(variant.methods)
        const from = variant.from_pokemon_id ?? null

        if (variant.pokemon_id === node.pokemonId) {
            node.methods = methods
            node.formLabel = formFor(variant.pokemon_id)?.formLabel
            return { node, from }
        }

        return {
            node: {
                key: variant.name,
                pokemonId: variant.pokemon_id,
                name: variant.name,
                slug: variant.name,
                displayName: formFor(variant.pokemon_id)?.displayName || titleCase(variant.name),
                kind: 'species',
                methods,
                children: []
            },
            from
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
    // Species that only evolve from a regional form (Perrserker) are drawn
    // in the regional section instead; see getRegionalVariants
    const chain = evolutionData[String(evolutionChainId)]?.filter((s) => !s.regional_only)
    if (!chain?.length) return null

    const nodes = new Map(
        chain.map((stage) => [stage.id, {
            key: stage.name,
            pokemonId: stage.id,
            name: stage.name,
            // pokemon.json key; differs from the species name for 37
            // species (lycanroc → lycanroc-midday)
            slug: pokemonNameById[stage.id] || stage.name,
            displayName: titleCase(stage.name),
            kind: 'species',
            methods: formatEvolutionMethods(stage.methods),
            children: []
        }])
    )

    // Every node by Pokémon ID, forms included, so a variant can hang
    // off the form it evolves from (Small Pumpkaboo → Small Gourgeist)
    const byPokemonId = new Map(nodes)

    // Forms that are evolution results get their own branch, so they're
    // left out of the form branches below
    const variantIds = new Set(
        chain.flatMap((s) => (s.variants || []).map((v) => v.pokemon_id))
    )

    const variantsByStage = new Map()
    for (const stage of chain) {
        const variants = variantNodes(stage, nodes.get(stage.id))
        variantsByStage.set(stage.id, variants)
        for (const { node } of variants) byPokemonId.set(node.pokemonId, node)
    }

    for (const node of nodes.values()) {
        const forms = getForms(node.pokemonId)
        // A form belongs to the variant whose name it extends
        // (urshifu-rapid-strike-gmax → Rapid Strike Urshifu)
        const owners = [node, ...variantsByStage.get(node.pokemonId).map((v) => v.node)]

        for (const form of forms) {
            if (!TREE_FORMS[form.category] || variantIds.has(form.pokemon_id)) continue

            const owner = owners
                .filter((o) => form.name.startsWith(`${o.slug}-`))
                .sort((a, b) => b.slug.length - a.slug.length)[0] || node

            const formNode = {
                key: form.name,
                pokemonId: form.pokemon_id,
                name: form.name,
                slug: form.name,
                displayName: form.displayName,
                kind: form.category,
                methods: [{ text: formMethodLabel(form), detail: null }],
                children: []
            }

            owner.children.push(formNode)
            byPokemonId.set(form.pokemon_id, formNode)
        }

        // Next to Blade Aegislash, plain "Aegislash" needs its own
        // form name ("Shield Forme")
        const defaultForm = forms.find((f) => f.category === 'default')
        const switchable = node.children.some((c) => c.kind === 'battle' || c.kind === 'alternate')
        if (switchable && defaultForm?.formLabel && defaultForm.formLabel !== node.displayName) {
            node.formLabel = defaultForm.formLabel
        }
    }

    let root = null
    for (const stage of chain) {
        const node = nodes.get(stage.id)
        const parent = byPokemonId.get(stage.evolves_from)

        if (!parent) {
            root ??= node
            continue
        }

        const variants = variantsByStage.get(stage.id)
        const branches = variants.length ? variants : [{ node, from: null }]

        for (const branch of branches) {
            (byPokemonId.get(branch.from) || parent).children.push(branch.node)
        }
    }

    // Evolutions before forms, so the main line reads first
    for (const n of byPokemonId.values()) {
        n.children.sort((a, b) => (a.kind !== 'species') - (b.kind !== 'species'))
    }

    return root
}

const REGIONS = { alola: 'Alolan', galar: 'Galarian', hisui: 'Hisuian', paldea: 'Paldean' }

/**
 * Card name for any Pokémon: a form's own name ("Alolan Raichu"),
 * otherwise its species' ("Perrserker").
 */
const describePokemon = (pokemonId) => {
    const slug = pokemonNameById[pokemonId]
    const pokemon = pokemonData[slug]
    const form = getForms(pokemon.species_id).find((f) => f.pokemon_id === pokemonId)

    return {
        slug,
        displayName: form && form.category !== 'default' ? form.displayName : titleCase(pokemon.species_name)
    }
}

/**
 * Regional lines for an evolution chain, one group per region:
 *   [{ region, label: 'Alolan', roots: [node] }]
 * Nodes have the same shape as getEvolutionTree's. A line that branches off a
 * regular Pokémon (Pikachu → Alolan Raichu) starts from that Pokémon's card.
 */
const getRegionalVariants = (evolutionChainId) => {
    const groups = regionalData[String(evolutionChainId)]
    if (!groups) return []

    return Object.keys(REGIONS)
        .filter((region) => groups[region])
        .map((region) => {
            const { pokemon, edges } = groups[region]
            const nodes = new Map(pokemon.map((id) => {
                const { slug, displayName } = describePokemon(id)
                return [id, { key: slug, pokemonId: id, name: slug, slug, displayName, kind: 'species', methods: [], children: [] }]
            }))

            const hasParent = new Set()
            for (const edge of edges) {
                const child = nodes.get(edge.to)
                if (edge.kind === 'battle') {
                    child.kind = 'battle'
                    child.methods = [{ text: TREE_FORMS.battle, detail: null }]
                } else {
                    child.methods = formatEvolutionMethods(edge.methods)
                }

                nodes.get(edge.from).children.push(child)
                hasParent.add(edge.to)
            }

            return {
                region,
                label: REGIONS[region],
                roots: [...nodes.values()].filter((n) => !hasParent.has(n.pokemonId))
            }
        })
}

// Form categories (from build.js) that get a branch in the evolution
// chart. Regional and cosmetic forms are left out for now.
const TREE_FORMS = {
    mega: 'Mega Evolution',
    gmax: 'Gigantamax',
    battle: 'In battle',
    alternate: 'Alternate form'
}

const formMethodLabel = (form) => {
    if (form.name.endsWith('-primal')) return 'Primal Reversion'
    if (form.name.endsWith('-female')) return '♀ form'
    return TREE_FORMS[form.category]
}

/**
 * Get every form of a species (default included), each tagged with a
 * category: default, mega, gmax, battle, alternate, regional or cosmetic.
 */
const getForms = (speciesId) => {
    const entries = formsData[String(speciesId)]
    if (!entries) return []

    return entries.map((f) => ({
        name: f.name,
        pokemon_id: f.pokemon_id,
        displayName: f.display_name || titleCase(f.name),
        formLabel: f.form_label,
        category: f.category
    }))
}

/**
 * Build full pokemon detail object — local data + sprite fetch.
 */
const getFullPokemon = async (name) => {
    const pokemon = getPokemon(name)
    if (!pokemon) return null

    const sprites = await fetchSprites(pokemon.id)
    // Megas and Gigantamax forms always use their base form's moves
    const form = getForms(pokemon.species_id).find((f) => f.pokemon_id === pokemon.id)
    const usesBaseMoves = ['mega', 'gmax'].includes(form?.category)
    const moves = usesBaseMoves ? [] : getMoves(pokemon.id)

    return {
        id: pokemon.id,
        name: pokemon.name
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        // Forms have their own IDs (Blade Aegislash is 10026); the dex
        // number belongs to the species
        dexNumber: String(pokemon.species_id).padStart(4, '0'),
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
        moves: moves.length ? moves : getMoves(pokemon.species_id)
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
    getRegionalVariants,
    getForms,
    getFullPokemon
}