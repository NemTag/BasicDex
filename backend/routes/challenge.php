<?php

use App\Http\Controllers\ChallengeController;
use Illuminate\Support\Facades\Route;

Route::get('/challenge', [ChallengeController::class, 'getChallenge']);
Route::post('/challenge', [ChallengeController::class, 'answerChallenge']);