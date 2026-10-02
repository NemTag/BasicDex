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
        Schema::create('ability_prose', function (Blueprint $table) {
            $table->foreignId('ability_id')->constrained('abilities')->cascadeOnDelete();
            $table->unsignedInteger('local_language_id');
            $table->text('short_effect');
            $table->text('effect');

            $table->primary(['ability_id', 'local_language_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ability_prose');
    }
};
