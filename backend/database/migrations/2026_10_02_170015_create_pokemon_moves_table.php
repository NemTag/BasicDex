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
        Schema::create('pokemon_moves', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pokemon_id');
            $table->unsignedInteger('version_group_id');
            $table->foreignId('move_id')->constrained('moves');
            $table->unsignedInteger('pokemon_move_method_id');
            $table->unsignedInteger('level');
            $table->unsignedInteger('order')->nullable();
            $table->unsignedInteger('mastery')->nullable();

            $table->index(['pokemon_id', 'version_group_id']);
            $table->foreign('pokemon_id')->references('id')->on('pokemon')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemon_moves');
    }
};
