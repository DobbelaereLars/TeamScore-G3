<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  TransitionGroup,
} from 'vue';
import { useRouter } from 'vue-router';
import {
  sessionRepository,
  scoreRepository,
  gameRepository,
} from '../services/api';
import { previewStore } from '../store/previewStore';
import socket from '../utils/socket';
import HostPlayerItem from '../components/HostPlayerItem.vue';
import Button from '../components/Button.vue';
import TeamTabButton from '../components/TeamTabButton.vue';
import LogoHeader from '../components/Logo.vue';
import Modal from '../components/Modal.vue';
import CustomSelect from '../components/CustomSelect.vue';
import { Cog, Flame, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const currentSessionId = sessionStorage.getItem('sessionId');
const currentSession = ref(null);
const pendingScoreUpdates = ref([]); // Track in-flight score updates

const isTransitioning = ref(false);
const isGeneratingPreview = ref(false);

// Games from DB
const games = ref([]);

const selectedGameId = ref(null);
const accumulatedScores = ref({}); // { [participantId]: number }
const selectedBonusParticipants = ref([]);

const activeTeamId = ref(null);
const activeModalTeamId = ref(null);

watch(selectedGameId, (newId) => {
  if (newId) {
    socket.emit('display:selected-game', {
      gameId: newId,
      sessionId: currentSessionId,
    });
    sessionStorage.setItem('lastSelectedGameId', newId);
  }
});

// Responsive breakpoint voor size
const windowWidth = ref(window.innerWidth);
const playerItemSize = computed(() => {
  if (windowWidth.value >= 768) return 'large';
  return 'default';
});

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(async () => {
  window.addEventListener('resize', handleResize);

  socket.on('score:update', handleScoreUpdate);

  try {
    const sessionResponse = await sessionRepository.getById(currentSessionId);
    currentSession.value = sessionResponse.data;

    const response = await sessionRepository.getGames(currentSessionId);
    games.value = response.data;
    if (games.value.length > 0) {
      // Check for persisted selection
      const lastId = sessionStorage.getItem('lastSelectedGameId');
      if (lastId && games.value.find((g) => g.id == lastId)) {
        selectedGameId.value = Number(lastId);
      } else {
        selectedGameId.value = games.value[0].id;
      }

      // Check for pending transition recovery
      const pendingTransition = sessionStorage.getItem('gameTransition');
      if (pendingTransition) {
        try {
          const { gameId, startTime } = JSON.parse(pendingTransition);
          // Only if this matches the currently active (finished) game
          if (selectedGameId.value === gameId) {
            const elapsed = Date.now() - startTime;
            const remaining = 15000 - elapsed;

            // Check if we should preserve the timer (e.g. came from settings)
            const shouldPreserveTimer =
              sessionStorage.getItem('preserve_transition_timer') === 'true';
            sessionStorage.removeItem('preserve_transition_timer');

            if (remaining > 0 && shouldPreserveTimer) {
              isTransitioning.value = true;
              // Resume the timer
              setTimeout(() => {
                performGameSwitch(gameId);
                sessionStorage.removeItem('gameTransition');
                isTransitioning.value = false;
              }, remaining);
            } else {
              // Time exhausted OR user broke flow (Pause) -> switch immediately
              performGameSwitch(gameId);
              sessionStorage.removeItem('gameTransition');
            }
          }
        } catch (e) {
          console.error('Invalid transition data', e);
          sessionStorage.removeItem('gameTransition');
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch games for session 1:', error);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  socket.off('score:update', handleScoreUpdate);
});

// Huidige geselecteerde game
const currentGame = computed(() => {
  return games.value.find((game) => game.id === selectedGameId.value);
});

// Samengetelde scores laden voor time offset
watch(
  () => [
    currentGame.value?.id,
    currentGame.value?.currentSet,
    currentGame.value?.currentRound,
  ],
  ([gameId, currentSet, currentRound]) => {
    if (!gameId) return;

    if (currentGame.value?.score_type === 'time') {
      const key = `offsets_${gameId}_${currentSet || 1}_${currentRound || 1}`;
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          accumulatedScores.value = JSON.parse(stored);
        } else {
          accumulatedScores.value = {};
        }
      } catch (e) {
        console.error('Error loading offsets:', e);
        accumulatedScores.value = {};
      }
    } else {
      accumulatedScores.value = {};
    }
  },
  { immediate: true },
);

// Game opties voor de custom select
const gameOptions = computed(() => {
  return games.value.map((game) => ({
    value: game.id,
    label: game.name,
  }));
});

// Gesorteerde spelers van de huidige game met automatische rank
const sortedPlayers = computed(() => {
  if (!currentGame.value) return [];

  // Sorteer op punten (hoogste eerst)
  // We access p.bool to ensure reactivity when boolean scores are reset
  currentGame.value.players.forEach((p) => p.bool);

  const game = currentGame.value;
  const isTime = game.score_type === 'time';
  
  // Determine sort direction
  // Default: Time -> Lowest wins (Ascending). Points -> Highest wins (Descending).
  let isLowestWins = false;
  if (game.ranking_rule) {
    isLowestWins = game.ranking_rule === 'lowest_wins';
  } else {
    isLowestWins = isTime; // Default to lowest_wins (fastest) for time if rule missing
  }

  const sorted = [...currentGame.value.players].sort((a, b) => {
    let valA, valB;

    if (isTime) {
      // For time: null/undefined means "not played" -> always last
      valA = a.time;
      valB = b.time;
      
      const isNullA = valA === null || valA === undefined;
      const isNullB = valB === null || valB === undefined;
      
      // Null values always go to the bottom
      if (isNullA && isNullB) return 0;
      if (isNullA) return 1;
      if (isNullB) return -1;
    } else {
      valA = a.points || 0;
      valB = b.points || 0;
    }

    if (isLowestWins) {
      // Smallest wins (Ascending)
      return valA - valB;
    } else {
      // Highest wins (Descending)
      return valB - valA;
    }
  });

  // Voeg rank toe op basis van positie
  return sorted.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
});

// Check of er nog een volgende set is
const hasNextSet = computed(() => {
  if (!currentGame.value || !currentGame.value.sets) return false;
  return currentGame.value.currentSet < currentGame.value.sets;
});

// Check of er nog een volgende ronde is
const hasNextRound = computed(() => {
  if (!currentGame.value) return false;
  return currentGame.value.currentRound < currentGame.value.rounds;
});

const isTeamsWithPlayers = computed(() => {
  return currentSession.value?.participant_mode === 'teams_with_players';
});

const isSeries = computed(() => {
  return (
    currentSession.value?.game_mode === 'series-of-games' ||
    currentSession.value?.game_mode === 'series'
  );
});

const availableTeams = computed(() => {
  if (!currentGame.value?.players) return [];

  const teamsMap = new Map();
  currentGame.value.players.forEach((p) => {
    if (p.team_id && p.team_name) {
      if (!teamsMap.has(p.team_id)) {
        teamsMap.set(p.team_id, { id: p.team_id, name: p.team_name });
      }
    }
  });
  return Array.from(teamsMap.values());
});

// Set default active team when teams load
watch(
  availableTeams,
  (teams) => {
    if (teams.length > 0) {
      if (
        !activeTeamId.value ||
        !teams.find((t) => t.id === activeTeamId.value)
      ) {
        activeTeamId.value = teams[0].id;
      }
      if (
        !activeModalTeamId.value ||
        !teams.find((t) => t.id === activeModalTeamId.value)
      ) {
        activeModalTeamId.value = teams[0].id;
      }
    }
  },
  { immediate: true },
);

const filteredSortedPlayers = computed(() => {
  if (isTeamsWithPlayers.value && activeTeamId.value) {
    return sortedPlayers.value.filter((p) => p.team_id === activeTeamId.value);
  }
  return sortedPlayers.value;
});

const filteredBonusPlayers = computed(() => {
  if (isTeamsWithPlayers.value && activeModalTeamId.value) {
    return (
      currentGame.value?.players.filter(
        (p) => p.team_id === activeModalTeamId.value,
      ) || []
    );
  }
  return currentGame.value?.players || [];
});

const nextButtonLabel = computed(() => {
  if (hasNextSet.value) return 'Volgende set';
  // Fallback 'Volgende ronde' prevents empty button during closing transition
  return 'Volgende ronde';
});

const nextModalTitle = computed(() => {
  if (hasNextSet.value) return 'Naar de volgende set?';
  return 'Naar de volgende ronde?';
});

const nextModalText = computed(() => {
  if (hasNextSet.value)
    return 'Ben je zeker dat je naar de volgende set wilt gaan? Scores blijven behouden.';
  return 'Ben je zeker dat je naar de volgende ronde wilt gaan? Je kunt later nog steeds terugkeren om scores aan te passen.';
});

const handleScoreUpdate = (data) => {
  if (!currentGame.value || currentGame.value.id !== data.gameId) return;

  const player = currentGame.value.players.find(
    (p) => p.participantId === data.participantId,
  );
  if (player) {
    if (data.scoreType === 'points') player.points = data.score;
    else if (data.scoreType === 'time') {
      player.time = data.score;
      // Also update bool if implicit update came through
      player.bool = (data.score !== null && data.score !== undefined) ? 1 : 0;
    }
    else if (data.scoreType === 'boolean' || data.scoreType === 'bool')
      player.bool = data.score;
  }
};

const updatePlayerScore = async (participantId, newVal) => {
  if (!currentGame.value) return;

  // Optimistische update in UI
  const player = currentGame.value.players.find(
    (p) => p.participantId === participantId,
  );

  if (player) {
    const scoreType = currentGame.value.score_type || 'points';

    // Save old values
    const oldPoints = player.points;
    const oldTime = player.time;
    const oldBool = player.bool;

    // Apply new value
    if (scoreType === 'points') player.points = newVal;
    else if (scoreType === 'time') {
      if (newVal === null || newVal === '') {
        // Clearing input -> revert to accumulated offset (previous rounds)
        const offset = accumulatedScores.value[participantId];
        // If offset is undefined/null (round 1), set null
        player.time = (offset !== undefined && offset !== null) ? offset : null;
        player.bool = 0;
      } else {
        // ...
        const offset = accumulatedScores.value[participantId] || 0;
        player.time = Number(newVal) + offset;
        player.bool = 1;
      }
    } else if (scoreType === 'boolean') player.bool = newVal;

    // Stuur naar backend
    const valueToSend = scoreType === 'time' ? player.time : newVal;
    const extras = {};
    if (scoreType === 'time') {
        extras.bool = player.bool;
    }

    const updatePromise = scoreRepository
      .updateScore(currentGame.value.id, participantId, valueToSend, scoreType, extras)
      .then(() => {})
      .catch((error) => {
        console.error('Failed to update score:', error);
        // Rollback bij error
        if (scoreType === 'points') player.points = oldPoints;
        else if (scoreType === 'time') { player.time = oldTime; player.bool = oldBool; }
        else if (scoreType === 'boolean') player.bool = oldBool;
      });

    // Add to pending tracking
    pendingScoreUpdates.value.push(updatePromise);

    // Cleanup when done
    try {
      await updatePromise;
    } finally {
      pendingScoreUpdates.value = pendingScoreUpdates.value.filter(
        (p) => p !== updatePromise,
      );
    }
  }
};

const bonusAmount = computed(() => {
  if (!currentGame.value || !currentGame.value.bonus_points) return 0;
  return Number(currentGame.value.bonus_points);
});

const toggleBonusParticipant = (participantId) => {
  if (selectedBonusParticipants.value.includes(participantId)) {
    selectedBonusParticipants.value = selectedBonusParticipants.value.filter(
      (id) => id !== participantId,
    );
  } else {
    selectedBonusParticipants.value.push(participantId);
  }
};

const saveBonus = async () => {
  if (
    !currentGame.value ||
    selectedBonusParticipants.value.length === 0 ||
    bonusAmount.value === 0
  ) {
    document.getElementById('bonusmodal')?.close();
    return;
  }

  const amount = bonusAmount.value;
  const promises = selectedBonusParticipants.value.map((participantId) => {
    const player = currentGame.value.players.find(
      (p) => p.participantId === participantId,
    );
    if (player) {
      const newPoints = (player.points || 0) + amount;
      updatePlayerScore(participantId, newPoints); // This handles API + Optimistic UI
    }
  });

  await Promise.all(promises);

  selectedBonusParticipants.value = [];
  document.getElementById('bonusmodal')?.close();
};

const goToSettings = () => {
  // Also save preview before going to settings, just in case they don't come back? no.
  // Flag that we are intentionally navigating to settings, so transition timer should be preserved
  sessionStorage.setItem('preserve_transition_timer', 'true');
  router.push({
    name: 'ingame-settings',
    query: { gameId: selectedGameId.value },
  });
};

const goToNext = async () => {
  if (!currentGame.value) return;

  // 1. Capture current totals (BEFORE update) to use as offsets for the next round
  const newOffsets = {};
  if (currentGame.value.score_type === 'time') {
    currentGame.value.players.forEach((p) => {
      // Keep null if they haven't played, so if they reset next round, it stays null (unplayed)
      newOffsets[p.participantId] = p.time;
    });
  }

  if (hasNextSet.value) {
    currentGame.value.currentSet++;
  } else if (hasNextRound.value) {
    currentGame.value.currentRound++;
    if (currentGame.value.sets) {
      currentGame.value.currentSet = 1;
    }
  }

  // 2. Save offsets for the NEW state (so round 2 starts at 0 input)
  if (currentGame.value.score_type === 'time') {
    const key = `offsets_${currentGame.value.id}_${currentGame.value.currentSet || 1}_${currentGame.value.currentRound || 1}`;
    localStorage.setItem(key, JSON.stringify(newOffsets));
    accumulatedScores.value = newOffsets;

    // Reset bools regarding "Played This Round"
    try {
        await gameRepository.resetBools(currentGame.value.id);
        // Optimistic UI update
        currentGame.value.players.forEach(p => p.bool = 0);
    } catch(err) {
        console.error("Failed to reset round status", err);
    }

  } else if (
    currentGame.value.score_type === 'boolean' ||
    currentGame.value.score_type === 'bool'
  ) {
    // Reset local state for boolean games (backend does this too, but we need UI update immediately)
    currentGame.value.players.forEach((p) => {
      p.bool = 0; // Reset to Not Completed
    });
  }

  // Persist to backend
  try {
    await gameRepository.update(currentGame.value.id, {
      current_round: currentGame.value.currentRound,
      current_set: currentGame.value.currentSet,
    });

    // Notify display of round change
    socket.emit('display:update-game-info', {
      gameId: currentGame.value.id,
      gameName: currentGame.value.name,
      currentRound: currentGame.value.currentRound,
      totalRounds: currentGame.value.rounds,
      currentSet: currentGame.value.currentSet,
      totalSets: currentGame.value.sets,
    });
  } catch (error) {
    console.error('Failed to update game state:', error);
  }

  // Sluit de modal
  const modal = document.getElementById('nextround');
  if (modal) {
    modal.close();
  }
};

// Check of er nog een volgend spel is (voor series en parallel)
const hasNextGame = computed(() => {
  if (!currentGame.value || !games.value.length) return false;

  // Zoek de huidige game index
  const currentIndex = games.value.findIndex(
    (g) => g.id === currentGame.value.id,
  );
  if (currentIndex === -1) return false;

  // Is er een game na deze?
  return currentIndex < games.value.length - 1;
});

const isLastPhase = computed(() => {
  if (!currentGame.value) return false;
  // If no sets are used (sets=1 or null), check rounds
  const totalRounds = currentGame.value.rounds || 1;
  const currentRound = currentGame.value.currentRound || 1;

  if (currentGame.value.sets > 1) {
    const currentSet = currentGame.value.currentSet || 1;
    const totalSets = currentGame.value.sets;
    // Last set AND last round
    return currentSet === totalSets && currentRound === totalRounds;
  }

  return currentRound === totalRounds;
});

const areAllGamesInLastPhase = computed(() => {
  if (!games.value || games.value.length === 0) return false;
  return games.value.every((g) => {
    const totalRounds = g.rounds || 1;
    const currentRound = g.currentRound || 1;

    if ((g.sets || 1) > 1) {
      const currentSet = g.currentSet || 1;
      const totalSets = g.sets;
      return currentSet === totalSets && currentRound === totalRounds;
    }

    return currentRound === totalRounds;
  });
});

const canFinishParallel = computed(() => {
  const isParallel =
    currentSession.value?.game_mode === 'parallel-games' ||
    currentSession.value?.game_mode === 'parallel';

  if (!isParallel) return true;

  // In parallel, we can only finish (all) if all are in last phase
  return areAllGamesInLastPhase.value;
});

const shouldDisableMainButton = computed(() => {
  if (isTransitioning.value) return true;

  // In parallel mode:
  if (
    currentSession.value?.game_mode === 'parallel-games' ||
    currentSession.value?.game_mode === 'parallel'
  ) {
    // If we are in the last phase, we can only finish if ALL games are ready
    if (isLastPhase.value) {
      return !canFinishParallel.value;
    }
    // If NOT in last phase, this button is "Pause", so it should be ENABLED (disabled=false)
    return false;
  }

  // Not parallel: always enabled (unless transitioning)
  return false;
});

const endGameButtonText = computed(() => {
  // Explicitly check for parallel mode first
  if (
    currentSession.value?.game_mode === 'parallel-games' ||
    currentSession.value?.game_mode === 'parallel'
  ) {
    if (isLastPhase.value) {
      return canFinishParallel.value
        ? 'Beëindig alle spelen'
        : 'Wacht op andere spelen';
    }
    return 'Spel pauzeren';
  }

  // Als we in de laatste fase zijn
  if (isLastPhase.value) {
    // En er is nog een volgend spel in de serie
    if (hasNextGame.value && isSeries.value) {
      return 'Volgend spel';
    }
    // Anders is dit echt het einde van alles
    return 'Beëindig spel';
  }
  // Als we niet in de laatste fase zijn
  return 'Spel pauzeren';
});

const endGameModalTitle = computed(() => {
  if (currentSession.value?.game_mode === 'parallel-games') {
    return isLastPhase.value ? 'Alle spelen voltooien?' : 'Spel pauzeren?';
  }

  if (isLastPhase.value) {
    if (hasNextGame.value && isSeries.value) return 'Naar volgend spel?';
    return 'Spel voltooien?';
  }
  return 'Spel pauzeren?';
});

const endGameModalText = computed(() => {
  if (currentSession.value?.game_mode === 'parallel-games') {
    if (isLastPhase.value) {
      return 'Weet je zeker dat je ALLE parallelle spelen wilt beëindigen? De scores van alle games worden opgeslagen als eindresultaat.';
    }
    return 'Je staat op het punt het spel te stoppen/pauzeren voordat alle rondes of sets gespeeld zijn. De huidige scores worden opgeslagen en het spel kan later hervat worden.';
  }

  if (isLastPhase.value) {
    if (hasNextGame.value && isSeries.value) {
      return 'Je staat op het punt dit spel af te ronden en door te gaan naar het volgende spel in de reeks.';
    }
    return 'Weet je zeker dat je het spel wilt beëindigen? Hierna kun je geen scores meer wijzigen of rondes toevoegen. De scores worden opgeslagen als eindresultaat.';
  }
  return 'Je staat op het punt het spel te stoppen/pauzeren voordat alle rondes of sets gespeeld zijn. De huidige scores worden opgeslagen en het spel kan later hervat worden.';
});

const performGameSwitch = (currentGameId) => {
  const currentIndex = games.value.findIndex((g) => g.id === currentGameId);
  if (currentIndex !== -1 && currentIndex < games.value.length - 1) {
    // Zet volgende game id
    const nextGameId = games.value[currentIndex + 1].id;

    // Update lokale selectie
    selectedGameId.value = nextGameId;
    sessionStorage.setItem('lastSelectedGameId', nextGameId);

    // Forceer navigatie display naar scoreboard van NIEUWE game
    socket.emit('display:navigate', {
      name: 'display-scoreboard',
      params: { sessionId: currentSessionId, gameId: nextGameId },
    });
  }
};

const nextGame = async () => {
  // Check if ALREADY finished (recovery from reload/nav)
  const isAlreadyFinished = currentGame.value.is_finished === 1;

  // 1. Mark current game as finished
  isTransitioning.value = true;
  try {
    if (!isAlreadyFinished) {
      await gameRepository.update(currentGame.value.id, {
        is_finished: 1,
      });
      currentGame.value.is_finished = 1;

      // Toon tussenstand (Leaderboard) op Display
      socket.emit('display:navigate', {
        name: 'display-leaderboard',
        params: {
          sessionId: currentSessionId,
          gameId: currentGame.value.id,
        },
      });

      // Save transition state for recovery
      const transitionData = {
        gameId: currentGame.value.id,
        startTime: Date.now(),
      };
      sessionStorage.setItem('gameTransition', JSON.stringify(transitionData));
    }

    // Sluit modal meteen (UX)
    const modal = document.getElementById('endgame');
    if (modal) {
      modal.close();
    }

    // 3. Wacht 15 seconden (alleen als het net is afgerond)
    if (!isAlreadyFinished) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    // 4. Selecteer volgend spel voor DISPLAY (en onszelf)
    performGameSwitch(currentGame.value.id);

    // Clear transition state on success
    sessionStorage.removeItem('gameTransition');
  } catch (e) {
    console.error('Failed to update game finished status or transition:', e);
    // Fallback: close modal if error occurred before
    const modal = document.getElementById('endgame');
    if (modal && modal.open) {
      modal.close();
    }
  } finally {
    isTransitioning.value = false;
  }
};

const pauseGame = async () => {
  // 0. Ensure all scores are saved
  if (pendingScoreUpdates.value.length > 0) {
    await Promise.all(pendingScoreUpdates.value);
  }

  // 1. Generate preview FIRST
  if (currentGame.value) {
    isGeneratingPreview.value = true;
    try {
      await nextTick();
      // Give time for layout update or any pending renders
      await new Promise((r) => setTimeout(r, 300));

      // For Series/Parallel: ALWAYS show session overview (normalized points)
      // For Single game: show the game scores directly
      const isMultiGame =
        currentSession.value?.game_mode === 'series' ||
        currentSession.value?.game_mode === 'series-of-games' ||
        currentSession.value?.game_mode === 'parallel' ||
        currentSession.value?.game_mode === 'parallel-games';

      // Pass null for multi-game to get session overview (always points)
      // Pass gameId for single game to get raw scores (time/boolean/points)
      await previewStore.generate(
        currentSessionId,
        isMultiGame ? null : currentGame.value.id,
      );
    } catch (e) {
      console.error('Failed to generate preview on pause:', e);
    }
    sessionStorage.setItem('lastGenerateTime', Date.now());
  }

  // 2. Then update status and navigate
  try {
    await sessionRepository.update(currentSessionId, {
      status: 'in_progress',
    });
    // Navigate display
    socket.emit('display:navigate', {
      name: 'display-splash',
    });
  } catch (e) {
    console.error('Failed to update session status:', e);
  }

  isGeneratingPreview.value = false;
  router.push('/tablet');
};

const endGame = async () => {
  if (currentGame.value) {
    // Ensure all scores are saved FIRST
    if (pendingScoreUpdates.value.length > 0) {
      await Promise.all(pendingScoreUpdates.value);
    }

    const wasAlreadyFinished = currentGame.value.is_finished === 1;

    const isParallel =
      currentSession.value?.game_mode?.includes('parallel') ||
      currentSession.value?.game_mode === 'parallel';

    // SPECIAAL GEVAL: Volgend spel in serie
    // (Ensure this doesn't run for parallel)
    if (
      isLastPhase.value &&
      hasNextGame.value &&
      isSeries.value &&
      !isParallel
    ) {
      isGeneratingPreview.value = false;
      await nextGame();
      return;
    }

    const isFinished = isLastPhase.value ? 1 : 0;
    let finishSessionNow = false;

    // 1. Update Game Status
    try {
      if (isParallel && isFinished) {
        // Check if we really want to finish all games
        // Use sequential loop to avoid potential parallel write issues (SQLite locks etc)
        for (const g of games.value) {
          g.is_finished = 1;
          try {
            // Use dedicated finish endpoint for better reliability
            await gameRepository.finish(g.id);
          } catch (err) {
            console.error(`Failed to finish game ${g.id}:`, err);
          }
        }
        finishSessionNow = true;
      } else {
        await gameRepository.update(currentGame.value.id, {
          is_finished: isFinished,
        });
        currentGame.value.is_finished = isFinished;
      }
    } catch (e) {
      console.error('Failed to update game finished status:', e);
    }

    // 2. Check Session Status based on ALL games
    if (isLastPhase.value) {
      let allFinished = false;

      if (finishSessionNow) {
        // If we just forced finish all parallel games, assume true
        allFinished = true;
      } else {
        allFinished = games.value.every((g) => {
          if (g.id === currentGame.value.id) return isFinished === 1;
          return g.is_finished === 1;
        });
      }

      const newSessionStatus = allFinished ? 'finished' : 'in_progress';

      if (newSessionStatus === 'finished') {
        try {
          await sessionRepository.update(currentSessionId, {
            status: 'finished',
          });
        } catch (e) {
          console.error('Failed to update session status:', e);
        }

        // Generate preview AFTER all DB updates are complete
        if (!wasAlreadyFinished) {
          isGeneratingPreview.value = true;
          try {
            await nextTick();
            await new Promise((r) => setTimeout(r, 300));

            // For Series/Parallel: use session overview. For Single game: use game scores to preserve time/boolean display
            const isMultiGame =
              currentSession.value?.game_mode === 'series' ||
              currentSession.value?.game_mode === 'series-of-games' ||
              currentSession.value?.game_mode === 'parallel' ||
              currentSession.value?.game_mode === 'parallel-games';

            await previewStore.generate(
              currentSessionId,
              isMultiGame ? null : currentGame.value.id,
            );
            sessionStorage.setItem('lastGenerateTime', Date.now());
          } catch (e) {
            console.error('Failed to generate final preview:', e);
          }
        }

        // Navigate display
        // For single games, pass gameId so finale view can show correct score type (time/boolean)
        const isMultiGameNav =
          currentSession.value?.game_mode === 'series' ||
          currentSession.value?.game_mode === 'series-of-games' ||
          currentSession.value?.game_mode === 'parallel' ||
          currentSession.value?.game_mode === 'parallel-games';

        socket.emit('display:navigate', {
          name: 'display-leaderboard-finale',
          params: {
            sessionId: currentSessionId,
            gameId: isMultiGameNav ? undefined : currentGame.value?.id,
          },
        });

        // Navigate local
        isGeneratingPreview.value = false;
        router.push({
          name: 'endgame-summary',
          query: { sessionId: currentSessionId },
        });
      } else {
        // Not all finished (series specific logic usually falls here if series not done)
        // Or if parallel logic failed
      }
    } else {
      // Early exit (Pause) -> session is in_progress

      // Generate preview for pause state (AFTER scores saved)
      if (!wasAlreadyFinished) {
        isGeneratingPreview.value = true;
        try {
          await nextTick();
          await new Promise((r) => setTimeout(r, 300));

          // For Series/Parallel: use session overview. For Single: use game scores
          const isMultiGame =
            currentSession.value?.game_mode === 'series' ||
            currentSession.value?.game_mode === 'series-of-games' ||
            currentSession.value?.game_mode === 'parallel' ||
            currentSession.value?.game_mode === 'parallel-games';

          await previewStore.generate(
            currentSessionId,
            isMultiGame ? null : currentGame.value.id,
          );
          sessionStorage.setItem('lastGenerateTime', Date.now());
        } catch (e) {
          console.error('Failed to generate preview:', e);
        }
      }

      try {
        await sessionRepository.update(currentSessionId, {
          status: 'in_progress',
        });
        // Navigate display
        socket.emit('display:navigate', {
          name: 'display-splash',
        });
      } catch (e) {
        console.error('Failed to update session status:', e);
      }

      // Early exit (Pause) -> Go back to tablet home
      isGeneratingPreview.value = false;
      router.push('/tablet');
    }
  }

  isGeneratingPreview.value = false;
  const modal = document.getElementById('endgame');
  if (modal) {
    modal.close();
  }
};
</script>

<template>
  <div class="container">
    <div class="row">
      <div class="c-player-list">
        <div class="c-player-list__header">
          <LogoHeader :class="'c-player-list__logo'" />
          <div class="c-player-list__gameround">
            <template v-if="games.length > 1">
              <CustomSelect
                v-if="!isSeries"
                v-model="selectedGameId"
                :options="gameOptions"
              />
              <h2 v-else-if="currentSession?.game_mode === 'single'" class="h2">
                {{ currentSession?.name }}
              </h2>
              <h2 v-else class="h2">{{ currentGame?.name }}</h2>
            </template>
            <h2 v-else-if="currentSession?.game_mode === 'single'" class="h2">
              {{ currentSession?.name }}
            </h2>
            <h2 v-else class="h2">{{ currentGame?.name }}</h2>
            <p
              v-if="(currentGame?.rounds || 1) > 1"
              class="c-player-list--greytext h6"
            >
              Ronde {{ currentGame?.currentRound }} van
              {{ currentGame?.rounds }}
            </p>
            <div v-if="currentGame?.use_sets" class="c-player-list__sets">
              <p>
                Set {{ currentGame?.currentSet }} van {{ currentGame?.sets }}
              </p>
            </div>
          </div>

          <Button
            button-tekst="Spelinstellingen"
            variant="secondary"
            :clickable="false"
            @click="goToSettings"
          >
            <template #c-btn_icon-left>
              <Cog :size="18" />
            </template>
          </Button>
        </div>
        <div class="c-player-list__main">
          <div class="c-player-list__subheader">
            <div class="c-player-list__title">
              <p class="h4">Deelnemers</p>
              <p class="c-player-list--greytext">
                Klik op + of - om punten toe te voegen of af te trekken, of voeg
                bonuspunten toe.
              </p>
            </div>

            <div v-if="currentGame?.score_type === 'points' && bonusAmount > 0">
              <Button
                onclick="bonusmodal.showModal()"
                button-tekst="Bonuspunten toekennen"
                variant="primary"
                :clickable="false"
              >
                <template #c-btn_icon-left>
                  <Flame :size="18" />
                </template>
              </Button>
              <Modal
                modal-id="bonusmodal"
                title="Bonuspunten toevoegen"
                cancel-btn-text="Annuleren"
                accept-btn-text="Toevoegen"
                @accept="saveBonus"
              >
                <p class="c-modal__text">
                  Geef
                  <span class="c-modal-bonus-badge">+{{ bonusAmount }}</span>
                  bonuspunten aan de volgende deelnemers
                </p>

                <div
                  v-if="isTeamsWithPlayers"
                  class="c-player-list__tabs u-mb-sm"
                >
                  <TeamTabButton
                    v-for="team in availableTeams"
                    :key="team.id"
                    :label="team.name"
                    :isActive="activeModalTeamId === team.id"
                    @click="activeModalTeamId = team.id"
                  />
                </div>

                <div class="c-assignment-modal-list">
                  <div v-if="filteredBonusPlayers.length === 0">
                    Geen deelnemers gevonden.
                  </div>
                  <label
                    v-for="player in filteredBonusPlayers"
                    :key="player.participantId"
                    class="c-assignment-modal-list__item"
                    :class="{
                      'c-assignment-modal-list__item--active':
                        selectedBonusParticipants.includes(
                          player.participantId,
                        ),
                    }"
                  >
                    <input
                      type="checkbox"
                      :checked="
                        selectedBonusParticipants.includes(player.participantId)
                      "
                      @change="toggleBonusParticipant(player.participantId)"
                    />
                    <span class="c-assignment-modal-list__item_name">{{
                      player.name
                    }}</span>
                  </label>
                </div>
              </Modal>
            </div>
          </div>

          <div
            v-if="isTeamsWithPlayers && availableTeams.length > 0"
            class="c-player-list__tabs"
          >
            <TeamTabButton
              v-for="team in availableTeams"
              :key="team.id"
              :label="team.name"
              :isActive="activeTeamId === team.id"
              @click="activeTeamId = team.id"
            />
          </div>

          <TransitionGroup
            :key="`${selectedGameId}-${activeTeamId}`"
            name="player-list"
            tag="div"
            class="c-player-list__players"
            :class="{
              'c-player-list__players--boolean':
                currentGame?.score_type === 'boolean',
              'c-player-list__players--time':
                currentGame?.score_type === 'time',
            }"
          >
            <HostPlayerItem
              v-for="player in filteredSortedPlayers"
              :key="`${selectedGameId}-${player.participantId}`"
              :name="player.name"
              :points="player.points"
              :value="
                currentGame?.score_type === 'time'
                  ? (player.bool === 1 ? player.time - (accumulatedScores[player.participantId] || 0) : null)
                  : currentGame?.score_type === 'boolean'
                    ? player.bool
                    : player.points
              "
              :score-type="currentGame?.score_type || 'points'"
              :size="playerItemSize"
              :rank="player.rank"
              :perClick="currentGame?.perClick || 1"
              @updateScore="
                (newVal) => updatePlayerScore(player.participantId, newVal)
              "
            />
          </TransitionGroup>

          <div class="c-player-list__buttons">
            <Button
              v-if="isLastPhase"
              :clickable="false"
              onclick="pausegame.showModal()"
              button-tekst="Spel pauzeren"
              variant="secondary"
            />
            <Modal
              modal-id="pausegame"
              title="Spel pauzeren?"
              text="Je staat op het punt het spel te pauzeren. De scores worden opgeslagen en je kan later hervatten."
              cancel-btn-text="Terug"
              accept-btn-text="Pauzeren"
              :is-loading="isGeneratingPreview"
              :keep-open-on-accept="true"
              @accept="pauseGame"
            />
            <Button
              :onclick="shouldDisableMainButton ? null : 'endgame.showModal()'"
              :button-tekst="
                isTransitioning ? 'Volgend spel start...' : endGameButtonText
              "
              :variant="isLastPhase ? 'primary' : 'secondary'"
              :clickable="false"
              :is-disabled="shouldDisableMainButton"
            >
              <template #c-btn_icon-left v-if="isTransitioning">
                <Loader2 class="spin" :size="20" />
              </template>
            </Button>
            <Modal
              modal-id="endgame"
              :title="endGameModalTitle"
              :text="endGameModalText"
              cancel-btn-text="Terug"
              :accept-btn-text="endGameButtonText"
              :is-loading="isGeneratingPreview"
              :keep-open-on-accept="true"
              @accept="endGame"
            />
            <Button
              v-if="hasNextRound || hasNextSet"
              onclick="nextround.showModal()"
              :button-tekst="nextButtonLabel"
              variant="primary"
              :clickable="false"
            />
            <Modal
              modal-id="nextround"
              :title="nextModalTitle"
              :text="nextModalText"
              cancel-btn-text="Terug"
              :accept-btn-text="nextButtonLabel"
              @accept="goToNext"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
