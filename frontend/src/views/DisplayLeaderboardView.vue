<script setup>
import LeaderboardPodiumIcon from '../components/LeaderboardPodiumIcon.vue';
import LeaderboardPlayerCard from '../components/LeaderboardPlayercard.vue';

import logo from '../assets/logo.webp';
import socket from '../utils/socket';
import { useRouter, useRoute } from 'vue-router';

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import { finalScoreRepository } from '../services/api';

const sessionID = sessionStorage.getItem('display_sessionId');
console.log('Leaderboard view initialized with sessionID:', sessionID);

const players = ref([]);
const router = useRouter();
const route = useRoute();

const handleNavigate = (data) => {
  console.log('Received navigate event:', data);
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
    console.log('Final scores fetched:', response.data);

    // Map backend data to frontend structure
    const rawPlayers = response.data.map((p) => {
      // Formatting Logic for Single Game
      let displayScore = '';
      let scoreLabel = 'punten';

      if (p.is_single_game) {
        if (p.score_type === 'time') {
          const totalSeconds = Number(p.total_points) || 0;
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = Math.floor(totalSeconds % 60);
          // Simple mm:ss formatting for leaderboard, can be enhanced to match user preference if we fetched config
          displayScore = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          scoreLabel = '';
        } else if (p.score_type === 'boolean') {
          displayScore = p.total_points ? 'Voltooid' : 'Niet voltooid';
          scoreLabel = '';
        }
      }

      return {
        id: p.participant_id,
        spelersnaam: p.player_name || p.team_name || 'Unknown',
        score: p.total_points || 0,
        rank: p.final_rank, // Use backend rank
        displayScore,
        scoreLabel,
      };
    });

    players.value = rawPlayers;
  } catch (error) {
    console.error('Failed to load final scores:', error);
  }
};

// Sort players by score (highest first)
const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => {
    // Trust backend rank if available
    if (a.rank && b.rank) {
      return a.rank - b.rank; // 1 before 2
    }
    // Fallback (Only works for High Score wins)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
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
          :animated="false"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[0]"
          class="podium-rank-1"
          color="blue"
          :spelersnaam="topThreePlayers[0].spelersnaam"
          :score="topThreePlayers[0].score"
          :display-score="topThreePlayers[0].displayScore"
          :score-label="topThreePlayers[0].scoreLabel"
          :animated="false"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[2]"
          class="podium-rank-3"
          color="orange"
          :spelersnaam="topThreePlayers[2].spelersnaam"
          :score="topThreePlayers[2].score"
          :display-score="topThreePlayers[2].displayScore"
          :score-label="topThreePlayers[2].scoreLabel"
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
            :display-score="player.displayScore"
            :score-label="player.scoreLabel"
          />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped></style>
