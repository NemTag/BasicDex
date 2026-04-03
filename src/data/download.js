/**
 * Downloads the required CSV files from the PokeAPI GitHub repo.
 * Run with: node data/download.js
 */
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_DIR = join(__dirname, 'csv')
const BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'

const FILES = [
    'pokemon.csv',
    'pokemon_species.csv',
    'pokemon_stats.csv',
    'pokemon_types.csv',
    'pokemon_abilities.csv',
    'pokemon_moves.csv',
    'pokemon_evolution.csv',
    'pokemon_forms.csv',
    'pokemon_form_names.csv',
    'moves.csv',
    'move_effect_prose.csv',
    'move_damage_classes.csv',
    'abilities.csv',
    'ability_prose.csv',
    'types.csv',
    'stats.csv',
    'generations.csv',
    'generation_names.csv',
    'evolution_triggers.csv'
]

const download = async () => {
    if (!existsSync(CSV_DIR)) {
        await mkdir(CSV_DIR, { recursive: true })
    }

    console.log(`Downloading ${FILES.length} CSV files...\n`)

    for (const file of FILES) {
        const url = `${BASE_URL}/${file}`
        console.log(`  ↓ ${file}`)

        const res = await fetch(url)

        if (!res.ok) {
            console.error(`    ✗ Failed (${res.status})`)
            continue
        }

        const text = await res.text()
        await writeFile(join(CSV_DIR, file), text, 'utf8')
        console.log(`    ✓ Done`)
    }

    console.log('\nAll downloads complete.')
}

download().catch(console.error)