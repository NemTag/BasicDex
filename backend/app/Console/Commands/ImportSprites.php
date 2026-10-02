<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ImportSprites extends Command
{
    protected $signature = 'sprites:import';

    protected $description = 'Download official artwork for every Pokémon onto the default disk';

    public function handle(): void
    {
        $ids = DB::table('pokemon')->pluck('id');
        $missing = [];

        $this->withProgressBar($ids, function (int $id) use (&$missing) {
            $path = "sprites/{$id}.png";
            if (Storage::exists($path)) {
                return;
            }

            $response = Http::get("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{$id}.png");
            if ($response->failed()) {
                $missing[] = $id;

                return;
            }

            Storage::put($path, $response->body());
        });

        $this->newLine();
        $this->info('Done. '.count($missing).' without artwork: '.implode(', ', $missing));
    }
}