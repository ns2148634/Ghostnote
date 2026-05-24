-- 003_scene_pool.sql
-- New random scene pool tables replacing fixed exploration_nodes

-- fragment_atmosphere: random atmosphere text pool per fragment (free, no stamina cost)
CREATE TABLE IF NOT EXISTS fragment_atmosphere (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_fragment_id  UUID NOT NULL REFERENCES story_fragments(id) ON DELETE CASCADE,
  atmosphere_text    TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- fragment_scenes: exploration choice layers per fragment (layer_index >= 1)
CREATE TABLE IF NOT EXISTS fragment_scenes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_fragment_id  UUID NOT NULL REFERENCES story_fragments(id) ON DELETE CASCADE,
  layer_index        INTEGER NOT NULL CHECK (layer_index >= 1),
  atmosphere_text    TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- scene_options: options pool per scene (multiple correct + multiple wrong, 3 randomly drawn per play)
CREATE TABLE IF NOT EXISTS scene_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id    UUID NOT NULL REFERENCES fragment_scenes(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT false,
  fail_text   TEXT NOT NULL DEFAULT '',  -- empty string for correct options
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fragment_atmosphere_frag ON fragment_atmosphere(story_fragment_id);
CREATE INDEX IF NOT EXISTS idx_fragment_scenes_frag     ON fragment_scenes(story_fragment_id);
CREATE INDEX IF NOT EXISTS idx_fragment_scenes_layer    ON fragment_scenes(story_fragment_id, layer_index);
CREATE INDEX IF NOT EXISTS idx_scene_options_scene      ON scene_options(scene_id);

-- RLS
ALTER TABLE fragment_atmosphere ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragment_scenes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_options       ENABLE ROW LEVEL SECURITY;

-- Authenticated players can read game content
CREATE POLICY "auth read fragment_atmosphere"
  ON fragment_atmosphere FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth read fragment_scenes"
  ON fragment_scenes FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth read scene_options"
  ON scene_options FOR SELECT TO authenticated USING (true);

-- ─── Migrate existing exploration_nodes data ────────────────────────────────
-- layer_index=0 rows → fragment_atmosphere
INSERT INTO fragment_atmosphere (story_fragment_id, atmosphere_text)
SELECT story_fragment_id, atmosphere_text
FROM   exploration_nodes
WHERE  layer_index = 0
  AND  atmosphere_text IS NOT NULL
  AND  atmosphere_text <> ''
ON CONFLICT DO NOTHING;

-- layer_index>=1 rows → fragment_scenes (scenes) + scene_options (options)
-- NOTE: Must use two CTEs so the main INSERT joins against RETURNING data
-- (PostgreSQL CTE snapshot: rows inserted by a CTE are invisible to a JOIN
--  against the same table in the same statement — use RETURNING instead)
WITH
inserted_scenes AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text)
  SELECT gen_random_uuid(), story_fragment_id, layer_index, atmosphere_text
  FROM   exploration_nodes
  WHERE  layer_index >= 1
    AND  atmosphere_text IS NOT NULL
  RETURNING id, story_fragment_id, layer_index
),
expanded_opts AS (
  SELECT en.story_fragment_id, en.layer_index, jsonb_array_elements(en.options) AS opt
  FROM   exploration_nodes en
  WHERE  en.layer_index >= 1
    AND  en.options IS NOT NULL
    AND  jsonb_array_length(en.options) > 0
)
INSERT INTO scene_options (scene_id, text, is_correct, fail_text)
SELECT
  s.id,
  (eo.opt->>'text')::TEXT,
  (eo.opt->>'is_correct')::BOOLEAN,
  COALESCE(eo.opt->>'fail_text', '')
FROM expanded_opts eo
JOIN inserted_scenes s
  ON s.story_fragment_id = eo.story_fragment_id
 AND s.layer_index = eo.layer_index
ON CONFLICT DO NOTHING;
