/**
 * name.ts — Nama AI assistant
 *
 * Berisi konfigurasi nama untuk AI assistant "Zanz_Codex".
 */

/** Nama default AI assistant */
export const AI_NAME = 'Zanz_Codex';

/** Nama display dengan format */
export const AI_DISPLAY_NAME = 'Zanz_Codex 🤖';

/** Deskripsi singkat AI */
export const AI_DESCRIPTION = 'AI Assistant berbasis Groq, cerdas dan ramah';

/** Mendapatkan nama AI */
export function getAIName(): string {
  return AI_NAME;
}

/** Mendapatkan display name AI */
export function getAIDisplayName(): string {
  return AI_DISPLAY_NAME;
}
