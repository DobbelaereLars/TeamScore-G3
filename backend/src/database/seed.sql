-- ============================================
-- TESTDATA - NIET VOOR PRODUCTIE
-- Voer dit bestand uit met: node backend/src/database/seed.js
-- ============================================

-- Test Players
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Alice');
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Bob');
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Charlie');
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Diana');
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Eve');
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Frank');

-- Test Teams
INSERT OR
IGNORE INTO Team (name)
VALUES
    ('Team Red');
INSERT OR
IGNORE INTO Team (name)
VALUES
    ('Team Blue');
INSERT OR
IGNORE INTO Team (name)
VALUES
    ('Team Green');

-- Test TeamPlayer assignments
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (1, 1);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (1, 2);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (2, 3);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (2, 4);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (3, 5);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (3, 6);

-- Test ScoreModels
INSERT OR
IGNORE INTO ScoreModel (type, has_bonus, ranking_rule, config_json)
VALUES
    ('points', 1, 'highest_wins', '{"max_points": 100}');
INSERT OR
IGNORE INTO ScoreModel (type, has_bonus, ranking_rule, config_json)
VALUES
    ('time', 0, 'lowest_wins', '{"format": "mm:ss"}');
INSERT OR
IGNORE INTO ScoreModel (type, has_bonus, ranking_rule, config_json)
VALUES
    ('boolean', 0, 'highest_wins', '{"pass_fail": true}');

-- Test Session 1: Players only, single game
INSERT OR
IGNORE INTO Session (name, participant_mode, game_mode)
VALUES
    ('Quiz Night', 'players', 'single');

-- Test Session 2: Teams, series
INSERT OR
IGNORE INTO Session (name, participant_mode, game_mode)
VALUES
    ('Team Olympics', 'teams', 'series');

-- Test Session 3: Teams with players, parallel
INSERT OR
IGNORE INTO Session (name, participant_mode, game_mode)
VALUES
    ('Mixed Tournament', 'teams_with_players', 'parallel');

-- Participants for Session 1 (players only)
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (1, 'player', 1, NULL);
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (1, 'player', 2, NULL);
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (1, 'player', 3, NULL);
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (1, 'player', 4, NULL);

-- Participants for Session 2 (teams only)
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (2, 'team', NULL, 1);
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (2, 'team', NULL, 2);
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (2, 'team', NULL, 3);

-- Participants for Session 3 (teams with players)
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (3, 'team', NULL, 1);
INSERT OR
IGNORE INTO Participant (session_id, type, player_id, team_id)
VALUES
    (3, 'team', NULL, 2);

-- Games for Session 1
INSERT OR
IGNORE INTO Game (session_id, name, rounds, sets, score_model_id, is_finished)
VALUES
    (1, 'Trivia Round', 3, 1, 1, 1);

-- Games for Session 2
INSERT OR
IGNORE INTO Game (session_id, name, rounds, sets, score_model_id, is_finished)
VALUES
    (2, 'Sprint Race', 1, 5, 2, 1);
INSERT OR
IGNORE INTO Game (session_id, name, rounds, sets, score_model_id, is_finished)
VALUES
    (2, 'Obstacle Course', 1, 3, 1, 0);

-- Games for Session 3
INSERT OR
IGNORE INTO Game (session_id, name, rounds, sets, score_model_id, is_finished)
VALUES
    (3, 'Puzzle Challenge', 2, 1, 3, 1);
INSERT OR
IGNORE INTO Game (session_id, name, rounds, sets, score_model_id, is_finished)
VALUES
    (3, 'Memory Game', 3, 1, 1, 0);

-- Scores for Game 1 (Session 1, finished)
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, 1, 85, 10, 1);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, 2, 72, 5, 3);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, 3, 78, 8, 2);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, 4, 65, 0, 4);

-- Scores for Game 2 (Session 2, Sprint Race - time based, finished)
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_time, rank)
VALUES
    (2, 5, 45.3, 2);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_time, rank)
VALUES
    (2, 6, 42.1, 1);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_time, rank)
VALUES
    (2, 7, 48.7, 3);

-- Scores for Game 4 (Session 3, Puzzle Challenge - boolean, finished)
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_bool, rank)
VALUES
    (4, 8, 1, 1);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_bool, rank)
VALUES
    (4, 9, 0, 2);

-- FinalScores for Session 1 (finished session)
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank)
VALUES
    (1, 1, 95, 1);
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank)
VALUES
    (1, 3, 86, 2);
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank)
VALUES
    (1, 2, 77, 3);
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank)
VALUES
    (1, 4, 65, 4);

-- FinalScores for Session 2 (finished sprint race)
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_time, final_rank)
VALUES
    (2, 5, 42.1, 1);
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_time, final_rank)
VALUES
    (2, 6, 45.3, 2);
INSERT OR
IGNORE INTO FinalScore (session_id, participant_id, total_time, final_rank)
VALUES
    (2, 7, 48.7, 3);
