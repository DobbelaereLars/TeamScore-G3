<script setup>
import { ref, computed, onMounted, onUnmounted, watch, TransitionGroup } from 'vue';
import { useRouter } from 'vue-router';
import { sessionRepository, scoreRepository, gameRepository } from '../services/api';
import socket from '../utils/socket';
import HostPlayerItem from '../components/HostPlayerItem.vue';
import Button from '../components/Button.vue';
import LogoHeader from '../components/Logo.vue';
import Modal from '../components/Modal.vue';
import CustomSelect from '../components/CustomSelect.vue';
import { Cog, Flame, Plus } from 'lucide-vue-next';

const router = useRouter();
const currentSessionId = ref(1);

// Games from DB
const games = ref([]);

const selectedGameId = ref(null);
const accumulatedScores = ref({}); // { [participantId]: number }
const selectedBonusParticipants = ref([]);

watch(selectedGameId, (newId) => {
  if (newId) {
    console.log('Sending selected game to display:', newId);
    socket.emit('display:selected-game', {
      gameId: newId,
      sessionId: currentSessionId.value
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
    const sessionResponse = await sessionRepository.getById(currentSessionId.value);
    console.log('Current Session:', sessionResponse.data);

    const response = await sessionRepository.getGames(currentSessionId.value);
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
  return games.value.find(game => game.id === selectedGameId.value);
});

// Samengetelde scores laden voor time offset
watch(
  () => [
    currentGame.value?.id,
    currentGame.value?.currentSet,
    currentGame.value?.currentRound
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
  { immediate: true }
);

// Game opties voor de custom select
const gameOptions = computed(() => {
  return games.value.map(game => ({
    value: game.id,
    label: game.name
  }));
});

// Gesorteerde spelers van de huidige game met automatische rank
const sortedPlayers = computed(() => {
  if (!currentGame.value) return [];

  // Sorteer op punten (hoogste eerst)
  const sorted = [...currentGame.value.players].sort((a, b) => b.points - a.points);

  // Voeg rank toe op basis van positie
  return sorted.map((player, index) => ({
    ...player,
    rank: index + 1
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

const nextButtonLabel = computed(() => {
  if (hasNextSet.value) return "Volgende set";
  if (hasNextRound.value) return "Volgende ronde";
  return "";
});

const nextModalTitle = computed(() => {
  if (hasNextSet.value) return "Naar de volgende set?";
  return "Naar de volgende ronde?";
});

const nextModalText = computed(() => {
  if (hasNextSet.value) return "Ben je zeker dat je naar de volgende set wilt gaan? Scores blijven behouden.";
  return "Ben je zeker dat je naar de volgende ronde wilt gaan? Je kunt later nog steeds terugkeren om scores aan te passen.";
});

const handleScoreUpdate = (data) => {
  if (!currentGame.value || currentGame.value.id !== data.gameId) return;

  const player = currentGame.value.players.find(p => p.participantId === data.participantId);
  if (player) {
    if (data.scoreType === 'points') player.points = data.score;
    else if (data.scoreType === 'time') player.time = data.score;
    else if (data.scoreType === 'boolean' || data.scoreType === 'bool') player.bool = data.score;
  }
};

const updatePlayerScore = async (participantId, newVal) => {
  if (!currentGame.value) return;

  // Optimistische update in UI
  const player = currentGame.value.players.find(p => p.participantId === participantId);

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
    }
    else if (scoreType === 'boolean') player.bool = newVal;

    // Stuur naar backend
    const valueToSend = scoreType === 'time' ? player.time : newVal;

    try {
      await scoreRepository.updateScore(currentGame.value.id, participantId, valueToSend, scoreType);
      console.log(`Updated score for participant ${participantId} to ${valueToSend}`);
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
    selectedBonusParticipants.value = selectedBonusParticipants.value.filter(id => id !== participantId);
  } else {
    selectedBonusParticipants.value.push(participantId);
  }
};

const saveBonus = async () => {
  if (!currentGame.value || selectedBonusParticipants.value.length === 0 || bonusAmount.value === 0) {
    document.getElementById('bonusmodal')?.close();
    return;
  }

  const amount = bonusAmount.value;
  const promises = selectedBonusParticipants.value.map(participantId => {

    const player = currentGame.value.players.find(p => p.participantId === participantId);
    if (player) {
      const newPoints = (player.points || 0) + amount;
      updatePlayerScore(participantId, newPoints); // This handles API + Optimistic UI
    }
  });

  await Promise.all(promises);

  selectedBonusParticipants.value = [];
  document.getElementById('bonusmodal')?.close();
};

const goToNext = async () => {
  if (!currentGame.value) return;

  // 1. Capture current totals (BEFORE update) to use as offsets for the next round
  const newOffsets = {};
  if (currentGame.value.score_type === 'time') {
    currentGame.value.players.forEach(p => {
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
      current_set: currentGame.value.currentSet
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

const endGame = () => {
  // Navigate display
  socket.emit('display:navigate', {
    name: 'display-scoreboard',
    params: { sessionId: currentSessionId.value }
  });

  // Navigate local
  router.push({
    name: 'endgame-summary',
    query: { sessionId: currentSessionId.value }
  });

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
            <CustomSelect v-if="games.length > 1" v-model="selectedGameId" :options="gameOptions" />
            <h2 v-else class="h2">{{ currentGame?.name }}</h2>
            <p class="c-player-list--greytext h6">Ronde {{ currentGame?.currentRound }} van {{ currentGame?.rounds }}
            </p>
            <div v-if="currentGame?.sets" class="c-player-list__sets">
              <p>Set {{ currentGame?.currentSet }} van {{ currentGame?.sets }}</p>
            </div>

          </div>

          <Button button-tekst="Spelinstellingen" variant="secondary" :href="'/tablet/game/ingame-settings'">
            <template #c-btn_icon-left>
              <Cog :size="18" />
            </template>
          </Button>
        </div>
        <div class="c-player-list__main">
          <div class="c-player-list__subheader">
            <div class="c-player-list__title">
              <p class="h4">Deelnemers</p>
              <p class="c-player-list--greytext">Klik op + of - om punten toe te voegen of af te trekken, of voeg
                bonuspunten
                toe.</p>
            </div>

            <div v-if="currentGame?.score_type === 'points'">
              <Button onclick="bonusmodal.showModal()" button-tekst="Bonuspunten toekennen" variant="primary">
                <template #c-btn_icon-left>
                  <Flame :size="18" />
                </template>
              </Button>
              <Modal modal-id="bonusmodal" title="Bonuspunten toevoegen" cancel-btn-text="Annuleren"
                accept-btn-text="Toevoegen" @accept="saveBonus">
                <p class="c-modal__text">Geef {{ bonusAmount }} bonuspunten aan de volgende deelnemers</p>
                <div class="c-assignment-modal-list">
                  <div v-if="currentGame?.players?.length === 0">Geen deelnemers gevonden.</div>
                  <label v-for="player in currentGame?.players" :key="player.participantId"
                    class="c-assignment-modal-list__item"
                    :class="{ 'c-assignment-modal-list__item--active': selectedBonusParticipants.includes(player.participantId) }">
                    <input type="checkbox" :checked="selectedBonusParticipants.includes(player.participantId)"
                      @change="toggleBonusParticipant(player.participantId)" />
                    <span class="c-assignment-modal-list__item_name">{{ player.name }}</span>
                  </label>
                </div>
              </Modal>
            </div>

          </div>

          <TransitionGroup :key="selectedGameId" name="player-list" tag="div" class="c-player-list__players" :class="{
            'c-player-list__players--boolean': currentGame?.score_type === 'boolean',
            'c-player-list__players--time': currentGame?.score_type === 'time'
          }">
            <HostPlayerItem v-for="player in sortedPlayers" :key="`${selectedGameId}-${player.participantId}`"
              :name="player.name" :points="player.points"
              :value="currentGame?.score_type === 'time' ? (player.time - (accumulatedScores[player.participantId] || 0)) : currentGame?.score_type === 'boolean' ? player.bool : player.points"
              :score-type="currentGame?.score_type || 'points'" :size="playerItemSize" :rank="player.rank"
              :perClick="currentGame?.perClick || 1"
              @updateScore="(newVal) => updatePlayerScore(player.participantId, newVal)" />
          </TransitionGroup>

          <div class="c-player-list__buttons">
            <Button onclick="endgame.showModal()" button-tekst="Beëindig spel" variant="secondary" :clickable="false" />
            <Modal modal-id="endgame" title="Het spel beëindigen?"
              text="Weet je zeker dat je het spel wilt beëindigen? Hierna kun je geen scores meer wijzigen of rondes toevoegen. Je gaat direct door naar de einduitslag, waar je de resultaten kunt bekijken en exporteren."
              cancel-btn-text="Terug" accept-btn-text="Beëindig spel" @accept="endGame" />
            <Button v-if="hasNextRound || hasNextSet" onclick="nextround.showModal()" :button-tekst="nextButtonLabel"
              variant="primary" :clickable="false" />
            <Modal modal-id="nextround" :title="nextModalTitle" :text="nextModalText" cancel-btn-text="Terug"
              :accept-btn-text="nextButtonLabel" @accept="goToNext" />
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

<style scoped></style>