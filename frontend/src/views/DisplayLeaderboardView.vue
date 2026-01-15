<script setup>
import LeaderboardPodiumIcon from "../components/LeaderboardPodiumIcon.vue";
import LeaderboardPlayerCard from "../components/LeaderboardPlayerCard.vue";

import logo from "../assets/logo.webp";

import { ref, computed, onMounted, onUnmounted } from "vue";

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

// Sort players by score (highest first)
const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => b.score - a.score);
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
const remainingPlayers = computed(() => {
  return sortedPlayers.value.slice(3);
});

// Screen height and scroll animation
const screenHeight = ref(window.innerHeight);
const scrollPosition = ref(0); // Current scroll position in pixels

// Handle window resize
const handleResize = () => {
  screenHeight.value = window.innerHeight;
};

// Continuous smooth scroll animation (no pauses)
let scrollAnimationFrame = null;
const cardHeight = 115; // 100px card + 15px gap
const scrollSpeed = 0.2; // Constant smooth speed
const gapHeight = 50; // Gap between the two lists

const animateScroll = () => {
  if (remainingPlayers.value.length === 0) return;

  // Calculate total scrollable height: list height + gap
  const listHeight = remainingPlayers.value.length * cardHeight;
  const totalLoopHeight = listHeight + gapHeight;

  // Increment scroll position
  scrollPosition.value += scrollSpeed;

  // Reset when we've scrolled past the first list AND the gap
  // At this point, the duplicate list's top aligns with where the original list started
  if (scrollPosition.value >= totalLoopHeight) {
    scrollPosition.value = 0;
  }

  // Continuous loop
  scrollAnimationFrame = requestAnimationFrame(animateScroll);
};

const startAutoScroll = () => {
  if (remainingPlayers.value.length === 0) return;
  animateScroll();
};

const stopAutoScroll = () => {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
  }
};

onMounted(() => {
  window.addEventListener("resize", handleResize);
  startAutoScroll();

  // Disable body scrolling
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  stopAutoScroll();

  // Re-enable body scrolling
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="c-display-leaderboard-view">
    <div class="c-display-leaderboard-view__header">
      <div class="c-display-leaderboard-view__logo">
        <img :src="logo" alt="TeamScore Logo" style="height: 8rem" />
      </div>
      <div class="c-display-leaderboard-view__podium">
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[1]"
          color="red"
          :spelersnaam="topThreePlayers[1].spelersnaam"
          :score="topThreePlayers[1].score"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[0]"
          color="blue"
          :spelersnaam="topThreePlayers[0].spelersnaam"
          :score="topThreePlayers[0].score"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[2]"
          color="orange"
          :spelersnaam="topThreePlayers[2].spelersnaam"
          :score="topThreePlayers[2].score"
        />
      </div>
    </div>
    <div class="c-display-leaderboard-view__players">
      <div
        class="c-display-leaderboard-view__players-container"
        :style="{ transform: `translateY(-${scrollPosition}px)` }"
      >
        <LeaderboardPlayerCard
          v-for="(player, index) in remainingPlayers"
          :key="player.id + '-' + index"
          :position="index + 4"
          :playerName="player.spelersnaam"
          :maxValue="maxScore"
          :score="player.score"
        />

        <!-- Gap between cycles -->
        <div :style="{ height: gapHeight + 'px', flexShrink: 0 }"></div>

        <!-- Duplicate cards for seamless loop -->
        <LeaderboardPlayerCard
          v-for="(player, index) in remainingPlayers"
          :key="'loop-' + player.id + '-' + index"
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
