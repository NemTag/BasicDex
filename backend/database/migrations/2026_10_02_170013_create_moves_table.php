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
        Schema::create('moves', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->unique();
            $table->foreignId('generation_id')->constrained('generations');
            $table->foreignId('type_id')->constrained('types');
            $table->unsignedInteger('power')->nullable();
            $table->unsignedInteger('pp')->nullable();
            $table->unsignedInteger('accuracy')->nullable();
            $table->integer('priority');
            $table->unsignedInteger('target_id');
            $table->foreignId('damage_class_id')->constrained('move_damage_classes');
            $table->unsignedInteger('effect_id')->nullable();
            $table->unsignedInteger('effect_chance')->nullable();
            $table->unsignedInteger('contest_type_id')->nullable();
            $table->unsignedInteger('contest_effect_id')->nullable();
            $table->unsignedInteger('super_contest_effect_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moves');
    }
};
