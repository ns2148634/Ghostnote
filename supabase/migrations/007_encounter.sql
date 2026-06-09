-- 007_encounter.sql — Phase 1 schema additions (encounter archetype + trust axis + climax)
-- Phase 1: add columns only; leave NULL. Logic enabled in Phase 2.

ALTER TABLE stories ADD COLUMN IF NOT EXISTS encounter_archetype TEXT;
-- 'correct_response' | 'avoid_notice' | 'be_remembered' | 'avoid_gaze' | 'stay_still' | NULL
-- NULL = pure signal model (Phase 1 default)

ALTER TABLE scene_options ADD COLUMN IF NOT EXISTS trust_delta SMALLINT DEFAULT 0;
-- trust_delta: only meaningful for archetype lore encounters (Phase 2)

ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS climax_type TEXT;
-- 'hold_listen' | 'look_away' | 'stay_still' | 'tap_echo' — Phase 2 gesture types

ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS climax_text TEXT;
-- Text displayed during climax gesture

ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS climax_min_trust SMALLINT;
-- Minimum trust required to trigger climax (usually = TRUST_GATE = 3)
