/**
 * Processes CSV files into structured JSON for the app.
 * Run with: node data/build.js
 */
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_DIR = join(__dirname, 'csv')
const OUT_DIR = join(__dirname, 'json')
const ENGLISH_LANG_ID = '9'

// --- CSV Parser ---

const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')

    return lines.slice(1).map((line) => {
        const values = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }

        values.push(current.trim())

        const row = {}
        headers.forEach((h, i) => {
            row[h.trim()] = values[i] ?? ''
        })
        return row
    })
}

const loadCSV = async (filename) => {
    const text = await readFile(join(CSV_DIR, filename), 'utf8')
    return parseCSV(text)
}

const writeJSON = async (filename, data) => {
    await writeFile(join(OUT_DIR, filename), JSON.stringify(data), 'utf8')
    console.log(`  ✓ ${filename} (${Array.isArray(data) ? data.length + ' entries' : Object.keys(data).length + ' keys'})`)
}

/**
 * Strips PokeAPI prose markup tags.
 * e.g. "[Special Attack]{mechanic:special-attack}" → "Special Attack"
 *      "[burn]{mechanic:burn}" → "burn"
 */
const cleanProseMarkup = (text) => {
    if (!text) return text
    // [display text]{type:id} → display text
    // []{type:id} → id (empty bracket fallback)
    return text
        .replace(/\[([^\]]+)\]\{[^}]+\}/g, '$1')
        .replace(/\[\]\{[^:]+:([^}]+)\}/g, '$1')
}

// --- Builders ---

const buildPokemon = async () => {
    const pokemon = await loadCSV('pokemon.csv')
    const species = await loadCSV('pokemon_species.csv')
    const stats = await loadCSV('pokemon_stats.csv')
    const types = await loadCSV('pokemon_types.csv')
    const typeNames = await loadCSV('types.csv')
    const statNames = await loadCSV('stats.csv')
    const genNames = await loadCSV('generation_names.csv')

    const typeMap = Object.fromEntries(typeNames.map((t) => [t.id, t.identifier]))
    const statMap = Object.fromEntries(statNames.map((s) => [s.id, s.identifier]))
    const genNameMap = Object.fromEntries(
        genNames
            .filter((g) => g.local_language_id === ENGLISH_LANG_ID)
            .map((g) => [g.generation_id, g.name])
    )

    const speciesMap = Object.fromEntries(
        species.map((s) => [
            s.id,
            {
                generation_id: s.generation_id,
                evolution_chain_id: s.evolution_chain_id,
                identifier: s.identifier
            }
        ])
    )

    const statsByPokemon = {}
    for (const s of stats) {
        if (!statsByPokemon[s.pokemon_id]) statsByPokemon[s.pokemon_id] = []
        statsByPokemon[s.pokemon_id].push({
            name: statMap[s.stat_id] || s.stat_id,
            base: parseInt(s.base_stat, 10)
        })
    }

    const typesByPokemon = {}
    for (const t of types) {
        if (!typesByPokemon[t.pokemon_id]) typesByPokemon[t.pokemon_id] = []
        typesByPokemon[t.pokemon_id].push({
            slot: parseInt(t.slot, 10),
            name: typeMap[t.type_id] || t.type_id
        })
    }

    const result = {}

    for (const p of pokemon) {
        const sp = speciesMap[p.species_id]
        if (!sp) continue

        result[p.identifier] = {
            id: parseInt(p.id, 10),
            name: p.identifier,
            species_id: parseInt(p.species_id, 10),
            species_name: sp.identifier,
            generation: genNameMap[sp.generation_id] || `Generation ${sp.generation_id}`,
            generation_id: parseInt(sp.generation_id, 10),
            evolution_chain_id: parseInt(sp.evolution_chain_id, 10),
            types: (typesByPokemon[p.id] || [])
                .sort((a, b) => a.slot - b.slot)
                .map((t) => t.name),
            stats: statsByPokemon[p.id] || []
        }
    }

    await writeJSON('pokemon.json', result)
    return { speciesMap, genNameMap }
}

const buildAbilities = async () => {
    const abilities = await loadCSV('abilities.csv')
    const prose = await loadCSV('ability_prose.csv')
    const pokemonAbilities = await loadCSV('pokemon_abilities.csv')

    const proseMap = Object.fromEntries(
        prose
            .filter((p) => p.local_language_id === ENGLISH_LANG_ID)
            .map((p) => [p.ability_id, cleanProseMarkup(p.short_effect)])
    )

    const abilityMap = Object.fromEntries(
        abilities.map((a) => [a.id, a.identifier])
    )

    // Group by pokemon_id
    const result = {}

    for (const pa of pokemonAbilities) {
        if (!result[pa.pokemon_id]) result[pa.pokemon_id] = []

        const name = abilityMap[pa.ability_id] || pa.ability_id

        result[pa.pokemon_id].push({
            name,
            effect: proseMap[pa.ability_id] || 'No description available.',
            is_hidden: pa.is_hidden === '1'
        })
    }

    await writeJSON('abilities.json', result)
}

const buildMoves = async () => {
    const moves = await loadCSV('moves.csv')
    const prose = await loadCSV('move_effect_prose.csv')
    const typeNames = await loadCSV('types.csv')
    const damageClasses = await loadCSV('move_damage_classes.csv')

    const typeMap = Object.fromEntries(typeNames.map((t) => [t.id, t.identifier]))
    const classMap = Object.fromEntries(damageClasses.map((d) => [d.id, d.identifier]))

    const proseMap = Object.fromEntries(
        prose
            .filter((p) => p.local_language_id === ENGLISH_LANG_ID)
            .map((p) => [p.move_effect_id, cleanProseMarkup(p.short_effect)])
    )

    const result = {}

    for (const m of moves) {
        let effect = proseMap[m.effect_id] || 'No description available.'

        if (m.effect_chance) {
            effect = effect.replace('$effect_chance', m.effect_chance)
        }

        result[m.id] = {
            id: parseInt(m.id, 10),
            name: m.identifier,
            type: typeMap[m.type_id] || 'unknown',
            power: m.power ? parseInt(m.power, 10) : null,
            accuracy: m.accuracy ? parseInt(m.accuracy, 10) : null,
            damage_class: classMap[m.damage_class_id] || 'status',
            effect,
            effect_chance: m.effect_chance ? parseInt(m.effect_chance, 10) : null
        }
    }

    await writeJSON('moves.json', result)
}

const buildPokemonMoves = async () => {
    const pokemonMoves = await loadCSV('pokemon_moves.csv')

    // Deduplicate: a pokemon can learn the same move via different methods/versions
    const result = {}

    for (const pm of pokemonMoves) {
        if (!result[pm.pokemon_id]) result[pm.pokemon_id] = new Set()
        result[pm.pokemon_id].add(pm.move_id)
    }

    const output = {}
    for (const [pokemonId, moveSet] of Object.entries(result)) {
        output[pokemonId] = [...moveSet].map(Number)
    }

    await writeJSON('pokemon_moves.json', output)
}

const buildEvolution = async () => {
    const evo = await loadCSV('pokemon_evolution.csv')
    const species = await loadCSV('pokemon_species.csv')
    const triggers = await loadCSV('evolution_triggers.csv')
    const triggerProse = await loadCSV('evolution_trigger_prose.csv')
    const itemNames = await loadCSV('item_names.csv')
    const locationNames = await loadCSV('location_names.csv')
    const moves = await loadCSV('moves.csv')
    const typeNames = await loadCSV('types.csv')

    const englishNames = (rows, idKey) => Object.fromEntries(
        rows
            .filter((r) => r.local_language_id === ENGLISH_LANG_ID)
            .map((r) => [r[idKey], r.name])
    )

    const triggerMap = Object.fromEntries(
        triggers.map((t) => [t.id, t.identifier])
    )
    const triggerLabelMap = englishNames(triggerProse, 'evolution_trigger_id')
    const itemMap = englishNames(itemNames, 'item_id')
    const locationMap = englishNames(locationNames, 'location_id')
    const moveMap = Object.fromEntries(moves.map((m) => [m.id, m.identifier]))
    const typeMap = Object.fromEntries(typeNames.map((t) => [t.id, t.identifier]))
    const speciesNameMap = Object.fromEntries(species.map((s) => [s.id, s.identifier]))

    const GENDERS = { 1: 'female', 2: 'male' }
    const int = (v) => (v ? parseInt(v, 10) : null)

    // One row = one way to evolve. Species can have several (e.g. Leafeon: Leaf Stone or Moss Rock).
    // Only truthy conditions are kept so the JSON stays small.
    const toMethod = (e) => {
        const method = {
            trigger: triggerMap[e.evolution_trigger_id] || 'unknown',
            trigger_label: triggerLabelMap[e.evolution_trigger_id] || null,
            min_level: int(e.minimum_level),
            min_happiness: int(e.minimum_happiness),
            min_beauty: int(e.minimum_beauty),
            min_affection: int(e.minimum_affection),
            item: itemMap[e.trigger_item_id] || null,
            held_item: itemMap[e.held_item_id] || null,
            known_move: moveMap[e.known_move_id] || null,
            known_move_type: typeMap[e.known_move_type_id] || null,
            used_move: moveMap[e.used_move_id] || null,
            min_move_count: int(e.minimum_move_count),
            location: locationMap[e.location_id] || null,
            time_of_day: e.time_of_day || null,
            gender: GENDERS[e.gender_id] || null,
            // 1: Atk > Def, -1: Atk < Def, 0: Atk = Def (0 is meaningful, so check for blank)
            relative_physical_stats: e.relative_physical_stats !== '' ? parseInt(e.relative_physical_stats, 10) : null,
            party_species: speciesNameMap[e.party_species_id] || null,
            party_type: typeMap[e.party_type_id] || null,
            trade_species: speciesNameMap[e.trade_species_id] || null,
            needs_overworld_rain: e.needs_overworld_rain === '1',
            turn_upside_down: e.turn_upside_down === '1',
            min_steps: int(e.minimum_steps),
            min_damage_taken: int(e.minimum_damage_taken)
        }

        return Object.fromEntries(
            Object.entries(method).filter(([, v]) => v !== null && v !== false)
        )
    }

    const speciesChainMap = {}
    for (const s of species) {
        if (!speciesChainMap[s.evolution_chain_id]) {
            speciesChainMap[s.evolution_chain_id] = []
        }
        speciesChainMap[s.evolution_chain_id].push({
            id: parseInt(s.id, 10),
            name: s.identifier,
            evolves_from: s.evolves_from_species_id ? parseInt(s.evolves_from_species_id, 10) : null,
            order: parseInt(s.order, 10) || parseInt(s.id, 10)
        })
    }

    const evoMethods = {}
    for (const e of evo) {
        const methods = (evoMethods[e.evolved_species_id] ??= [])
        const method = toMethod(e)

        // Different games can list the same method twice; keep one copy
        if (!methods.some((m) => JSON.stringify(m) === JSON.stringify(method))) {
            methods.push(method)
        }
    }

    const result = {}

    for (const [chainId, members] of Object.entries(speciesChainMap)) {
        members.sort((a, b) => a.order - b.order)

        result[chainId] = members.map((m) => ({
            id: m.id,
            name: m.name,
            evolves_from: m.evolves_from,
            methods: evoMethods[String(m.id)] || []
        }))
    }

    await writeJSON('evolution.json', result)
}

const buildForms = async () => {
    const forms = await loadCSV('pokemon_forms.csv')
    const formNames = await loadCSV('pokemon_form_names.csv')
    const pokemon = await loadCSV('pokemon.csv')

    // Map pokemon_id → species_id so we can group forms by base species
    const speciesLookup = Object.fromEntries(
        pokemon.map((p) => [p.id, p.species_id])
    )

    const nameMap = {}
    for (const fn of formNames) {
        if (fn.local_language_id === ENGLISH_LANG_ID) {
            nameMap[fn.pokemon_form_id] = fn.pokemon_name || fn.form_name
        }
    }

    // Group by species_id
    const result = {}

    for (const f of forms) {
        const isMega = f.is_mega === '1'
        const isGmax = f.form_identifier === 'gmax'

        if (!isMega && !isGmax) continue

        const speciesId = speciesLookup[f.pokemon_id]
        if (!speciesId) continue

        if (!result[speciesId]) result[speciesId] = []

        result[speciesId].push({
            form_id: parseInt(f.id, 10),
            pokemon_id: parseInt(f.pokemon_id, 10),
            name: f.identifier,
            form_name: f.form_identifier,
            display_name: nameMap[f.id] || f.identifier,
            is_mega: isMega,
            is_gmax: isGmax
        })
    }

    await writeJSON('forms.json', result)
}

// --- Main ---

const build = async () => {
    if (!existsSync(OUT_DIR)) {
        await mkdir(OUT_DIR, { recursive: true })
    }

    console.log('Building JSON from CSV files...\n')

    await buildPokemon()
    await buildAbilities()
    await buildMoves()
    await buildPokemonMoves()
    await buildEvolution()
    await buildForms()

    console.log('\nBuild complete.')
}

build().catch(console.error)