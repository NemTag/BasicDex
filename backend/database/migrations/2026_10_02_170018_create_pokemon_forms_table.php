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
        Schema::create('pokemon_forms', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->unique();
            $table->string('form_identifier')->nullable();
            $table->foreignId('pokemon_id')->constrained('pokemon')->cascadeOnDelete();
            $table->unsignedInteger('introduced_in_version_group_id');
            $table->boolean('is_default');
            $table->boolean('is_battle_only');
            $table->boolean('is_mega');
            $table->unsignedInteger('form_order');
            $table->unsignedInteger('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemon_forms');
    }
};
