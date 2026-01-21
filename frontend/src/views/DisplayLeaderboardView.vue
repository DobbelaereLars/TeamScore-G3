<script setup>
import LeaderboardPodiumIcon from "../components/LeaderboardPodiumIcon.vue";
import LeaderboardPlayerCard from "../components/LeaderboardPlayercard.vue";

import logo from "../assets/logo.webp";

import { ref, computed, watch, onMounted, onUnmounted } from "vue";

import { finalScoreRepository } from "../services/api";

const sessionID = sessionStorage.getItem("display_sessionId");
console.log("Leaderboard view initialized with sessionID:", sessionID);

const players = ref([]);

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
// Get remaining players (from position 4 onwards)
const remainingPlayers = computed(() => {
  return sortedPlayers.value.slice(3, 8);
});


onMounted(() => {
  // Disable body scrolling
  document.body.style.overflow = "hidden";
  loadGameData();
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
  </div>
</template>

<style scoped></style>
