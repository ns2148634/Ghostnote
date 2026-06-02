-- Migration 006: tiered ending
-- fragment_scenes: add ending_high / ending_low
-- Applied 2026-06-02 via Supabase MCP. Do NOT re-run.

ALTER TABLE fragment_scenes
  ADD COLUMN IF NOT EXISTS ending_high TEXT,
  ADD COLUMN IF NOT EXISTS ending_low  TEXT;

-- Only fill for the last layer of each fragment.
-- null = no ending text; getEnding() returns '' and UI skips the line.
