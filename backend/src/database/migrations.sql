-- Session table
CREATE TABLE
IF NOT EXISTS Session
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    participant_mode TEXT NOT NULL CHECK
(
      participant_mode IN
('players', 'teams', 'teams_with_players')
    ),
    game_mode TEXT NOT NULL CHECK
(game_mode IN
('single', 'series', 'parallel')),
    status TEXT DEFAULT 'created' CHECK
(status IN
('created', 'in_progress', 'finished')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

-- ScoreModel table
CREATE TABLE
IF NOT EXISTS ScoreModel
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK
(type IN
('points', 'time', 'boolean')),
    has_bonus INTEGER DEFAULT 0 CHECK
(has_bonus IN
(0, 1)),
    ranking_rule TEXT NOT NULL CHECK
(ranking_rule IN
('highest_wins', 'lowest_wins')),
    config_json TEXT
  );

-- Game table
CREATE TABLE
IF NOT EXISTS Game
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    rounds INTEGER,
    sets INTEGER,
    score_model_id INTEGER NOT NULL,
    is_finished INTEGER DEFAULT 0 CHECK
(is_finished IN
(0, 1)),
    points_per_click REAL,
    bonus_points REAL,
    FOREIGN KEY
(session_id) REFERENCES Session
(id) ON
DELETE CASCADE,
    FOREIGN KEY (score_model_id)
REFERENCES ScoreModel
(id)
  );

-- Player table
CREATE TABLE
IF NOT EXISTS Player
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

-- Team table
CREATE TABLE
IF NOT EXISTS Team
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

-- TeamPlayer table
CREATE TABLE
IF NOT EXISTS TeamPlayer
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    UNIQUE
(team_id, player_id),
    FOREIGN KEY
(team_id) REFERENCES Team
(id) ON
DELETE CASCADE,
    FOREIGN KEY (player_id)
REFERENCES Player
(id) ON
DELETE CASCADE
  );

-- Participant table
CREATE TABLE
IF NOT EXISTS Participant
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK
(type IN
('player', 'team')),
    player_id INTEGER,
    team_id INTEGER,
    CHECK
(
      (
        type = 'player'
        AND player_id IS NOT NULL
        -- team_id mag NULL zijn (individueel) of ingevuld (onderdeel van team)
      )
      OR
(
        type = 'team'
        AND team_id IS NOT NULL
        AND player_id IS NULL
      )
    ),
    FOREIGN KEY
(game_id) REFERENCES Game
(id) ON
DELETE CASCADE,
    FOREIGN KEY (player_id)
REFERENCES Player
(id),
    FOREIGN KEY
(team_id) REFERENCES Team
(id)
  );

-- Score table
CREATE TABLE
IF NOT EXISTS Score
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    value_number REAL,
    value_time REAL,
    value_bool INTEGER,
    bonus REAL DEFAULT 0,
    rank INTEGER,
    UNIQUE
(game_id, participant_id),
    FOREIGN KEY
(game_id) REFERENCES Game
(id) ON
DELETE CASCADE,
    FOREIGN KEY (participant_id)
REFERENCES Participant
(id) ON
DELETE CASCADE
  );

-- FinalScore table
CREATE TABLE
IF NOT EXISTS FinalScore
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    total_points REAL,
    total_time REAL,
    final_rank INTEGER,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE
(session_id, participant_id),
    FOREIGN KEY
(session_id) REFERENCES Session
(id) ON
DELETE CASCADE,
    FOREIGN KEY (participant_id)
REFERENCES Participant
(id) ON
DELETE CASCADE
  );
