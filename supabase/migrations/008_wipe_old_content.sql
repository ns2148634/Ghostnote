-- ================================================
-- 008_wipe_old_content.sql
-- 清掉舊模型的故事內容 + 重設開發階段的玩家進度，準備用新模型重 seed。
--
-- ⚠️ 破壞性！會刪掉所有故事內容與玩家碎片/筆記/解鎖進度。
--    只在「開發階段、可接受重置」時跑。正式上線後不要直接跑這支。
--    建議跑前先在 Supabase 對這些表做一次匯出備份。
--
-- 跑序：005 → 006 → 007 →（本支）008 → 再 seed 新模型內容。
--    （結構欄位先就位，刪/重建資料才不會撞欄位。）
--
-- 保留：players（帳號本身）。只清玩家的「遊戲進度」。
-- ================================================

BEGIN;

-- ── A. 玩家進度（先刪，因為它們外鍵參照 story_fragments / stories）──
-- 玩家持有的碎片
DELETE FROM fragments;
-- 已解鎖的鬼怪頁
DELETE FROM creature_pages;
-- 筆記本：開發階段直接清空（含已封存的）。
-- 若想保留玩家手上的空白筆記、只退出已封存的，改用下面註解那段。
DELETE FROM notebooks;
--   -- 保留未封存筆記、只清掉封存結果的版本：
--   DELETE FROM notebooks WHERE status = 'sealed';
--   UPDATE notebooks SET story_id = NULL, sealed_layer = NULL, sealed_story = NULL, sealed_at = NULL;

-- ── B. 故事內容（子 → 父 順序刪）──
-- 選項 → 場景 → 氛圍/異常點 → 碎片 → 故事
DELETE FROM scene_options;
DELETE FROM fragment_scenes;
DELETE FROM fragment_atmosphere;
DELETE FROM story_fragments;
DELETE FROM stories;

COMMIT;

-- ── 跑完檢查（可選，預期都是 0）──
-- SELECT
--   (SELECT count(*) FROM stories)            AS stories,
--   (SELECT count(*) FROM story_fragments)    AS fragments_def,
--   (SELECT count(*) FROM fragment_atmosphere)AS atmosphere,
--   (SELECT count(*) FROM fragment_scenes)    AS scenes,
--   (SELECT count(*) FROM scene_options)      AS options,
--   (SELECT count(*) FROM fragments)          AS owned,
--   (SELECT count(*) FROM creature_pages)     AS pages,
--   (SELECT count(*) FROM notebooks)          AS notebooks,
--   (SELECT count(*) FROM players)            AS players_kept;

-- ── 跑完後 ──
-- 退役刪除舊的 example_fixed.sql（不要再跑它）。
-- 用新模型重 seed：先 example_night_shift.sql，再用更新後的
-- docs/content-generation-prompt.md 生成的鬼怪（椅仔姑等）。
