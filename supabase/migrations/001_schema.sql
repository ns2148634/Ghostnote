-- ╔══════════════════════════════════════════╗
-- ║  靈異筆記 — DB Schema                   ║
-- ╚══════════════════════════════════════════╝

-- ── System tables (no RLS) ─────────────────

CREATE TABLE stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  difficulty    TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  creature_type TEXT,
  creature_description TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE story_fragments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id          UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  layer             TEXT NOT NULL CHECK (layer IN ('basic','detail','lore')),
  difficulty        TEXT NOT NULL CHECK (difficulty IN ('normal','hard')),
  text              TEXT NOT NULL,
  time_condition    TEXT CHECK (time_condition IN ('dawn','day','dusk','night')),
  weather_condition TEXT CHECK (weather_condition IN ('clear','cloudy','rain','fog')),
  date_condition    TEXT,
  motif_tags        TEXT[] DEFAULT '{}',
  is_user_submitted BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exploration_nodes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_fragment_id   UUID NOT NULL REFERENCES story_fragments(id) ON DELETE CASCADE,
  layer_index         INTEGER NOT NULL,  -- 0 = atmosphere (free)  1+ = choice layers
  atmosphere_text     TEXT NOT NULL,
  options             JSONB,             -- [{text, is_correct, fail_text}]  null for layer 0
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON exploration_nodes(story_fragment_id, layer_index);

-- ── Player tables (RLS enabled) ────────────

CREATE TABLE players (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL DEFAULT '無名靈探',
  stamina             INTEGER NOT NULL DEFAULT 10 CHECK (stamina BETWEEN 0 AND 10),
  stamina_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  currency            INTEGER NOT NULL DEFAULT 0,
  sealed_count        INTEGER NOT NULL DEFAULT 0,
  push_subscription   JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notebooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '新筆記本',
  capacity    INTEGER NOT NULL DEFAULT 15,
  type        TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal','shared')),
  status      TEXT NOT NULL DEFAULT 'active'   CHECK (status IN ('active','sealed')),
  story_id    UUID REFERENCES stories(id),
  sealed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON notebooks(player_id, status);

CREATE TABLE fragments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  story_fragment_id UUID NOT NULL REFERENCES story_fragments(id),
  notebook_id       UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  player_tag        TEXT,
  obtained_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON fragments(notebook_id);
CREATE INDEX ON fragments(player_id);

CREATE TABLE creature_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  story_id        UUID NOT NULL REFERENCES stories(id),
  unlocked_layer  TEXT NOT NULL CHECK (unlocked_layer IN ('basic','detail','lore')),
  obtained_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, story_id, unlocked_layer)
);

CREATE TABLE meta_horror_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_type   INTEGER NOT NULL CHECK (event_type BETWEEN 1 AND 4),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_id    UUID
);

-- ── Row Level Security ─────────────────────

ALTER TABLE players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE creature_pages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_horror_events ENABLE ROW LEVEL SECURITY;

-- players: own row only
CREATE POLICY "players_own"  ON players
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- notebooks: own rows only
CREATE POLICY "notebooks_own" ON notebooks
  USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- fragments: own rows only
CREATE POLICY "fragments_own" ON fragments
  USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- creature_pages: own rows only
CREATE POLICY "creature_pages_own" ON creature_pages
  USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- meta_horror_events: own rows only
CREATE POLICY "meta_horror_own" ON meta_horror_events
  USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- System tables: readable by all authenticated users, not writable
ALTER TABLE stories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_fragments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_read"  ON stories           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sf_read"       ON story_fragments   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "nodes_read"    ON exploration_nodes FOR SELECT USING (auth.role() = 'authenticated');
