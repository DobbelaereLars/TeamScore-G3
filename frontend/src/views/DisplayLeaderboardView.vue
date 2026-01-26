<script setup>
import LeaderboardPodiumIcon from '../components/LeaderboardPodiumIcon.vue';
import LeaderboardPlayerCard from '../components/LeaderboardPlayercard.vue';

import logo from '../assets/logo.webp';
import socket from '../utils/socket';
import { useRouter, useRoute } from 'vue-router';

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import { finalScoreRepository } from '../services/api';

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
      // Formatting Logic for Single Game
      let displayScore = '';
      let scoreLabel = 'punten';

      if (p.is_single_game) {
        if (p.score_type === 'time') {
          // Check for null/undefined explicitly - 0 is a valid time!
          if (p.total_points === null || p.total_points === undefined) {
            displayScore = '--:--';
          } else {
            const totalSeconds = Number(p.total_points);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);
            displayScore = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
          scoreLabel = '';
        } else if (p.score_type === 'boolean') {
          displayScore = p.total_points ? 'Voltooid' : 'Niet voltooid';
          scoreLabel = '';
        }
      }

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
  return sortedPlayers.value.slice(3, 8);
});

onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = 'hidden';
  loadGameData();
  socket.on('display:navigate', handleNavigate);
});

onUnmounted(() => {
  // Re-enable body scrolling
  document.body.style.overflow = '';
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
          v-for="(player, index) in remainingPlayers"
          :key="player.id"
          class="c-player-wrapper"
        >
          <LeaderboardPlayerCard
            :position="index + 4"
            :playerName="player.spelersnaam"
            :maxValue="maxScore"
            :score="player.score"
            :display-score="player.displayScore"
            :score-label="player.scoreLabel"
          />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped></style>
