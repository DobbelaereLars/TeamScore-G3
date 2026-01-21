-- ====================================================================================
-- DEEL 1: STANDAARD DATA
-- ====================================================================================

INSERT OR IGNORE INTO ScoreModel (id, type, has_bonus, ranking_rule, config_json) VALUES 
(1, 'points', 1, 'highest_wins', '{"label": "Standaard Punten"}'),
(2, 'time', 1, 'lowest_wins', '{"label": "Tijdrit", "format": "mm:ss"}'),
(3, 'boolean', 0, 'highest_wins', '{"label": "Voltooid/Niet"}');

-- ====================================================================================
-- DEEL 2: DUMMY DATA
-- ====================================================================================

-- Spelers (8 spelers voor full leaderboard test)
INSERT OR IGNORE INTO Player (name) VALUES 
('Alice'), ('Bob'), ('Charlie'), ('David'), 
('Eve'), ('Frank'), ('Grace'), ('Heidi');

-- Sessie 1
INSERT OR IGNORE INTO Session (id, name, participant_mode, game_mode, status) VALUES 
(1, 'Finale Sessie', 'players', 'single', 'finished');

-- Game 1
INSERT OR IGNORE INTO Game (id, session_id, name, rounds, sets, score_model_id, is_finished, points_per_click, bonus_points) VALUES 
(1, 1, 'Grote Finale', 1, 1, 1, 1, 10, 5);

-- Participants (Koppel alle 8 spelers aan Game 1)
INSERT OR IGNORE INTO Participant (id, game_id, type, player_id) VALUES 
(1, 1, 'player', 1), -- Alice
(2, 1, 'player', 2), -- Bob
(3, 1, 'player', 3), -- Charlie
(4, 1, 'player', 4), -- David
(5, 1, 'player', 5), -- Eve
(6, 1, 'player', 6), -- Frank
(7, 1, 'player', 7), -- Grace
(8, 1, 'player', 8); -- Heidi

-- Scores (Game 1)
INSERT OR IGNORE INTO Score (game_id, participant_id, value_number, rank) VALUES 
(1, 1, 150, 1), -- Alice
(1, 2, 140, 2), -- Bob
(1, 3, 130, 3), -- Charlie
(1, 4, 120, 4), -- David
(1, 5, 110, 5), -- Eve
(1, 6, 100, 6), -- Frank
(1, 7, 90, 7),  -- Grace
(1, 8, 80, 8);  -- Heidi

-- Final Scores (Sessie 1)
-- MOET OOK wordne ingevuld voor de FinalScore tab
INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES 
(1, 1, 150, 1), -- Alice
(1, 2, 140, 2), -- Bob
(1, 3, 130, 3), -- Charlie
(1, 4, 120, 4), -- David
(1, 5, 110, 5), -- Eve
(1, 6, 100, 6), -- Frank
(1, 7, 90, 7),  -- Grace
(1, 8, 80, 8);  -- Heidi
