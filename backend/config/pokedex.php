<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pokédex CSV Source
    |--------------------------------------------------------------------------
    |
    | The directory holding the PokeAPI CSV exports that the PokedexSeeder
    | imports. By default this points at the CSVs in the BasicDex frontend,
    | which shares this repository.
    |
    */

    'csv_path' => env('POKEDEX_CSV_PATH', base_path('../src/data/csv')),

];
