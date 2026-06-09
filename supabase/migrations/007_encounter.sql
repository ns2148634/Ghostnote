-- ================================================
-- 007_encounter.sql
-- 遭遇系統欄位（ENCOUNTER_SPEC §7）
--   - stories.encounter_archetype   遭遇原型（NULL = 純訊號格，不啟用信任/手勢）
--   - scene_options.trust_delta      第二軸「信任」增減（僅 archetype lore 用；其餘 0）
--   - fragment_scenes.climax_*        climax 手勢（只在 archetype lore 的最後一層填）
--   - fragment_scenes.scene_mode      'text' | 'spatial'（空間選項模式，§11）
--   - scene_options.position          'forward'|'hide'|'wait'|'look'|'back'（spatial 用）
--
-- 全部可為 NULL / 有預設，先加好不影響現有資料。
-- Phase 1 這些欄位多半留空/預設；Phase 2 才填信任與手勢。
-- 跑序：005 → 006 → 007。
-- ================================================

-- 1) 鬼的遭遇原型
ALTER TABLE stories          ADD COLUMN IF NOT EXISTS encounter_archetype TEXT;
-- 允許值（建議，非強制約束）：
--   'correct_response' 正確回應型 | 'avoid_notice' 別被注意型 | 'be_remembered' 被記得型
--   | 'avoid_gaze' 別直視型 | 'stay_still' 靜止節奏型 | NULL = 純訊號格

-- 2) 第二軸：信任
ALTER TABLE scene_options    ADD COLUMN IF NOT EXISTS trust_delta SMALLINT DEFAULT 0;
-- 值域 -2 ~ +2；僅 archetype 的 lore 遭遇會用到，其餘維持 0

-- 3) climax 手勢（只在 archetype lore 碎片的最後一層填，其餘 NULL）
ALTER TABLE fragment_scenes  ADD COLUMN IF NOT EXISTS climax_type      TEXT;     -- 'hold_listen'|'look_away'|'stay_still'|'tap_echo'|'spatial_react'
ALTER TABLE fragment_scenes  ADD COLUMN IF NOT EXISTS climax_text      TEXT;     -- 手勢進行時顯示/跑出的字
ALTER TABLE fragment_scenes  ADD COLUMN IF NOT EXISTS climax_min_trust SMALLINT; -- 觸發門檻，通常 = TRUST_GATE(3)

-- 4) 空間選項模式（§11）
ALTER TABLE fragment_scenes  ADD COLUMN IF NOT EXISTS scene_mode TEXT DEFAULT 'text'; -- 'text' | 'spatial'
ALTER TABLE scene_options    ADD COLUMN IF NOT EXISTS position   TEXT;                -- 'forward'|'hide'|'wait'|'look'|'back'（spatial 場景用；text 場景留 NULL）

-- 5)（選用，未來）場景音效，spatial 的感官提示加分用；文字提示仍寫在 atmosphere_text
-- ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS sound_slug TEXT;

-- ── 跑完備註（不影響結構）──────────────────────────────
-- Phase 1：以上欄位多半留 NULL/預設即可運作（lore 走無原型退化、文字模式）。
-- Phase 2：替 archetype 的鬼填 encounter_archetype，並在其 lore 最後一層填 climax_*；
--           需要空間呈現的層設 scene_mode='spatial' 並給各選項 position。
