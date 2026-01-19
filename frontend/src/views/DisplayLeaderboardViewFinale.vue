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
    score: 78,
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
    score: 118,
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

// Get remaining players (from position 4 onwards, max 8)
const remainingPlayers = computed(() => {
  return sortedPlayers.value.slice(3, 8);
});

import confetti from "canvas-confetti";

// Visibility states for podium animation
const showRank1 = ref(false); // 1st Place
const showRank2 = ref(false); // 2nd Place
const showRank3 = ref(false); // 3rd Place
const showRunnerUps = ref(false); // Remaining players
const showLogo = ref(false); // Logo
const isShaking = ref(false); // Screen shake effect
const isDrumrolling = ref(false); // Drumroll vibration

const startPodiumAnimation = () => {
  // Reset
  showRank1.value = false;
  showRank2.value = false;
  showRank3.value = false;
  showRunnerUps.value = false;
  showLogo.value = false;
  isShaking.value = false;
  isDrumrolling.value = false;

  // Sequence: 3rd -> 2nd -> 1st -> Runner Ups -> Logo
  // 3rd Place appears quickly
  setTimeout(() => {
    showRank3.value = true;
  }, 1000);

  // 2nd Place appears after 3rd
  setTimeout(() => {
    showRank2.value = true;
  }, 4000); // 3s delay after 3rd

  // Start Drumroll (Building tension)
  setTimeout(() => {
    isDrumrolling.value = true;
  }, 6000); // 1s delay added (was 5000 originally)

  // 1st Place (Winner) appears last with more suspense
  setTimeout(() => {
    // Stop drumroll, start huge shake
    isDrumrolling.value = false;

    showRank1.value = true;

    // Trigger Screen Shake
    isShaking.value = true;
    setTimeout(() => {
      isShaking.value = false;
    }, 500); // Duration of shake animation

    // Trigger Confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#534aff", "#ff3b30", "#ffd60a"], // Using our theme colors if possible, or defaults
    });
  }, 10000); // shifted by 1000ms

  // Runner Ups appear after the winner
  setTimeout(() => {
    showRunnerUps.value = true;
  }, 14000); // shifted by 1000ms

  // Logo fades in last
  setTimeout(() => {
    showLogo.value = true;
  }, 15500); // shifted by 1000ms
};

onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = "hidden";

  // Start animation sequence
  startPodiumAnimation();
});

onUnmounted(() => {
  // Re-enable body scrolling
  document.body.style.overflow = "";
});
</script>

<template>
  <div
    class="c-display-leaderboard-view-finale"
    :class="{
      'screen-shake': isShaking,
      'drumroll-shake': isDrumrolling,
    }"
  >
    <div class="c-display-leaderboard-view-finale__header">
      <div
        class="c-display-leaderboard-view-finale__logo"
        :class="{
          'c-display-leaderboard-view-finale__logo--visible': showLogo,
        }"
      >
        <img :src="logo" alt="TeamScore Logo" style="height: 8rem" />
      </div>
      <div class="c-display-leaderboard-view-finale__podium">
        <!-- Rank 2 (Second in DOM order per grid styles) -->
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[1]"
          v-show="showRank2"
          :visible="showRank2"
          class="podium-reveal"
          color="red"
          :spelersnaam="topThreePlayers[1].spelersnaam"
          :score="topThreePlayers[1].score"
        />
        <!-- Rank 1 (Top in DOM order per grid styles) -->
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[0]"
          v-show="showRank1"
          :visible="showRank1"
          class="podium-reveal"
          color="blue"
          :spelersnaam="topThreePlayers[0].spelersnaam"
          :score="topThreePlayers[0].score"
        />
        <!-- Rank 3 (Third in DOM order per grid styles) -->
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[2]"
          v-show="showRank3"
          :visible="showRank3"
          class="podium-reveal"
          color="orange"
          :spelersnaam="topThreePlayers[2].spelersnaam"
          :score="topThreePlayers[2].score"
        />
      </div>
    </div>
    <div class="c-display-leaderboard-view-finale__players">
      <div
        class="c-display-leaderboard-view-finale__players-container runners-up-reveal"
        v-if="remainingPlayers.length > 0"
        v-show="showRunnerUps"
      >
        <LeaderboardPlayerCard
          v-for="(player, index) in remainingPlayers"
          :key="player.id"
          :position="index + 4"
          :playerName="player.spelersnaam"
          :maxValue="maxScore"
          :score="player.score"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
