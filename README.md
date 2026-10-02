# Pokédex — Vue 3 + PokeAPI

A practice project built upon the PokeAPI. This project will continue to change as I make updates and more feature optimizations. 
Feel free to fork it. I will not be accepting pull requests since this is a for-fun personal project.

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
- Only fetching sprite/artwork URLs (which are served from static GitHub assets). I would try to download the sprite repo but my hard drive is actually pretty small lol. Sorry!
Note: early on in the project I accidentally coded in recursion and sent like 10,000 requests. Please forgive me if you can see this.
- Caching all sprite responses in memory for the session lifetime
- Deduplicating concurrent requests to the same endpoint

## License

This project uses data from [PokeAPI](https://pokeapi.co/), which is provided under open terms for educational and personal use. Pokémon and all related properties are trademarks of Nintendo, Game Freak, and The Pokémon Company.
