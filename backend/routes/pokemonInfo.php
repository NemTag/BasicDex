<?php

use App\Http\Controllers\PokemonInfoController;
use Illuminate\Support\Facades\Route;

Route::get('/pokemon/{id}/sprite', [PokemonInfoController::class, 'getSprite'])->whereNumber('id');