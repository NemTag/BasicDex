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
        Schema::create('pokemon_form_names', function (Blueprint $table) {
            $table->foreignId('pokemon_form_id')->constrained('pokemon_forms')->cascadeOnDelete();
            $table->unsignedInteger('local_language_id');
            $table->string('form_name')->nullable();
            $table->string('pokemon_name')->nullable();

            $table->primary(['pokemon_form_id', 'local_language_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemon_form_names');
    }
};
