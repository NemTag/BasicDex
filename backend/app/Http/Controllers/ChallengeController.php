<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ChallengeController extends Controller
{
    public function getChallenge()
    {
        $id = DB::table('pokemon_species')->inRandomOrder()->value('id');

        return [
            'token' => Crypt::encryptString($id),
            'image' => Storage::temporaryUrl("sprites/{$id}.png", now()->addMinutes(5)),
        ];
    }

    public function answerChallenge(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'name' => 'required|string|max:50',
        ]);

        try {
            $id = Crypt::decryptString($data['token']);
        } catch (DecryptException) {
            abort(422, 'Invalid challenge token.');
        }

        $answer = DB::table('pokemon_species')->where('id', $id)->value('identifier');
        $normalize = fn (string $name) => preg_replace('/[^a-z0-9]/', '', strtolower($name));

        return ['correct' => $normalize($data['name']) === $normalize($answer)];
    }
}