<script setup>
import LeaderboardPodiumIcon from '../components/LeaderboardPodiumIcon.vue';
import LeaderboardPlayerCard from '../components/LeaderboardPlayercard.vue';

import logo from '../assets/logo.webp';
import socket from '../utils/socket';
import { useRouter, useRoute } from 'vue-router';

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import { finalScoreRepository } from '../services/api';
import { formatScore, getScoreLabel } from '../utils/formatters';

const sessionID = sessionStorage.getItem('display_sessionId');

const players = ref([]);
const router = useRouter();
const route = useRoute();

const handleNavigate = (data) => {
  if (data.name) {
    router.push({ name: data.name, query: data.params });
  }
};

const loadGameData = async () => {
  if (!sessionID) {
    console.error('No session ID found for leaderboard');
    return;
  }

  try {
    const gameId = route.query.gameId;
    const response = await finalScoreRepository.getBySession(sessionID, {
      gameId,
    });

    // Map backend data to frontend structure
    const rawPlayers = response.data.map((p) => {
      // Create config object for formatter
      const scoreConfig = {
        timeNotation: p.time_notation,
      };

      let displayScore = formatScore(p.total_points, p.score_type, scoreConfig);
      let scoreLabel = getScoreLabel(p.score_type, p.total_points);

      return {
        id: p.participant_id,
        spelersnaam: p.player_name || p.team_name || 'Unknown',
        score:
          p.total_points !== null && p.total_points !== undefined
            ? Number(p.total_points)
            : null,
        rank: p.final_rank, // Use backend rank
        displayScore,
        scoreLabel,
        score_type: p.score_type, // Pass through
        ranking_rule: p.ranking_rule, // Pass through
      };
    });

    players.value = rawPlayers;
    console.log('Loaded players:', JSON.stringify(rawPlayers, null, 2));
  } catch (error) {
    console.error('Failed to load final scores:', error);
  }
};

// Sort players by score
const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => {
    // ALWAYS trust backend rank first if available - backend already applies correct ranking_rule
    if (a.rank && b.rank) return a.rank - b.rank;

    // For time games: always sort by lowest time wins (ignore backend rank which may be stale)
    const samplePlayer = players.value[0];
    const isTimeGame = samplePlayer?.score_type === 'time';
    const isLowestWins =
      isTimeGame && samplePlayer?.ranking_rule !== 'highest_wins';

    if (isLowestWins) {
      // Lower time is better. 0 is valid (fastest). null = no score = last.
      const scoreA =
        a.score === null || a.score === undefined ? Infinity : a.score;
      const scoreB =
        b.score === null || b.score === undefined ? Infinity : b.score;
      return scoreA - scoreB;
    }

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
  return sortedPlayers.value.slice(3); // Show all remaining players, pagination handles limit
});

const ITEMS_per_PAGE = ref(5);
const currentPage = ref(0);

const calculateItemsPerPage = () => {
  // Estimate height usage:
  // Podium section (~450px: 26rem height + margins)
  // Header/Padding (~100px)
  // Pagination Dots (~40px) + Margin (~20px) = 60px
  const reservedHeight = 580;
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

let autoScrollInterval = null;

const startAutoScroll = () => {
  if (autoScrollInterval) clearInterval(autoScrollInterval);

  // 30 seconds interval as requested
  autoScrollInterval = setInterval(() => {
    if (totalPages.value > 1) {
      currentPage.value = (currentPage.value + 1) % totalPages.value;
    }
  }, 30000);
};

const goToPage = (pageIndex) => {
  currentPage.value = pageIndex;
  // Reset timer on manual interaction
  startAutoScroll();
};

onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = 'hidden';
  loadGameData();

  // Calculate items per page
  calculateItemsPerPage();
  window.addEventListener('resize', calculateItemsPerPage);
  startAutoScroll();

  socket.on('display:navigate', handleNavigate);
});

onUnmounted(() => {
  // Re-enable body scrolling
  document.body.style.overflow = '';
  window.removeEventListener('resize', calculateItemsPerPage);
  if (autoScrollInterval) clearInterval(autoScrollInterval);

  socket.off('display:navigate', handleNavigate);
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
          class="podium-rank-2"
          color="red"
          :spelersnaam="topThreePlayers[1].spelersnaam"
          :score="topThreePlayers[1].score"
          :display-score="topThreePlayers[1].displayScore"
          :score-label="topThreePlayers[1].scoreLabel"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[0]"
          class="podium-rank-1"
          color="blue"
          :spelersnaam="topThreePlayers[0].spelersnaam"
          :score="topThreePlayers[0].score"
          :display-score="topThreePlayers[0].displayScore"
          :score-label="topThreePlayers[0].scoreLabel"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[2]"
          class="podium-rank-3"
          color="orange"
          :spelersnaam="topThreePlayers[2].spelersnaam"
          :score="topThreePlayers[2].score"
          :display-score="topThreePlayers[2].displayScore"
          :score-label="topThreePlayers[2].scoreLabel"
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
          v-for="(player, index) in displayedPlayers"
          :key="player.id"
          class="c-player-wrapper"
        >
          <LeaderboardPlayerCard
            :position="index + 4 + currentPage * ITEMS_per_PAGE"
            :playerName="player.spelersnaam"
            :maxValue="maxScore"
            :score="player.score"
            :display-score="player.displayScore"
            :score-label="player.scoreLabel"
          />
        </div>
      </TransitionGroup>

      <!-- Pagination Dots -->
      <div class="c-leaderboard-pagination" v-if="totalPages > 1">
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
