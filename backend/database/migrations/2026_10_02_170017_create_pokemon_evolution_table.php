<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pokemon_evolution', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evolved_species_id')->constrained('pokemon_species')->cascadeOnDelete();
            $table->foreignId('evolution_trigger_id')->constrained('evolution_triggers');
            $table->unsignedInteger('trigger_item_id')->nullable();
            $table->unsignedInteger('minimum_level')->nullable();
            $table->unsignedInteger('gender_id')->nullable();
            $table->unsignedInteger('location_id')->nullable();
            $table->unsignedInteger('held_item_id')->nullable();
            $table->string('time_of_day')->nullable();
            $table->foreignId('known_move_id')->nullable()->constrained('moves');
            $table->foreignId('known_move_type_id')->nullable()->constrained('types');
            $table->unsignedInteger('minimum_happiness')->nullable();
            $table->unsignedInteger('minimum_beauty')->nullable();
            $table->unsignedInteger('minimum_affection')->nullable();
            $table->integer('relative_physical_stats')->nullable();
            $table->foreignId('party_species_id')->nullable()->constrained('pokemon_species');
            $table->foreignId('party_type_id')->nullable()->constrained('types');
            $table->foreignId('trade_species_id')->nullable()->constrained('pokemon_species');
            $table->boolean('needs_overworld_rain');
            $table->boolean('turn_upside_down');
            $table->boolean('needs_multiplayer');
            $table->unsignedInteger('region_id')->nullable();
            $table->unsignedInteger('base_form_id')->nullable();
            $table->foreignId('used_move_id')->nullable()->constrained('moves');
            $table->unsignedInteger('minimum_move_count')->nullable();
            $table->unsignedInteger('minimum_steps')->nullable();
            $table->unsignedInteger('minimum_damage_taken')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemon_evolution');
    }
};
