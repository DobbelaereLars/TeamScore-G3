PRAGMA foreign_keys
= ON;

-- =========================
-- Types (vaste keuzes UI)
-- =========================
CREATE TABLE
IF NOT EXISTS game_mode
(
  id    INTEGER PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,      -- 'SINGLE','SERIES','PARALLEL'
  name  TEXT NOT NULL
);

CREATE TABLE
IF NOT EXISTS score_model
(
  id    INTEGER PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,      -- 'POINTS','TIME','COMPLETED'
  name  TEXT NOT NULL
);

CREATE TABLE
IF NOT EXISTS ranking_rule
(
  id    INTEGER PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,      -- 'FASTEST_WINS','SLOWEST_WINS'
  name  TEXT NOT NULL
);

-- =========================
-- Core entities
-- =========================
CREATE TABLE
IF NOT EXISTS player
(
  id           TEXT PRIMARY KEY,   -- UUID
  created_at   TEXT NOT NULL,      -- ISO8601
  display_name TEXT NOT NULL
);

CREATE TABLE
IF NOT EXISTS team
(
  id          TEXT PRIMARY KEY,    -- UUID
  created_at  TEXT NOT NULL,
  name        TEXT NOT NULL
);

CREATE TABLE
IF NOT EXISTS team_member
(
  team_id    TEXT NOT NULL REFERENCES team
(id) ON
DELETE CASCADE,
  player_id  TEXT
NOT NULL REFERENCES player
(id) ON
DELETE CASCADE,
  PRIMARY KEY (team_id, player_id)
);

-- =========================
-- Session (één "aangemaakte game")
-- =========================
CREATE TABLE
IF NOT EXISTS session
(
  id              TEXT PRIMARY KEY,     -- UUID
  created_at      TEXT NOT NULL,
  name            TEXT,                 -- bv. "Sporting 05/01/2026"

  game_mode_id    INTEGER NOT NULL REFERENCES game_mode
(id),

  -- spelstructuur (rondes/sets zoals screenshot)
  use_rounds      INTEGER NOT NULL DEFAULT 0 CHECK
(use_rounds IN
(0,1)),
  rounds_count    INTEGER NOT NULL DEFAULT 1 CHECK
(rounds_count >= 1),

  use_sets        INTEGER NOT NULL DEFAULT 0 CHECK
(use_sets IN
(0,1)),
  sets_per_round  INTEGER NOT NULL DEFAULT 1 CHECK
(sets_per_round >= 1),

  -- default scoremodel (voor SINGLE, en als startwaarde bij SERIES/PARALLEL)
  default_score_model_id INTEGER NOT NULL REFERENCES score_model
(id)
);

-- In SINGLE: typisch 1 rij; in SERIES/PARALLEL: meerdere games in de reeks
CREATE TABLE
IF NOT EXISTS session_game
(
  id             TEXT PRIMARY KEY,  -- UUID
  session_id     TEXT NOT NULL REFERENCES session
(id) ON
DELETE CASCADE,
  sort_order     INTEGER
NOT NULL,  -- 1..n (tabs Spel 1/2/3)
  name           TEXT,              -- optioneel label

  score_model_id INTEGER NOT NULL REFERENCES score_model
(id),

  UNIQUE
(session_id, sort_order)
);

-- =========================
-- Participants in a session
-- (speler of team, polymorf)
-- =========================
CREATE TABLE
IF NOT EXISTS session_participant
(
  id               TEXT PRIMARY KEY,   -- UUID
  session_id        TEXT NOT NULL REFERENCES session
(id) ON
DELETE CASCADE,
  participant_type  TEXT
NOT NULL CHECK
(participant_type IN
('PLAYER','TEAM')),
  participant_id    TEXT NOT NULL,      -- player.id of team.id
  display_name      TEXT,               -- snapshot (optioneel)
  UNIQUE
(session_id, participant_type, participant_id)
);

-- =========================
-- Rounds & sets (concrete historiek)
-- =========================
CREATE TABLE
IF NOT EXISTS session_round
(
  id              TEXT PRIMARY KEY,  -- UUID
  session_game_id  TEXT NOT NULL REFERENCES session_game
(id) ON
DELETE CASCADE,
  round_index      INTEGER
NOT NULL CHECK
(round_index >= 1),
  UNIQUE
(session_game_id, round_index)
);

CREATE TABLE
IF NOT EXISTS session_set
(
  id               TEXT PRIMARY KEY, -- UUID
  session_round_id  TEXT NOT NULL REFERENCES session_round
(id) ON
DELETE CASCADE,
  set_index         INTEGER
NOT NULL CHECK
(set_index >= 1),
  UNIQUE
(session_round_id, set_index)
);

-- =========================
-- Score entries (per game OR per round/set)
-- Voor POINTS: points_value
-- Voor TIME:   time_ms_value
-- Voor COMPLETED: completed_value
-- =========================
CREATE TABLE
IF NOT EXISTS score_entry
(
  id                    TEXT PRIMARY KEY, -- UUID
  session_game_id        TEXT NOT NULL REFERENCES session_game
(id) ON
DELETE CASCADE,
  session_participant_id TEXT
NOT NULL REFERENCES session_participant
(id) ON
DELETE CASCADE,

  -- Target (exact 1): game-level OR set-level
  session_round_id       TEXT
REFERENCES session_round
(id) ON
DELETE CASCADE,
  session_set_id         TEXT
REFERENCES session_set
(id)   ON
DELETE CASCADE,

  points_value           INTEGER,
  time_ms_value          INTEGER
CHECK
(time_ms_value IS NULL OR time_ms_value >= 0),
  completed_value        INTEGER CHECK
(completed_value IS NULL OR completed_value IN
(0,1)),

  created_at             TEXT NOT NULL,

  CHECK
(
    (session_round_id IS NULL AND session_set_id IS NULL) OR
(session_round_id IS NOT NULL AND session_set_id IS NULL) OR
(session_round_id IS NULL AND session_set_id IS NOT NULL)
  )
);

-- =========================
-- Scoremodel settings (per SESSION of per SESSION_GAME)
-- Voltooid/niet voltooid: geen settings tabel/rijen.
-- =========================
CREATE TABLE
IF NOT EXISTS points_settings
(
  scope_type              TEXT NOT NULL CHECK
(scope_type IN
('SESSION','SESSION_GAME')),
  scope_id                TEXT NOT NULL,  -- session.id of session_game.id
  points_per_action       INTEGER NOT NULL DEFAULT 1 CHECK
(points_per_action >= 0),
  use_bonus_points        INTEGER NOT NULL DEFAULT 0 CHECK
(use_bonus_points IN
(0,1)),
  bonus_points_per_action INTEGER NOT NULL DEFAULT 1 CHECK
(bonus_points_per_action >= 0),
  PRIMARY KEY
(scope_type, scope_id)
);

CREATE TABLE
IF NOT EXISTS time_settings
(
  scope_type        TEXT NOT NULL CHECK
(scope_type IN
('SESSION','SESSION_GAME')),
  scope_id          TEXT NOT NULL,
  ranking_rule_id   INTEGER NOT NULL REFERENCES ranking_rule
(id), -- snelste/traagste
  time_notation     TEXT NOT NULL, -- bv 'mm:ss' of 'mm:ss.SS'
  PRIMARY KEY
(scope_type, scope_id)
);

-- =========================
-- Seed data (3 spelmodussen, 3 scoremodellen)
-- =========================
INSERT OR
IGNORE INTO game_mode (id, code, name)
VALUES
    (1, 'SINGLE', 'Scoreboard voor één game'),
    (2, 'SERIES', 'Serie van games'),
    (3, 'PARALLEL', 'Parallelle games');

INSERT OR
IGNORE INTO score_model (id, code, name)
VALUES
    (1, 'POINTS', 'Puntenscore'),
    (2, 'TIME', 'Tijdscore'),
    (3, 'COMPLETED', 'Voltooid / niet voltooid');

INSERT OR
IGNORE INTO ranking_rule (id, code, name)
VALUES
    (1, 'FASTEST_WINS', 'Snelste tijd wint'),
    (2, 'SLOWEST_WINS', 'Traagste tijd wint');