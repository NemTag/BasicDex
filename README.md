# Pokédex — Vue 3 + PokeAPI

A practice project built upon the PokeAPI. This project will continue to change as I make updates and more feature optimizations. 
Feel free to fork it. I will not be accepting pull requests since this is a for-fun personal project.
**Disclaimer**
Most of this markdown was written by AI lol. 

## Features

### Search
- **Fuzzy suggestion search** — As you type (2+ characters), a dropdown shows matching Pokémon names with counts, powered by a locally indexed name list.
- **Keyboard navigation** — Arrow keys to browse suggestions, Enter to select, Escape to dismiss.
- **Click-through** — Clicking a search result's sprite navigates to its full detail page.

### Pokémon Detail Page (`PokePage`)

The detail view is split into a two-column layout (single column on mobile) with the following sections:

#### Left Column
- **Identity** — Official artwork, name, Pokédex number (zero-padded), type badges with canonical colors, and generation badge.
- **Base Stats (`PokeStats`)** — Horizontal bar chart for HP, Atk, Def, SpA, SpD, and Spe. Bars are color-coded from red (low) through green (high), dynamically scaled to accommodate stats beyond the traditional 255 ceiling. Displays a summed total row.

#### Right Column
- **Evolution Chain (`PokeLine`)** — Visual evolution line displayed vertically with sprites, names, and trigger labels between stages. Supports multiple evolution triggers:
  - Level-up (with level threshold)
  - Happiness, Beauty, Affection
  - Overworld rain
  - Trade, items, and other triggers
- **Alternate Forms** — Mega Evolutions and Gigantamax forms are appended after their respective base stage, sourced from the `varieties` relationship on each species.

#### Full Width
- **Abilities** — Listed in rows with name and English effect description. Hidden abilities are separated under their own sub-header with a distinct visual style.
- **Moves (`PokeMoves`)** — Full move pool rendered in a sortable, paginated table (20 per page) with columns for:
  - Name (sortable A-Z / Z-A)
  - Type (filterable dropdown showing all types with move counts, plus an "All" option)
  - Power (sortable high/low)
  - Accuracy
  - Damage Class (Physical / Special / Status with color-coded badges and icons)
  - Effect description (with `$effect_chance` values interpolated)

## Architecture

```
src/
├── composables/
│   └── usePokeApi.js          # Shared data access layer
├── components/
│   └── PokePage/
│       ├── PokePage.vue       # Detail page shell
│       ├── PokeStats.vue      # Base stat bar chart
│       ├── PokeMoves.vue      # Move table with sort/filter/pagination
│       └── PokeLine.vue       # Evolution chain with alternate forms
├── views/
│   └── Home.vue               # Search interface
├── data/
│   ├── download.js            # Fetches CSVs from PokeAPI GitHub
│   ├── build.js               # Processes CSVs into optimized JSON
│   ├── csv/                   # Raw CSV files (browsable in IDE)
│   └── json/                  # Built JSON consumed by the app
│       ├── pokemon.json       # Pokemon with stats, types, generation
│       ├── abilities.json     # Abilities grouped by pokemon ID
│       ├── moves.json         # Move definitions with effects
│       ├── pokemon_moves.json # Pokemon → move ID relationships
│       ├── evolution.json     # Evolution chains with trigger details
│       └── forms.json         # Mega/Gmax forms keyed by species ID
├── router/
│   └── index.js               # Vue Router config
├── App.vue                    # Root shell with header + router-view
└── main.js                    # App entry point
```

### Component Responsibilities

| Component | Props | Role |
|-----------|-------|------|
| `PokePage` | — | Orchestrator. Calls `getFullPokemon()`, distributes data to children. |
| `PokeStats` | `stats: Array` | Pure presentational. Renders stat bars from prop data. |
| `PokeMoves` | `moves: Array` | Self-contained. Owns sorting, filtering, and pagination state. |
| `PokeLine` | `evolutionChainId: Number` | Reads chain + forms from local data, fetches sprites only. |
| `Home` | — | Search interface. Local name matching, single sprite fetch per search. |

## Optimizations

### Local Database (CSV → JSON Pipeline)

The app ships with a pre-built local copy of the PokeAPI dataset. A two-step build pipeline processes raw CSV files from the [PokeAPI GitHub repository](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) into optimized JSON modules:

1. **`data/download.js`** — Downloads 19 CSV files covering pokemon, species, stats, types, abilities, moves, evolution chains, forms, and their prose descriptions.
2. **`data/build.js`** — Parses CSVs and builds 6 denormalized JSON files, pre-joining relationships (e.g., moves include their type name, damage class, and interpolated effect text) so the app never needs to resolve foreign keys at runtime.

**Result:** All data lookups — pokemon info, stats, types, abilities, moves, evolution chains, and forms — are synchronous in-memory reads. Zero network latency for data.

### Network Calls Reduced to Sprites Only

The only network traffic is `fetchSprites()`, which hits `/api/v2/pokemon/{id}` to retrieve sprite URLs. This is unavoidable since image assets aren't included in the CSV dataset.

### Sprite Cache with Request Deduplication

`usePokeApi.js` maintains a global `spriteCache` Map and a `pending` Map:

- **Cache hits** return instantly from memory.
- **In-flight deduplication** — If two components request the same sprite simultaneously, only one `fetch()` fires. Both await the same Promise.
- **Cross-component sharing** — The cache is at module scope, so sprites fetched by `PokePage` are available to `PokeLine` without re-fetching.

### Relational Data Modeling

The build script leverages PokeAPI's relational structure to pre-resolve references:

- **Forms → Species** — Mega/Gmax forms are keyed by `species_id` (resolved via `pokemon.csv`'s `species_id` column), not the variant's `pokemon_id`. This allows `PokeLine` to find all forms for any species in the evolution chain with a single lookup.
- **Moves → Effects** — `$effect_chance` placeholders in `move_effect_prose` are interpolated with actual values at build time.
- **Pokemon → Moves** — Deduplicated to a set of move IDs per pokemon (a pokemon can learn the same move via multiple methods/versions).

### Pagination and Lazy Rendering

The moves table paginates at 20 entries. Sorting and filtering operate on the full dataset, then pagination slices the result. This avoids rendering 80+ DOM rows for pokemon with large move pools.

## Setup

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Build the Local Database

```bash
node data/download.js   # Download CSVs from PokeAPI GitHub
node data/build.js      # Process CSVs into JSON
```

### Run Development Server

```bash
npm run dev
```

### Dependencies

- **Vue 3** — Composition API with `<script setup>`
- **Vue Router** — Client-side routing between Home and PokePage
- **Bootstrap 5** — UI components and utility classes

## Respecting PokeAPI

[PokeAPI](https://pokeapi.co/) is a free, open resource for educational use. This project minimizes API load by:

- Shipping a local copy of the database for all data queries
- Only fetching sprite/artwork URLs (which are served from static GitHub assets)
- Caching all sprite responses in memory for the session lifetime
- Deduplicating concurrent requests to the same endpoint

## License

This project uses data from [PokeAPI](https://pokeapi.co/), which is provided under open terms for educational and personal use. Pokémon and all related properties are trademarks of Nintendo, Game Freak, and The Pokémon Company.
