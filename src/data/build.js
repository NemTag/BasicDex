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

// Game mechanics (evolution methods, learnsets) follow Scarlet/Violet
// and its DLC. Later games (Legends Z-A, Champions) are ignored; their
// new megas still come in through forms.json and abilities.
const SV_ERA = ['scarlet-violet', 'the-teal-mask', 'the-indigo-disk']

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

// Version group id → release order (ids aren't chronological: 28 and 29
// are the Japanese Red/Green), plus the SV-era ids and the newest SV-era order
const loadVersionOrder = async () => {
    const groups = await loadCSV('version_groups.csv')
    const order = Object.fromEntries(groups.map((g) => [g.id, parseInt(g.order, 10)]))
    const svIds = new Set(groups.filter((g) => SV_ERA.includes(g.identifier)).map((g) => g.id))
    const cutoff = Math.max(...[...svIds].map((id) => order[id]))

    return { order, svIds, cutoff }
}

// PokeAPI flags each current method is_default, but sometimes on an
// older game's row (Quilava: Lv. 14 from Gold/Silver; SV uses Lv. 17).
// So per evolution and trigger, take the newest game's rows up to the
// cutoff, and only for triggers that have a default row (drops retired
// methods like Milotic's Beauty level-up).
const selectCurrentRows = (rows, order, cutoff) => {
    const groups = {}
    for (const e of rows) {
        if (order[e.version_group_id] > cutoff) continue

        const key = [e.evolved_species_id, e.required_pokemon_form_id, e.evolved_pokemon_form_id, e.evolution_trigger_id].join('|')
        groups[key] ??= []
        groups[key].push(e)
    }

    return Object.values(groups)
        .filter((group) => group.some((e) => e.is_default === '1'))
        .flatMap((group) => {
            const newest = Math.max(...group.map((e) => order[e.version_group_id]))
            return group.filter((e) => order[e.version_group_id] === newest)
        })
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
    const { order, svIds, cutoff } = await loadVersionOrder()

    // Per Pokémon: its Scarlet/Violet learnset, or for Pokémon not in
    // SV, the newest game before Legends Z-A that has one (Spinda → BDSP)
    const byPokemon = {}
    for (const pm of pokemonMoves) {
        if (order[pm.version_group_id] > cutoff) continue

        // All SV-era games count as one, so DLC moves add to the base game's
        const era = svIds.has(pm.version_group_id) ? Infinity : order[pm.version_group_id]
        byPokemon[pm.pokemon_id] ??= { era: -1, moves: new Set() }
        const entry = byPokemon[pm.pokemon_id]

        if (era > entry.era) Object.assign(entry, { era, moves: new Set() })
        if (era === entry.era) entry.moves.add(pm.move_id)
    }

    const output = {}
    for (const [pokemonId, { moves }] of Object.entries(byPokemon)) {
        output[pokemonId] = [...moves].map(Number)
    }

    await writeJSON('pokemon_moves.json', output)
}

// Species whose form is settled when they evolve (Kubfu becomes Rapid
// Strike Urshifu in the Tower of Waters). PokeAPI gives one set of methods
// per species, so this says which methods (`when`) give which form, plus
// conditions PokeAPI doesn't record (`add`).
const AMPED = 'Hardy, Brave, Adamant, Naughty, Docile, Impish, Lax, Hasty, Jolly, Naive, Rash, Sassy, Quirky'
const LOW_KEY = 'Lonely, Bold, Relaxed, Timid, Serious, Modest, Mild, Quiet, Bashful, Calm, Gentle, Careful'
const byGender = (name) => [
    { form: `${name}-male`, add: { gender: 'male' } },
    { form: `${name}-female`, add: { gender: 'female' } }
]

const FORM_EVOLUTIONS = {
    urshifu: [
        { form: 'urshifu-single-strike', when: { item: 'Scroll of Darkness' } },
        { form: 'urshifu-rapid-strike', when: { item: 'Scroll of Waters' } }
    ],
    lycanroc: [
        { form: 'lycanroc-midday', when: { time_of_day: 'day' } },
        { form: 'lycanroc-midnight', when: { time_of_day: 'night' } },
        { form: 'lycanroc-dusk', when: { time_of_day: 'dusk' }, add: { note: 'Own Tempo Rockruff' } }
    ],
    toxtricity: [
        { form: 'toxtricity-amped', add: { note: 'Amped nature', note_detail: AMPED } },
        { form: 'toxtricity-low-key', add: { note: 'Low Key nature', note_detail: LOW_KEY } }
    ],
    meowstic: byGender('meowstic'),
    oinkologne: byGender('oinkologne'),
    basculegion: byGender('basculegion').map((v) => ({ ...v, from: 'basculin-white-striped' })),
    wormadam: ['Plant', 'Sandy', 'Trash'].map((c) => (
        { form: `wormadam-${c.toLowerCase()}`, add: { note: `${c} Cloak` } })),
    // Pumpkaboo's size carries over, so each size is its own line
    gourgeist: ['small', 'average', 'large', 'super'].map((s) => (
        { form: `gourgeist-${s}`, from: `pumpkaboo-${s}` })),
    dudunsparce: [
        { form: 'dudunsparce-two-segment' },
        { form: 'dudunsparce-three-segment', add: { note: 'Rare (1 in 100)' } }
    ],
    maushold: [
        { form: 'maushold-family-of-four' },
        { form: 'maushold-family-of-three', add: { note: 'Rare (1 in 100)' } }
    ]
}

const buildEvolution = async () => {
    const evo = await loadCSV('pokemon_evolution.csv')
    const pokemon = await loadCSV('pokemon.csv')
    const species = await loadCSV('pokemon_species.csv')
    const triggers = await loadCSV('evolution_triggers.csv')
    const triggerProse = await loadCSV('evolution_trigger_prose.csv')
    const itemNames = await loadCSV('item_names.csv')
    const locationNames = await loadCSV('location_names.csv')
    const moves = await loadCSV('moves.csv')
    const typeNames = await loadCSV('types.csv')
    const pokemonForms = await loadCSV('pokemon_forms.csv')
    const regions = await loadCSV('regions.csv')
    const { order, cutoff } = await loadVersionOrder()

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
    const regionNameMap = Object.fromEntries(
        regions.map((r) => [r.id, r.identifier.charAt(0).toUpperCase() + r.identifier.slice(1)])
    )

    // Regional form id → { pokemonId, region } ('alola', 'galar', …); totems and caps aren't regional
    const regionalForms = new Map(
        pokemonForms
            .filter((f) => REGIONAL.test(f.form_identifier) && !COSMETIC.test(f.form_identifier))
            .map((f) => [f.id, {
                pokemonId: parseInt(f.pokemon_id, 10),
                region: f.form_identifier.match(REGIONAL)[2],
                isDefault: f.is_default === '1'
            }])
    )

    const GENDERS = { 1: 'female', 2: 'male' }
    const int = (v) => (v ? parseInt(v, 10) : null)

    // One row = one way to evolve; a species can have several.
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
            min_damage_taken: int(e.minimum_damage_taken),
            // Set on region-locked evolutions (Pikachu → Alolan Raichu)
            region: regionNameMap[e.region_id] || null
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

    // Different games can list the same method twice; keep one copy
    const addMethod = (methods, method) => {
        if (!methods.some((m) => JSON.stringify(m) === JSON.stringify(method))) {
            methods.push(method)
        }
    }

    const speciesById = Object.fromEntries(species.map((s) => [s.id, s]))
    const pokemonIdByName = Object.fromEntries(pokemon.map((p) => [p.identifier, parseInt(p.id, 10)]))
    const regionalChains = {}
    const regionalGroup = (speciesId, region) => {
        const chainId = speciesById[speciesId].evolution_chain_id
        regionalChains[chainId] ??= {}
        regionalChains[chainId][region] ??= { pokemon: new Set(), edges: new Map() }
        return regionalChains[chainId][region]
    }

    // Rows that produce or need a regional form (Alolan Raichu, Perrserker
    // from Galarian Meowth) go to regional.json; the rest is the main chain
    const evoMethods = {}
    const hasMainRow = new Set()
    const hasRegionalRow = new Set()

    for (const e of selectCurrentRows(evo, order, cutoff)) {
        const to = regionalForms.get(e.evolved_pokemon_form_id)
        const from = regionalForms.get(e.required_pokemon_form_id)

        if (!to && !from) {
            // Legends: Arceus tags all its rows with Hisui; only regional
            // evolutions are actually region-locked
            const { region, ...method } = toMethod(e)

            hasMainRow.add(e.evolved_species_id)
            evoMethods[e.evolved_species_id] ??= []
            addMethod(evoMethods[e.evolved_species_id], method)
            continue
        }

        hasRegionalRow.add(e.evolved_species_id)

        // No form id means the species' default Pokémon, whose id is the species id
        const toId = to?.pokemonId ?? parseInt(e.evolved_species_id, 10)
        const fromId = from?.pokemonId ?? parseInt(speciesById[e.evolved_species_id].evolves_from_species_id, 10)
        const group = regionalGroup(e.evolved_species_id, (to ?? from).region)

        group.pokemon.add(fromId).add(toId)
        const key = `${fromId}>${toId}`
        if (!group.edges.has(key)) group.edges.set(key, { from: fromId, to: toId, methods: [] })
        addMethod(group.edges.get(key).methods, toMethod(e))
    }

    // Regional forms with no evolution (Galarian Articuno) still get a card
    const speciesOfPokemon = Object.fromEntries(pokemon.map((p) => [p.id, p.species_id]))
    for (const { pokemonId, region, isDefault } of regionalForms.values()) {
        if (isDefault) regionalGroup(speciesOfPokemon[pokemonId], region).pokemon.add(pokemonId)
    }

    // Battle forms of regional forms, which PokeAPI doesn't link to their base
    for (const [form, base] of Object.entries(REGIONAL_FORM_CHANGES)) {
        const [formId, baseId] = [pokemonIdByName[form], pokemonIdByName[base]]
        const group = regionalGroup(speciesOfPokemon[formId], form.match(REGIONAL)[2])
        group.edges.set(`${baseId}>${formId}`, { from: baseId, to: formId, kind: 'battle', methods: [] })
    }

    const matches = (method, when = {}) =>
        Object.entries(when).every(([k, v]) => method[k] === v)

    // One entry per form, each with the methods that produce it
    const variantsFor = (speciesName, methods) => FORM_EVOLUTIONS[speciesName]?.map(({ form, from, when, add }) => {
        if (!pokemonIdByName[form]) throw new Error(`FORM_EVOLUTIONS: unknown pokemon "${form}"`)
        if (from && !pokemonIdByName[from]) throw new Error(`FORM_EVOLUTIONS: unknown pokemon "${from}"`)

        return {
            pokemon_id: pokemonIdByName[form],
            name: form,
            from_pokemon_id: from ? pokemonIdByName[from] : undefined,
            methods: methods.filter((m) => matches(m, when)).map((m) => ({ ...m, ...add }))
        }
    })

    const result = {}

    for (const [chainId, members] of Object.entries(speciesChainMap)) {
        members.sort((a, b) => a.order - b.order)

        result[chainId] = members.map((m) => {
            const methods = evoMethods[String(m.id)] || []

            return {
                id: m.id,
                name: m.name,
                evolves_from: m.evolves_from,
                methods,
                variants: variantsFor(m.name, methods),
                // Only evolves from a regional form (Perrserker), so it lives in the regional section
                regional_only: hasRegionalRow.has(String(m.id)) && !hasMainRow.has(String(m.id)) || undefined
            }
        })
    }

    await writeJSON('evolution.json', result)

    const regional = {}
    for (const [chainId, groups] of Object.entries(regionalChains)) {
        regional[chainId] = {}
        for (const [region, { pokemon: ids, edges }] of Object.entries(groups)) {
            regional[chainId][region] = { pokemon: [...ids], edges: [...edges.values()] }
        }
    }

    await writeJSON('regional.json', regional)
}

// Galarian Darmanitan's Zen Mode; the regular one is linked through forms.json
const REGIONAL_FORM_CHANGES = {
    'darmanitan-galar-zen': 'darmanitan-galar-standard'
}

const REGIONAL = /(^|-)(alola|galar|hisui|paldea)(-|$)/
// Looks-only variants, kept for a future "Alternate forms" picker
const COSMETIC = /(^|-)(totem|cap|cosplay|rock-star|belle|pop-star|phd|libre|starter|battle-bond|power-construct|own-tempo)(-|$)/

const formCategory = (f, isDefaultPokemon) => {
    if (isDefaultPokemon) return 'default'
    if (f.is_mega === '1') return 'mega'
    if (f.form_identifier === 'gmax') return 'gmax'
    if (COSMETIC.test(f.form_identifier)) return 'cosmetic'
    // Minior's colours differ only in looks; red stands in for the rest
    if (f.identifier.startsWith('minior-') && !f.form_identifier.startsWith('red')) return 'cosmetic'
    if (REGIONAL.test(f.form_identifier)) return 'regional'
    if (f.is_battle_only === '1') return 'battle'
    return 'alternate'
}

const buildForms = async () => {
    const forms = await loadCSV('pokemon_forms.csv')
    const formNames = await loadCSV('pokemon_form_names.csv')
    const pokemon = await loadCSV('pokemon.csv')

    const namesByForm = {}
    for (const fn of formNames) {
        if (fn.local_language_id === ENGLISH_LANG_ID) {
            namesByForm[fn.pokemon_form_id] = fn
        }
    }

    // One form row per Pokémon: its default (Koraidon's builds have none
    // flagged, so fall back to the first). Other rows of the same Pokémon
    // (Unown letters) share its stats and page.
    const formByPokemon = {}
    for (const f of forms) {
        if (f.is_default === '1' || !formByPokemon[f.pokemon_id]) {
            formByPokemon[f.pokemon_id] = f
        }
    }

    // Group by species_id
    const result = {}

    for (const p of pokemon) {
        const f = formByPokemon[p.id]
        if (!f) continue

        const names = namesByForm[f.id]

        result[p.species_id] ??= []
        result[p.species_id].push({
            form_id: parseInt(f.id, 10),
            pokemon_id: parseInt(p.id, 10),
            name: f.identifier,
            form_name: f.form_identifier || null,
            form_label: names?.form_name || null,
            display_name: names?.pokemon_name || names?.form_name || f.identifier,
            category: formCategory(f, p.is_default === '1')
        })
    }

    // Species with only their default form don't need an entry
    for (const [speciesId, entries] of Object.entries(result)) {
        if (entries.length === 1) delete result[speciesId]
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