<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import HostPlayerItem from '../components/HostPlayerItem.vue';
import Button from '../components/Button.vue';
import LogoHeader from '../components/Logo.vue';
import Modal from '../components/Modal.vue';
import CustomSelect from '../components/CustomSelect.vue';
import { Cog } from 'lucide-vue-next';

// Simulatie van meerdere games (later vanuit database)
const games = ref([
  {
    id: 1,
    name: 'Game 1',
    perClick: 2,
    rounds: 5,
    currentRound: 1,
    players: [
      { id: 1, name: 'Alice', points: 10 },
      { id: 2, name: 'Bob', points: 8 },
      { id: 3, name: 'Charlie', points: 6 },
      { id: 4, name: 'David', points: 4 },
      { id: 5, name: 'Eve', points: 2 }
    ]
  },
  {
    id: 2,
    name: 'Volleybal Toernooi 2026',
    perClick: 5,
    rounds: 3,
    currentRound: 1,
    players: [
      { id: 6, name: 'Frank', points: 25 },
      { id: 7, name: 'Grace', points: 20 },
      { id: 2, name: 'Bob', points: 15 },
      { id: 8, name: 'Henry', points: 10 }
    ]
  },
  {
    id: 3,
    name: 'Game 3',
    perClick: 1,
    rounds: 10,
    currentRound: 1,
    players: [
      { id: 1, name: 'Alice', points: 7 },
      { id: 9, name: 'Ivy', points: 5 },
      { id: 10, name: 'Jack', points: 3 }
    ]
  }
]);

const selectedGameId = ref(1);

// Responsive breakpoint voor size
const windowWidth = ref(window.innerWidth);
const playerItemSize = computed(() => {
  if (windowWidth.value >= 768) return 'large';
  return 'default';
});

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Huidige geselecteerde game
const currentGame = computed(() => {
  return games.value.find(game => game.id === selectedGameId.value);
});

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

// Check of er nog een volgende ronde is
const hasNextRound = computed(() => {
  if (!currentGame.value) return false;
  return currentGame.value.currentRound < currentGame.value.rounds;
});

const updatePlayerPointsInArray = (playerId, newPoints) => {
  if (!currentGame.value) return;

  const player = currentGame.value.players.find(p => p.id === playerId);
  if (player) {
    player.points = newPoints;
  }
};

const goToNextRound = () => {
  if (!currentGame.value || !hasNextRound.value) return;
  currentGame.value.currentRound++;
  // Sluit de modal
  const modal = document.getElementById('nextround');
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
            <p class="c-player-list--greytext">Ronde {{ currentGame?.currentRound }} van {{ currentGame?.rounds }}</p>
          </div>

          <Button button-tekst="Spelinstellingen" variant="secondary" :href="'/tablet/game/ingame-settings'">
            <template #c-btn_icon-left>
              <Cog :size="18" />
            </template>
          </Button>
        </div>
        <div class="c-player-list__main">

          <div class="c-player-list__title">
            <p class="h4">Deelnemers</p>
            <p class="c-player-list--greytext">Klik op + of - om punten toe te voegen of af te trekken, of voeg
              bonuspunten
              toe.</p>
          </div>

          <TransitionGroup :key="selectedGameId" name="player-list" tag="div" class="c-player-list__players">
            <HostPlayerItem v-for="player in sortedPlayers" :key="`${selectedGameId}-${player.id}`" :name="player.name"
              :points="player.points" :size="playerItemSize" :rank="player.rank" :perClick="currentGame?.perClick || 1"
              @updatePoints="(newPoints) => updatePlayerPointsInArray(player.id, newPoints)" />
          </TransitionGroup>

          <div class="c-player-list__buttons">
            <Button onclick="endgame.showModal()" button-tekst="Beëindig spel" variant="secondary" :clickable="false" />
            <Modal modal-id="endgame" title="Het spel beëindigen?"
              text="Weet je zeker dat je het spel wilt beëindigen? Hierna kun je geen scores meer wijzigen of rondes toevoegen. Je gaat direct door naar de einduitslag, waar je de resultaten kunt bekijken en exporteren."
              cancel-btn-text="Terug" accept-btn-text="Beëindig spel" />
            <Button v-if="hasNextRound" onclick="nextround.showModal()" button-tekst="Volgende ronde" variant="primary"
              :clickable="false" />
            <Modal modal-id="nextround" title="Naar de volgende ronde?"
              text="Ben je zeker dat je naar de volgende ronde wilt gaan? Je kunt later nog steeds terugkeren om scores aan te passen."
              cancel-btn-text="Terug" accept-btn-text="Volgende ronde" @accept="goToNextRound" />
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