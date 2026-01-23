<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  TransitionGroup,
} from 'vue';
import { useRouter } from 'vue-router';
import {
  sessionRepository,
  scoreRepository,
  gameRepository,
} from '../services/api';
import socket from '../utils/socket';
import HostPlayerItem from '../components/HostPlayerItem.vue';
import Button from '../components/Button.vue';
import TeamTabButton from '../components/TeamTabButton.vue';
import LogoHeader from '../components/Logo.vue';
import Modal from '../components/Modal.vue';
import CustomSelect from '../components/CustomSelect.vue';
import { Cog, Flame } from 'lucide-vue-next';

const router = useRouter();
const currentSessionId = sessionStorage.getItem('sessionId');
console.log('Current Session ID:', currentSessionId);
const currentSession = ref(null);

// Games from DB
const games = ref([]);

const selectedGameId = ref(null);
const accumulatedScores = ref({}); // { [participantId]: number }
const selectedBonusParticipants = ref([]);

const activeTeamId = ref(null);
const activeModalTeamId = ref(null);

watch(selectedGameId, (newId) => {
  if (newId) {
    console.log('Sending selected game to display:', newId);
    socket.emit('display:selected-game', {
      gameId: newId,
      sessionId: currentSessionId,
    });
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
    console.log('Current Session:', sessionResponse.data);
    currentSession.value = sessionResponse.data;

    const response = await sessionRepository.getGames(currentSessionId);
    games.value = response.data;
    if (games.value.length > 0) {
      selectedGameId.value = games.value[0].id;
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
  const sorted = [...currentGame.value.players].sort(
    (a, b) => b.points - a.points,
  );

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
  console.log('Session Mode:', currentSession.value?.game_mode);
  return currentSession.value?.game_mode === 'series-of-games';
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
  if (hasNextRound.value) return 'Volgende ronde';
  return '';
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
    else if (data.scoreType === 'time') player.time = data.score;
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
      // For time, the input sends the RELATIVE value (current round time).
      // We need to add the accumulated offset to get the absolute Total to store in DB.
      const offset = accumulatedScores.value[participantId] || 0;
      player.time = newVal + offset;
    } else if (scoreType === 'boolean') player.bool = newVal;

    // Stuur naar backend
    const valueToSend = scoreType === 'time' ? player.time : newVal;

    try {
      await scoreRepository.updateScore(
        currentGame.value.id,
        participantId,
        valueToSend,
        scoreType,
      );
      console.log(
        `Updated score for participant ${participantId} to ${valueToSend}`,
      );
    } catch (error) {
      console.error('Failed to update score:', error);
      // Rollback bij error
      if (scoreType === 'points') player.points = oldPoints;
      else if (scoreType === 'time') player.time = oldTime;
      else if (scoreType === 'boolean') player.bool = oldBool;
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
  router.push({ name: 'ingame-settings' });
};

const goToNext = async () => {
  if (!currentGame.value) return;

  // 1. Capture current totals (BEFORE update) to use as offsets for the next round
  const newOffsets = {};
  if (currentGame.value.score_type === 'time') {
    currentGame.value.players.forEach((p) => {
      newOffsets[p.participantId] = p.time || 0;
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
    const key = `offsets_${currentGame.value.id}_${currentGame.value.currentSet}_${currentGame.value.currentRound}`;
    localStorage.setItem(key, JSON.stringify(newOffsets));
    accumulatedScores.value = newOffsets;
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

const endGameButtonText = computed(() => {
  // Explicitly check for parallel mode first
  if (currentSession.value?.game_mode === 'parallel-games') {
    return isLastPhase.value ? 'Beëindig alle spelen' : 'Spel pauzeren';
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

const nextGame = async () => {
  // 1. Mark current game as finished
  try {
    await gameRepository.update(currentGame.value.id, {
      is_finished: 1,
    });
    currentGame.value.is_finished = 1;

    // Sluit modal meteen (UX)
    const modal = document.getElementById('endgame');
    if (modal) {
      modal.close();
    }

    // 2. Toon tussenstand (Leaderboard) op Display
    socket.emit('display:navigate', {
      name: 'display-leaderboard',
      params: { sessionId: currentSessionId },
    });

    // 3. Wacht 15 seconden
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // 4. Navigeer Display terug naar Scoreboard
    socket.emit('display:navigate', {
      name: 'display-scoreboard',
      params: { sessionId: currentSessionId },
    });

    // 5. Selecteer volgend spel (Triggers display update via watcher)
    const currentIndex = games.value.findIndex(
      (g) => g.id === currentGame.value.id,
    );
    if (currentIndex !== -1 && currentIndex < games.value.length - 1) {
      selectedGameId.value = games.value[currentIndex + 1].id;
    }
  } catch (e) {
    console.error('Failed to update game finished status or transition:', e);
    // Fallback: close modal if error occurred before
    const modal = document.getElementById('endgame');
    if (modal && modal.open) {
      modal.close();
    }
  }
};

const endGame = async () => {
  if (currentGame.value) {
    const isParallel = currentSession.value?.game_mode?.includes('parallel');

    // SPECIAAL GEVAL: Volgend spel in serie
    // (Ensure this doesn't run for parallel)
    if (
      isLastPhase.value &&
      hasNextGame.value &&
      isSeries.value &&
      !isParallel
    ) {
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
        console.log('Finishing all parallel games...');
        for (const g of games.value) {
          g.is_finished = 1;
          try {
            // Use dedicated finish endpoint for better reliability
            await gameRepository.finish(g.id);
            console.log(`Game ${g.id} finished.`);
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

      console.log('All finished check:', allFinished);

      const newSessionStatus = allFinished ? 'finished' : 'in_progress';

      if (newSessionStatus === 'finished') {
        try {
          await sessionRepository.update(currentSessionId, {
            status: 'finished',
          });
          console.log('Session updated to finished.');
        } catch (e) {
          console.error('Failed to update session status:', e);
        }

        // Navigate display
        socket.emit('display:navigate', {
          name: 'display-leaderboard-finale',
          params: { sessionId: currentSessionId },
        });

        // Navigate local
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
      router.push('/tablet');
    }
  }

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
                  Geef {{ bonusAmount }} bonuspunten aan de volgende deelnemers
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
                  ? player.time - (accumulatedScores[player.participantId] || 0)
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
              onclick="endgame.showModal()"
              :button-tekst="endGameButtonText"
              variant="secondary"
              :clickable="false"
            />
            <Modal
              modal-id="endgame"
              :title="endGameModalTitle"
              :text="endGameModalText"
              cancel-btn-text="Terug"
              :accept-btn-text="endGameButtonText"
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

<style scoped>
.player-list-move {
  transition: transform 0.4s ease-out;
}

.player-list-enter-active {
  transition: all 0.3s ease-out;
}

.player-list-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
}

.player-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.player-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

<style scoped>
/* Extra styles for bonus modal list */
</style>
