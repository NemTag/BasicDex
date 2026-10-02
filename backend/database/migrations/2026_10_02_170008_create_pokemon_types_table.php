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
        Schema::create('pokemon_types', function (Blueprint $table) {
            $table->foreignId('pokemon_id')->constrained('pokemon')->cascadeOnDelete();
            $table->foreignId('type_id')->constrained('types');
            $table->unsignedInteger('slot');

            $table->primary(['pokemon_id', 'slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemon_types');
    }
};
