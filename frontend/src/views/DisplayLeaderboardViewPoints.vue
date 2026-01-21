<script setup>
import LeaderboardPodiumIcon from "../components/LeaderboardPodiumIcon.vue";
import LeaderboardPlayerCard from "../components/LeaderboardPlayercard.vue";

import logo from "../assets/logo.webp";

import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const players = ref([
  {
    id: 1,
    spelersnaam: "John Doe",
    score: 121,
  },
  {
    id: 2,
    spelersnaam: "Jane Smith",
    score: 72,
  },
  {
    id: 3,
    spelersnaam: "Bob Johfdsdnson",
    score: 78,
  },
  {
    id: 6,
    spelersnaam: "Bob Johnson",
    score: 55,
  },
  {
    id: 7,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 8,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 4,
    spelersnaam: "Alice Williams",
    score: 79,
  },
  {
    id: 5,
    spelersnaam: "Charlie Brown",
    score: 84,
  },
  {
    id: 9,
    spelersnaam: "Yarne Diopere",
    score: 124,
  },
  {
    id: 10,
    spelersnaam: "Lars Dobbelaere",
    score: 114,
  },
  {
    id: 11,
    spelersnaam: "Renz Deheegher",
    score: 120,
  },
]);

// Sort players by score (highest first)
const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary sort by ID to ensure stable order
    return a.id - b.id;
  });
});

// Get the maximum score for progress bars
const maxScore = computed(() => {
  if (sortedPlayers.value.length === 0) return 100;
  return sortedPlayers.value[0].score;
});

// Get top 3 players for podium
const topThreePlayers = computed(() => {
  return sortedPlayers.value.slice(0, 3);
});

// Get remaining players (from position 4 onwards)
// Get remaining players (from position 4 onwards)
const remainingPlayers = computed(() => {
  return sortedPlayers.value.slice(3, 8); // Max 8 players as per previous requirement or standard
});

const boostLowScorePlayer = () => {
  if (remainingPlayers.value.length === 0) return;

  // Get the player with the lowest score currently VISIBLE in the list
  const lowestVisiblePlayer =
    remainingPlayers.value[remainingPlayers.value.length - 1];

  // Find this player in the main players source array
  const playerToUpdate = players.value.find(
    (p) => p.id === lowestVisiblePlayer.id
  );

  if (playerToUpdate) {
    // Add a significant amount of points to potentially move them up
    playerToUpdate.score += 30; // Boost by 30
  }
};

onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  // Re-enable body scrolling
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="c-display-leaderboard-view-points">
    <div class="c-display-leaderboard-view-points__header">
      <div class="c-display-leaderboard-view-points__logo">
        <img :src="logo" alt="TeamScore Logo" style="height: 8rem" />
      </div>
      <div class="c-display-leaderboard-view-points__podium">
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[1]"
          color="red"
          :spelersnaam="topThreePlayers[1].spelersnaam"
          :score="topThreePlayers[1].score"
          :animated="false"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[0]"
          color="blue"
          :spelersnaam="topThreePlayers[0].spelersnaam"
          :score="topThreePlayers[0].score"
          :animated="false"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[2]"
          color="orange"
          :spelersnaam="topThreePlayers[2].spelersnaam"
          :score="topThreePlayers[2].score"
          :animated="false"
        />
      </div>
    </div>
    <div class="c-display-leaderboard-view-points__players">
      <TransitionGroup
        name="player-slide"
        tag="div"
        class="c-display-leaderboard-view-points__players-container"
      >
        <div
          v-for="(player, index) in remainingPlayers"
          :key="player.id"
          class="c-player-wrapper"
        >
          <LeaderboardPlayerCard
            :position="index + 4"
            :playerName="player.spelersnaam"
            :maxValue="maxScore"
            :score="player.score"
          />
        </div>
      </TransitionGroup>
    </div>

    <!-- Test Button -->
    <button
      @click="boostLowScorePlayer"
      style="
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9999;
        padding: 1rem 2rem;
        background-color: #ffffff;
        color: #000000;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      "
    >
      Boost Lowest Player
    </button>
  </div>
</template>

<style scoped></style>
