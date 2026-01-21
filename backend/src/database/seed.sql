-- ====================================================================================
-- DEEL 1: STANDAARD DATA
-- ====================================================================================

INSERT OR
IGNORE INTO ScoreModel (id, type, has_bonus, ranking_rule, config_json)
VALUES
    (1, 'points', 1, 'highest_wins', '{"label": "Standaard Punten"}'),
    (2, 'time', 1, 'lowest_wins', '{"label": "Tijdrit", "format": "mm:ss"}'),
    (3, 'boolean', 0, 'highest_wins', '{"label": "Voltooid/Niet"}');

-- ====================================================================================
-- DEEL 2: DUMMY DATA
-- ====================================================================================

-- Spelers
INSERT OR
IGNORE INTO Player (name)
VALUES
    ('Alice Langenaammens');
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
    ('David');

-- Sessie 1: Demo Sessie
-- Mode: Players (Individueel)
-- Game Mode: Series (Meerdere games na elkaar)
INSERT OR
IGNORE INTO Session (id, name, participant_mode, game_mode)
VALUES
    (1, 'Demo Sessie', 'players', 'series');

-- Games in Sessie 1
-- Game 1: Punten spel (Iedereen doet mee)
INSERT OR
IGNORE INTO Game (id, session_id, name, rounds, sets, current_set, score_model_id, is_finished, points_per_click, bonus_points)
VALUES
    (1, 1, 'Punten Spel', 3, 4, 1, 1, 1, 5, 10);

-- Game 2: Tijds spel (Slechts 2 spelers doen mee)
INSERT OR
IGNORE INTO Game (id, session_id, name, rounds, sets, current_set, score_model_id, is_finished, points_per_click, bonus_points)
VALUES
    (2, 1, 'Tijdrit Finale', 2, 2, 1, 2, 0, NULL, 5);

-- Game 3: Boolean spel (Alice en Bob)
INSERT OR
IGNORE INTO Game (id, session_id, name, rounds, sets, current_set, score_model_id, is_finished, points_per_click, bonus_points)
VALUES
    (3, 1, 'Succes Challenge', 1, 1, 1, 3, 0, NULL, 0);

-- Participanten (Gekoppeld aan Game ID, niet meer aan Sessie ID)

-- Game 1: Iedereen (4 spelers)
-- Note: id's for participants will auto-increment. Assuming order: 1, 2, 3, 4
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (1, 'player', 1);
-- Alice
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (1, 'player', 2);
-- Bob
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (1, 'player', 3);
-- Charlie
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (1, 'player', 4);
-- David

-- Game 2: Enkel Alice en Charlie
-- Note: id's will be 5, 6
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (2, 'player', 1);
-- Alice
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (2, 'player', 3);
-- Charlie

-- Game 3 Participants
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (3, 'player', 1);
-- Alice
INSERT OR
IGNORE INTO Participant (game_id, type, player_id)
VALUES
    (3, 'player', 2);
-- Bob

-- Scores

-- Game 1 (Finished): Alice wint, Bob 2e, Charlie 3e
-- Alice: 50 punten + 10 bonus
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, (SELECT id
        FROM Participant
        WHERE game_id=1 AND player_id=1), 50, 10, 1);

-- Charlie: 40 punten + 0 bonus
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, (SELECT id
        FROM Participant
        WHERE game_id=1 AND player_id=3), 40, 0, 2);

-- Bob: 30 punten + 0 bonus
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, (SELECT id
        FROM Participant
        WHERE game_id=1 AND player_id=2), 30, 0, 3);

-- David: 10 punten
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus, rank)
VALUES
    (1, (SELECT id
        FROM Participant
        WHERE game_id=1 AND player_id=4), 10, 0, 4);


-- Game 2 (On finished): Voorlopige tijden
-- Alice: 120.5 seconden
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_time, bonus, rank)
VALUES
    (2, (SELECT id
        FROM Participant
        WHERE game_id=2 AND player_id=1), 120.5, 0, 1);

-- Charlie: 125.0 seconden
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_time, bonus, rank)
VALUES
    (2, (SELECT id
        FROM Participant
        WHERE game_id=2 AND player_id=3), 125.0, 0, 2);

-- Game 3 Scores (Boolean)
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_bool, rank)
VALUES
    (3, (SELECT id
        FROM Participant
        WHERE game_id=3 AND player_id=1), 1, 1);
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_bool, rank)
VALUES
    (3, (SELECT id
        FROM Participant
        WHERE game_id=3 AND player_id=2), 0, 2);

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

-- ====================================================================================
-- DEEL 4: TEAMS MET SPELERS SCENARIO
-- ====================================================================================

-- Nieuwe spelers voor teams
INSERT OR
IGNORE INTO Player (id, name)
VALUES
    (10, 'Team Rood Speler 1');
INSERT OR
IGNORE INTO Player (id, name)
VALUES
    (11, 'Team Rood Speler 2');
INSERT OR
IGNORE INTO Player (id, name)
VALUES
    (12, 'Team Blauw Speler 1');
INSERT OR
IGNORE INTO Player (id, name)
VALUES
    (13, 'Team Blauw Speler 2');

-- Teams
INSERT OR
IGNORE INTO Team (id, name)
VALUES
    (1, 'Team Rood');
INSERT OR
IGNORE INTO Team (id, name)
VALUES
    (2, 'Team Blauw');

-- Spelers koppelen aan teams
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (1, 10);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (1, 11);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (2, 12);
INSERT OR
IGNORE INTO TeamPlayer (team_id, player_id)
VALUES
    (2, 13);

-- Sessie 4: Team Battle
INSERT OR
IGNORE INTO Session (id, name, participant_mode, game_mode)
VALUES
    (4, 'Team Battle', 'teams_with_players', 'series');

-- Game 10: Team Punten Strijd
INSERT OR
IGNORE INTO Game (id, session_id, name, rounds, sets, current_set, score_model_id, is_finished, points_per_click, bonus_points)
VALUES
    (10, 4, 'Team Punten Strijd', 2, 1, 1, 1, 0, 10, 25);

-- Participants (Spelers, maar gelinkt aan ID)
INSERT OR
IGNORE INTO Participant (game_id, type, player_id, team_id)
VALUES
    (10, 'player', 10, 1);
INSERT OR
IGNORE INTO Participant (game_id, type, player_id, team_id)
VALUES
    (10, 'player', 11, 1);
INSERT OR
IGNORE INTO Participant (game_id, type, player_id, team_id)
VALUES
    (10, 'player', 12, 2);
INSERT OR
IGNORE INTO Participant (game_id, type, player_id, team_id)
VALUES
    (10, 'player', 13, 2);

-- Scores (Initieel 0)
INSERT OR
IGNORE INTO Score (game_id, participant_id, value_number, bonus)
VALUES
    (10, (SELECT id
        FROM Participant
        WHERE game_id=10 AND player_id=10), 0, 0),
    (10, (SELECT id
        FROM Participant
        WHERE game_id=10 AND player_id=11), 0, 0),
    (10, (SELECT id
        FROM Participant
        WHERE game_id=10 AND player_id=12), 0, 0),
    (10, (SELECT id
        FROM Participant
        WHERE game_id=10 AND player_id=13), 0, 0);

