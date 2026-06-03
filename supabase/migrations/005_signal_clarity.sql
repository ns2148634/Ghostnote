-- ================================================
-- 005_signal_clarity.sql
-- 探查模型改版：scene_options 由「對錯」改為「訊號清晰度」
--   is_correct (bool) + fail_text  →  signal_delta (smallint) + result_text
-- 安全轉換現有資料，不需重新 seed。
-- ================================================

-- 1) 新增欄位（先允許 NULL，填完再設 NOT NULL）
ALTER TABLE scene_options ADD COLUMN IF NOT EXISTS signal_delta SMALLINT;
ALTER TABLE scene_options ADD COLUMN IF NOT EXISTS result_text TEXT DEFAULT '';

-- 2) 從舊欄位轉換現有資料（預設映射，之後可逐片微調）
--    skippable 層的選項          → 0   純氛圍，不動格數
--    原本正確 (is_correct=true)  → +1  穩住接通
--    原本錯誤 (is_correct=false) → -1  訊號開始散（-2 留給之後手動標最嚴重的誤讀）
UPDATE scene_options so
SET signal_delta = CASE
      WHEN fs.is_skippable THEN 0
      WHEN so.is_correct   THEN 1
      ELSE -1
    END,
    result_text = COALESCE(NULLIF(so.fail_text, ''), '')
FROM fragment_scenes fs
WHERE so.scene_id = fs.id;

-- 3) 全部有值後設為 NOT NULL
ALTER TABLE scene_options ALTER COLUMN signal_delta SET NOT NULL;

-- 4) 移除舊欄位
ALTER TABLE scene_options DROP COLUMN is_correct;
ALTER TABLE scene_options DROP COLUMN fail_text;

-- ── 跑完待補（內容，不影響結構）──────────────────
-- 原本「正確」與 skippable 的選項 fail_text 為空，
-- 故它們的 result_text 目前是 ''，需補寫「訊號穩住 / 它沒有退開」這類短句。
--
-- ── 若想改採「清空重 seed」而非轉換 ──────────────
-- 跳過上面第 2 步，改先清空再用新版 content prompt 重產：
--   DELETE FROM scene_options;
