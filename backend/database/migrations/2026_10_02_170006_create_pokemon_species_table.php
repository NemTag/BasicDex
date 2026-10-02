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
        Schema::create('pokemon_species', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->unique();
            $table->foreignId('generation_id')->constrained('generations');
            $table->foreignId('evolves_from_species_id')->nullable()->constrained('pokemon_species');
            $table->unsignedInteger('evolution_chain_id')->index();
            $table->unsignedInteger('color_id');
            $table->unsignedInteger('shape_id');
            $table->unsignedInteger('habitat_id')->nullable();
            $table->integer('gender_rate');
            $table->unsignedInteger('capture_rate');
            $table->unsignedInteger('base_happiness');
            $table->boolean('is_baby');
            $table->unsignedInteger('hatch_counter');
            $table->boolean('has_gender_differences');
            $table->unsignedInteger('growth_rate_id');
            $table->boolean('forms_switchable');
            $table->boolean('is_legendary');
            $table->boolean('is_mythical');
            $table->unsignedInteger('order');
            $table->unsignedInteger('conquest_order')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemon_species');
    }
};
