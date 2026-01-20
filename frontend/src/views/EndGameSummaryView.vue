<script setup>
import LeaderboardPodiumIcon from "../components/LeaderboardPodiumIcon.vue";
import LeaderboardPlayerCard from "../components/LeaderboardPlayercard.vue";
import Button from "../components/Button.vue";
import { Download } from "lucide-vue-next";

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

// Get remaining players (from position 4 onwards)
const remainingPlayers = computed(() => {
  return sortedPlayers.value.slice(3); // All players from rank 4 down
});

const ITEMS_per_PAGE = ref(5);
const currentPage = ref(0);

const calculateItemsPerPage = () => {
  // Estimate height usage:
  // Podium section (~450px: 26rem height + margins)
  // Header/Padding (~100px)
  // Pagination Dots (~40px) + Margin (~20px) = 60px
  const reservedHeight = 580; // Reverted to 520 as requested
  const availableHeight = window.innerHeight - reservedHeight;

  // Estimate player card height + gap (~80px + 20px = 100px)
  const itemHeight = 100;

  const count = Math.floor(availableHeight / itemHeight);

  // Clamp between 1 and 8 (allowing fewer items on small screens)
  ITEMS_per_PAGE.value = Math.max(1, Math.min(count, 8));
};

const totalPages = computed(() => {
  return Math.ceil(remainingPlayers.value.length / ITEMS_per_PAGE.value);
});

// Reset page if we are out of bounds after resize
watch(totalPages, (newTotal) => {
  if (currentPage.value >= newTotal) {
    currentPage.value = Math.max(0, newTotal - 1);
  }
});

const displayedPlayers = computed(() => {
  const start = currentPage.value * ITEMS_per_PAGE.value;
  return remainingPlayers.value.slice(start, start + ITEMS_per_PAGE.value);
});

import confetti from "canvas-confetti";

// Visibility states
const showRank1 = ref(false); // 1st Place
const showRank2 = ref(false); // 2nd Place
const showRank3 = ref(false); // 3rd Place
const showRunnerUps = ref(false); // Remaining players
const showLogo = ref(false); // Logo
const isShaking = ref(false); // Screen shake effect
const isDrumrolling = ref(false); // Drumroll vibration

// Swipe Logic
const touchStartX = ref(0);
const touchEndX = ref(0);

const handleTouchStart = (e) => {
  touchStartX.value = e.changedTouches[0].screenX;
};

const handleTouchEnd = (e) => {
  touchEndX.value = e.changedTouches[0].screenX;
  handleSwipe();
};

const handleSwipe = () => {
  const SWIPE_THRESHOLD = 50;
  if (touchStartX.value - touchEndX.value > SWIPE_THRESHOLD) {
    // Swipe Left -> Next Page
    if (currentPage.value < totalPages.value - 1) {
      currentPage.value++;
    }
  } else if (touchEndX.value - touchStartX.value > SWIPE_THRESHOLD) {
    // Swipe Right -> Prev Page
    if (currentPage.value > 0) {
      currentPage.value--;
    }
  }
};

const goToPage = (pageIndex) => {
  currentPage.value = pageIndex;
};

const startPodiumAnimation = () => {
  showRank1.value = true;
  showRank2.value = true;
  showRank3.value = true;
  showRunnerUps.value = true;
  showLogo.value = true;

  // Trigger Confetti
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#534aff", "#ff3b30", "#ffd60a"],
  });
};

onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = "hidden";

  // Calculate initial items per page
  calculateItemsPerPage();
  window.addEventListener("resize", calculateItemsPerPage);

  // Start animation sequence
  startPodiumAnimation();
});

onUnmounted(() => {
  // Re-enable body scrolling
  document.body.style.overflow = "";
  window.removeEventListener("resize", calculateItemsPerPage);
});
</script>

<template>
  <div
    class="c-display-leaderboard-view-finale"
    :class="{
      'is-centered': !showRunnerUps,
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
        class="c-display-leaderboard-view-finale__players-container runners-up-reveal margin-bottom"
        v-if="displayedPlayers.length > 0"
        v-show="showRunnerUps"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <LeaderboardPlayerCard
          v-for="(player, index) in displayedPlayers"
          :key="player.id"
          :position="index + 4 + currentPage * ITEMS_per_PAGE"
          :playerName="player.spelersnaam"
          :maxValue="maxScore"
          :score="player.score"
        />
      </div>

      <!-- Pagination Dots -->
      <div
        class="c-leaderboard-pagination"
        v-if="totalPages > 1 && showRunnerUps"
      >
        <div
          v-for="pageIndex in totalPages"
          :key="pageIndex"
          class="c-leaderboard-pagination__dot"
          :class="{
            'c-leaderboard-pagination__dot--active':
              currentPage === pageIndex - 1,
          }"
          @click="goToPage(pageIndex - 1)"
        ></div>
      </div>
    </div>
    <div class="c-display-end-game-summary-view__footer">
      <Button buttonTekst="Sluit sessie" variant="secondary" />

      <Button buttonTekst="Exporteren" variant="primary">
        <template #c-btn_icon-left>
          <Download :size="18" />
        </template>
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
