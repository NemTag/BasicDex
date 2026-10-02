<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Match PokeAPI's newer pokemon_evolution.csv, which lists one row per
     * version group, links evolutions to specific forms (replacing
     * base_form_id), and adds nature, chance and special-rock conditions.
     */
    public function up(): void
    {
        Schema::table('pokemon_evolution', function (Blueprint $table) {
            $table->dropColumn('base_form_id');

            // Nullable/defaulted so rows imported from the old CSV survive
            // until the next seed
            $table->unsignedInteger('version_group_id')->nullable();
            $table->boolean('is_default')->default(true);
            $table->boolean('near_special_rock')->default(false);
            $table->foreignId('required_pokemon_form_id')->nullable()->constrained('pokemon_forms');
            $table->foreignId('evolved_pokemon_form_id')->nullable()->constrained('pokemon_forms');
            $table->unsignedInteger('nature_bitmask')->nullable();
            $table->string('condition_expression')->nullable();
            $table->unsignedTinyInteger('percentage_chance')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pokemon_evolution', function (Blueprint $table) {
            $table->dropForeign(['required_pokemon_form_id']);
            $table->dropForeign(['evolved_pokemon_form_id']);
            $table->dropColumn([
                'version_group_id',
                'is_default',
                'near_special_rock',
                'required_pokemon_form_id',
                'evolved_pokemon_form_id',
                'nature_bitmask',
                'condition_expression',
                'percentage_chance',
            ]);

            $table->unsignedInteger('base_form_id')->nullable();
        });
    }
};
