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
        Schema::create('generation_names', function (Blueprint $table) {
            $table->foreignId('generation_id')->constrained('generations')->cascadeOnDelete();
            $table->unsignedInteger('local_language_id');
            $table->string('name');

            $table->primary(['generation_id', 'local_language_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generation_names');
    }
};
