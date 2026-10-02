<?php

namespace Database\Seeders;

use Illuminate\Console\View\Components\Task;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class PokedexSeeder extends Seeder
{
    /**
     * Tables to import, in foreign-key dependency order. Each table is
     * loaded from the CSV file of the same name, whose header row must
     * match the table's column names.
     *
     * @var list<string>
     */
    private const TABLES = [
        'generations',
        'generation_names',
        'move_damage_classes',
        'types',
        'stats',
        'pokemon_species',
        'pokemon',
        'pokemon_types',
        'pokemon_stats',
        'abilities',
        'ability_prose',
        'pokemon_abilities',
        'moves',
        'move_effect_prose',
        'pokemon_moves',
        'evolution_triggers',
        'pokemon_evolution',
        'pokemon_forms',
        'pokemon_form_names',
    ];

    /**
     * Upper bound on bound parameters per INSERT, kept well under the
     * SQLite (32,766) and MySQL (65,535) placeholder limits.
     */
    private const MAX_PARAMETERS_PER_INSERT = 10_000;

    /**
     * Replace the Pokédex tables' contents with the CSV data.
     */
    public function run(): void
    {
        $csvPath = config('pokedex.csv_path');

        Schema::withoutForeignKeyConstraints(function () use ($csvPath): void {
            foreach (self::TABLES as $table) {
                DB::table($table)->truncate();
            }

            foreach (self::TABLES as $table) {
                $importTable = fn () => $this->importCsv($table, "{$csvPath}/{$table}.csv");

                if ($this->command === null) {
                    $importTable();

                    continue;
                }

                (new Task($this->command->getOutput()))->render("Importing {$table}", $importTable);
            }
        });
    }

    /**
     * Insert every row of a CSV file into the given table in batches,
     * storing empty CSV values as NULL.
     */
    private function importCsv(string $table, string $path): void
    {
        $handle = @fopen($path, 'r');

        if ($handle === false) {
            throw new RuntimeException("Unable to open CSV file [{$path}]. Set POKEDEX_CSV_PATH to the directory holding the PokeAPI CSVs.");
        }

        try {
            $columns = fgetcsv($handle, escape: '');
            $rowsPerInsert = intdiv(self::MAX_PARAMETERS_PER_INSERT, count($columns));

            DB::transaction(function () use ($handle, $table, $columns, $rowsPerInsert): void {
                $batch = [];

                while (($values = fgetcsv($handle, escape: '')) !== false) {
                    if ($values === [null]) {
                        continue;
                    }

                    $batch[] = array_combine($columns, array_map(
                        fn (string $value): ?string => $value === '' ? null : $value,
                        $values,
                    ));

                    if (count($batch) === $rowsPerInsert) {
                        DB::table($table)->insert($batch);
                        $batch = [];
                    }
                }

                if ($batch !== []) {
                    DB::table($table)->insert($batch);
                }
            });
        } finally {
            fclose($handle);
        }
    }
}
