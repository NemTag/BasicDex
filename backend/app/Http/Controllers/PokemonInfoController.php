<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;

class PokemonInfoController extends Controller
{
    public function getSprite(int $id)
    {
        $path = "sprites/{$id}.png";
        abort_unless(Storage::exists($path), 404);

        return ['url' => Storage::url($path)];
    }
}
