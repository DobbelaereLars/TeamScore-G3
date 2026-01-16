<script setup>
import ScoreboardPlayercard from "../components/ScoreboardPlayercard.vue";
import logo from "../assets/logo.webp";
import { ref, computed, onMounted, onUnmounted } from "vue";

// Mock data - later connect to database
const players = ref([
  {
    id: 1,
    spelersnaam: "John Doe",
    score: 85,
  },
  {
    id: 2,
    spelersnaam: "Jane Smith",
    score: 72,
  },
  {
    id: 3,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 3,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 3,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 3,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 4,
    spelersnaam: "Alice Williams",
    score: 58,
  },
  {
    id: 5,
    spelersnaam: "Charlie Brown",
    score: 84,
  },
  {
    id: 5,
    spelersnaam: "Yarne Diopere",
    score: 124,
  },
  {
    id: 5,
    spelersnaam: "Lars Dobbelaere",
    score: 114,
  },
  {
    id: 5,
    spelersnaam: "Renz Deheegher",
    score: 118,
  },
]);

const gameinfo = ref({
  currentRound: 2,
  totalRounds: 5,
  gamename: "Game 1",
});

// Calculate the highest score among all players
const maxScore = computed(() => {
  return Math.max(...players.value.map((player) => player.score));
});

// Computed property to sort players by score and calculate position/variant
const sortedPlayers = computed(() => {
  return [...players.value]
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .map((player, index) => {
      const position = index + 1;
      let variant;

      if (position === 1) {
        variant = "P1";
      } else if (position === 2) {
        variant = "P2";
      } else if (position === 3) {
        variant = "P3";
      } else {
        variant = "Px";
      }

      return {
        ...player,
        position,
        variant,
        maxValue: maxScore.value,
      };
    });
});

const currentPage = ref(0);
const playersPerPage = ref(8); // Will be calculated dynamically
const playersContainer = ref(null);

// Calculate how many players fit per page based on screen width
const calculatePlayersPerPage = () => {
  if (playersContainer.value) {
    const containerWidth = playersContainer.value.offsetWidth;
    const cardWidth = 280; // 17.5rem = 280px
    const gap = 15; // 0.9375rem ≈ 15px
    const columnsPerRow = Math.floor(
      (containerWidth + gap) / (cardWidth + gap)
    );
    playersPerPage.value = columnsPerRow * 2; // 2 rows
  }
};

// Paginated players
const paginatedPlayers = computed(() => {
  const start = currentPage.value * playersPerPage.value;
  const end = start + playersPerPage.value;
  return sortedPlayers.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(sortedPlayers.value.length / playersPerPage.value);
});

let pageInterval = null;

onMounted(() => {
  calculatePlayersPerPage();

  // Add resize listener to recalculate on window resize
  window.addEventListener("resize", calculatePlayersPerPage);

  // Only start auto-scroll if there are multiple pages
  if (totalPages.value > 1) {
    pageInterval = setInterval(() => {
      currentPage.value = (currentPage.value + 1) % totalPages.value;
    }, 30000); // 30 seconds
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", calculatePlayersPerPage);
  if (pageInterval) {
    clearInterval(pageInterval);
  }
});
</script>

<template>
  <div class="v-display-scoreboard">
    <div class="v-display-scoreboard-header">
      <div class="v-display-scoreboard-logo">
        <img :src="logo" alt="TeamScore Logo" style="height: 8rem" />
      </div>
      <div class="v-display-scoreboard-info">
        <h2>{{ gameinfo.gamename }}</h2>
        <p class="v-display-scoreboard-round">
          ronde {{ gameinfo.currentRound }} van de {{ gameinfo.totalRounds }}
        </p>
      </div>
    </div>
    <div class="v-display-scoreboard-players-wrapper" ref="playersContainer">
      <Transition name="slide">
        <div :key="currentPage" class="v-display-scoreboard-players-container">
          <ScoreboardPlayercard
            v-for="player in paginatedPlayers"
            :key="player.id"
            :spelersnaam="player.spelersnaam"
            :score="player.score"
            :max-value="player.maxValue"
            :position="player.position"
            :variant="player.variant"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped></style>
