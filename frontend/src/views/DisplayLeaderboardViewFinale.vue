<script setup>
import LeaderboardPodiumIcon from "../components/LeaderboardPodiumIcon.vue";
import LeaderboardPlayerCard from "../components/LeaderboardPlayercard.vue";

import logo from "../assets/logo.webp";
import socket from "../utils/socket";
import { useRouter } from "vue-router";

import { ref, computed, watch, onMounted, onUnmounted } from "vue";

import { finalScoreRepository } from "../services/api";

const sessionID = sessionStorage.getItem("display_sessionId");
console.log("Leaderboard view initialized with sessionID:", sessionID);

const players = ref([]);
const router = useRouter();

const handleNavigate = (data) => {
  console.log("Received navigate event:", data);
  if (data.name) {
    router.push({ name: data.name, query: data.params });
  }
};

const loadGameData = async () => {
  if (!sessionID) {
    console.error("No session ID found for leaderboard");
    return;
  }

  try {
    const response = await finalScoreRepository.getBySession(sessionID);
    console.log("Final scores fetched:", response.data);

    // Map backend data to frontend structure
    players.value = response.data.map((p) => ({
      id: p.participant_id, // Note: backend returns participant_id
      spelersnaam: p.player_name || p.team_name || "Unknown",
      score: p.total_points || 0,
    }));

    // Start animation only after data is loaded
    startPodiumAnimation();
  } catch (error) {
    console.error("Failed to load final scores:", error);
  }
};

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

// Visibility states for podium animation
const showRank1 = ref(false); // 1st Place
const showRank2 = ref(false); // 2nd Place
const showRank3 = ref(false); // 3rd Place
const showRunnerUps = ref(false); // Remaining players
const showLogo = ref(false); // Logo
const isShaking = ref(false); // Screen shake effect
const isDrumrolling = ref(false); // Drumroll vibration

let autoScrollInterval = null;

const startAutoScroll = () => {
  if (autoScrollInterval) clearInterval(autoScrollInterval);

  autoScrollInterval = setInterval(() => {
    if (showRunnerUps.value && totalPages.value > 1) {
      currentPage.value = (currentPage.value + 1) % totalPages.value;
    }
  }, 30000); // 30 seconds interval
};

const goToPage = (pageIndex) => {
  currentPage.value = pageIndex;
  // Reset timer on manual interaction
  startAutoScroll();
};

const timeouts = [];

const startPodiumAnimation = () => {
  // Reset
  showRank1.value = false;
  showRank2.value = false;
  showRank3.value = false;
  showRunnerUps.value = false;
  showLogo.value = false;
  isShaking.value = false;
  isDrumrolling.value = false;
  currentPage.value = 0; // Reset page

  // Clear any existing timeouts first
  timeouts.forEach((t) => clearTimeout(t));
  timeouts.length = 0;

  // Calculate dynamic delays based on number of players
  let currentDelay = 1000;
  const playerCount = sortedPlayers.value.length;

  // 3rd Place (Only if we have at least 3 players)
  if (playerCount >= 3) {
    timeouts.push(
      setTimeout(() => {
        showRank3.value = true;
      }, currentDelay),
    );
    currentDelay += 3000; // Wait 3s before next
  }

  // 2nd Place (Only if we have at least 2 players)
  if (playerCount >= 2) {
    timeouts.push(
      setTimeout(() => {
        showRank2.value = true;
      }, currentDelay),
    );
    currentDelay += 3000; // Wait 3s before next
  }

  // Drumroll (Only if we have a winner)
  if (playerCount >= 1) {
    timeouts.push(
      setTimeout(() => {
        isDrumrolling.value = true;
      }, currentDelay),
    );
    // Determine drumroll duration: full 4s if standard, shorter (2s) if only 1 player for less wait?
    // User said "super long" for 1 player, so let's keep it relatively quick but tense.
    const drumrollDuration = playerCount === 1 ? 2000 : 4000;
    currentDelay += drumrollDuration;

    // 1st Place (Winner)
    timeouts.push(
      setTimeout(() => {
        // Stop drumroll, start huge shake
        isDrumrolling.value = false;

        showRank1.value = true;

        // Trigger Screen Shake
        isShaking.value = true;
        timeouts.push(
          setTimeout(() => {
            isShaking.value = false;
          }, 500),
        ); // Duration of shake animation

        // Trigger Confetti
        if (showRank1.value) {
          // Safety check
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#534aff", "#ff3b30", "#ffd60a"], // Using our theme colors if possible, or defaults
          });
        }
      }, currentDelay),
    );
    currentDelay += 4000; // Wait before showing runner ups
  }

  // Runner Ups
  timeouts.push(
    setTimeout(() => {
      showRunnerUps.value = true;
      startAutoScroll(); // Start auto-scroll when runner ups appear
    }, currentDelay),
  );

  // Logo fades in last
  timeouts.push(
    setTimeout(() => {
      showLogo.value = true;
    }, currentDelay + 1500),
  );
};

onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = "hidden";
  loadGameData();

  // Calculate initial items per page
  calculateItemsPerPage();
  window.addEventListener("resize", calculateItemsPerPage);

  // Start animation sequence only AFTER data is loaded (now called in loadGameData)
  // startPodiumAnimation(); 
  socket.on("display:navigate", handleNavigate);
});

onUnmounted(() => {
  // Re-enable body scrolling
  document.body.style.overflow = "";
  window.removeEventListener("resize", calculateItemsPerPage);
  if (autoScrollInterval) clearInterval(autoScrollInterval);
  socket.off("display:navigate", handleNavigate);

  // Clear all animation timeouts
  timeouts.forEach((t) => clearTimeout(t));
  timeouts.length = 0;

  // Clean up confetti
  confetti.reset();
});
</script>

<template>
  <div
    class="c-display-leaderboard-view-finale"
    :class="{
      'screen-shake': isShaking,
      'drumroll-shake': isDrumrolling,
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
  </div>
</template>

<style scoped></style>
