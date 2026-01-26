<script setup>
import { ref, computed, nextTick } from 'vue';
import html2canvas from 'html2canvas';
import { sessionRepository, gameRepository } from '../services/api';
import LeaderboardPodiumIcon from './LeaderboardPodiumIcon.vue';
import logo from '../assets/logo.webp';

const containerRef = ref(null);
const sessionPlayers = ref([]);
const isGenerating = ref(false);
const activeScoreType = ref('points'); // points, time, boolean
const activeRankingRule = ref('highest_wins'); // highest_wins, lowest_wins

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return '--:--';
  const totalSeconds = Math.floor(Number(seconds) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const sortedPlayers = computed(() => {
  if (!Array.isArray(sessionPlayers.value)) return [];

  return [...sessionPlayers.value].sort((a, b) => {
    // ALWAYS use backend rank if available (backend already applies correct ranking_rule)
    if (a.rank && b.rank) return a.rank - b.rank;

    // Handle null scores (no score = ranked last)
    // Convert to number but preserve nulls
    const valA =
      a.score === null || a.score === undefined ? null : Number(a.score);
    const valB =
      b.score === null || b.score === undefined ? null : Number(b.score);

    const isNullA = valA === null;
    const isNullB = valB === null;

    if (isNullA && isNullB) return 0;
    if (isNullA) return 1;
    if (isNullB) return -1;

    // Fallback sorting when no rank available
    // For time games: default to lowest_wins (fastest time) unless explicitly highest_wins
    const isTimeGame = activeScoreType.value === 'time';
    const isLowestWins = isTimeGame
      ? activeRankingRule.value !== 'highest_wins' // Time: default lowest wins
      : activeRankingRule.value === 'lowest_wins'; // Points: default highest wins

    if (isLowestWins) {
      return valA - valB; // Lower is better
    }
    // Default: highest_wins
    return valB - valA; // Higher is better
  });
});

const topThree = computed(() => {
  const p = sortedPlayers.value;
  return {
    rank1: p[0],
    rank2: p[1],
    rank3: p[2],
  };
});

// Helper to get display props for podium icon
const getPlayerProps = (player) => {
  if (!player) return {};

  const props = {
    spelersnaam: player.name || player.spelersnaam || player.team_name,
    score:
      player.score !== null && player.score !== undefined ? player.score : 0,
    displayScore: undefined,
    scoreLabel: undefined,
  };

  if (activeScoreType.value === 'time') {
    props.displayScore = formatTime(player.score);
    props.scoreLabel = ' '; // Hide 'ptn' label
  } else if (
    activeScoreType.value === 'boolean' ||
    activeScoreType.value === 'completed'
  ) {
    props.displayScore = player.score ? 'Voltooid' : 'Niet voltooid';
    props.scoreLabel = ' ';
  } else {
    // Explicitly clear displayScore so RollingNumber takes over for Points
    props.displayScore = undefined;
  }

  return props;
};

const generateAndUpload = async (sessionId, gameIdOrList) => {
  // Don't skip if already generating - we want the latest data
  // Just wait for it to finish first
  if (isGenerating.value) {
    // Wait for current generation to finish
    await new Promise((r) => setTimeout(r, 500));
  }

  isGenerating.value = true;
  activeScoreType.value = 'points'; // reset default
  activeRankingRule.value = 'highest_wins'; // reset default

  // Clear existing data first to force re-render
  sessionPlayers.value = [];
  await nextTick();

  try {
    if (Array.isArray(gameIdOrList)) {
      // Provided list (Setup view)
      sessionPlayers.value = gameIdOrList;
      // Check for transient config property attached to array
      if (gameIdOrList.previewType) {
        activeScoreType.value = gameIdOrList.previewType;
      }
      if (gameIdOrList.rankingRule) {
        activeRankingRule.value = gameIdOrList.rankingRule;
      }
    } else if (gameIdOrList) {
      // Game ID provided - Fetch Game specific scores
      const gameId = gameIdOrList;

      // 1. Get Game Config for Score Type and Ranking Rule
      try {
        const gameRes = await gameRepository.getById(gameId);
        const game = gameRes.data;
        if (game) {
          const sType = (game.score_type || 'points').toLowerCase();
          if (sType === 'boolean') activeScoreType.value = 'boolean';
          else if (sType === 'time') activeScoreType.value = 'time';
          else activeScoreType.value = 'points';

          // Set ranking rule from game config
          activeRankingRule.value = game.ranking_rule || 'highest_wins';
        }
      } catch (e) {
        console.error('Error fetching game config for preview:', e);
      }

      // 2. Get Scores via final-scores endpoint (includes majority logic for boolean)
      // This endpoint respects ranking_rule and calculates boolean majority correctly
      const scoresRes = await sessionRepository.getFinalScores(sessionId, {
        gameId,
      });

      // Map to standardized format
      sessionPlayers.value = scoresRes.data.map((s) => {
        const val =
          s.total_points !== null && s.total_points !== undefined
            ? s.total_points
            : null;

        return {
          name: s.player_name || s.team_name || s.participant_name || 'Unknown',
          score: val,
          rank: s.final_rank,
        };
      });
    } else {
      // Session Overview (Default / End Session)
      const res = await sessionRepository.getFinalScores(sessionId); // Use getFinalScores from sessionRepo

      // Check if this is a single game with specific score type
      if (res.data.length > 0 && res.data[0].is_single_game) {
        const scoreType = res.data[0].score_type;
        const rankingRule = res.data[0].ranking_rule;
        if (scoreType === 'time') activeScoreType.value = 'time';
        else if (scoreType === 'boolean') activeScoreType.value = 'boolean';
        else activeScoreType.value = 'points';

        if (rankingRule) activeRankingRule.value = rankingRule;
      }

      sessionPlayers.value = res.data.map((p) => {
        return {
          name: p.player_name || p.team_name || 'Unknown',
          // Preserve null for proper sorting (null = no score)
          score:
            p.total_points !== null && p.total_points !== undefined
              ? p.total_points
              : null,
          rank: p.final_rank, // Use backend rank which respects ranking_rule
        };
      });
    }

    // Wait for Vue reactivity to update computed properties
    await nextTick();

    // Extra delay for rendering/fonts - increased for reliability
    await new Promise((r) => setTimeout(r, 500));

    if (!containerRef.value) {
      console.error('Preview container not found');
      return;
    }

    const canvas = await html2canvas(containerRef.value, {
      scale: 1, // standard scale
      useCORS: true,
      backgroundColor: '#fdffff', // forced white background
      width: 800,
      height: 600,
      windowWidth: 800,
      windowHeight: 600,
    });

    const imageBase64 = canvas.toDataURL('image/webp', 0.8);

    // Upload
    await sessionRepository.uploadImage(sessionId, imageBase64);
  } catch (e) {
    console.error('Failed to generate session preview:', e);
  } finally {
    isGenerating.value = false;
  }
};

defineExpose({ generateAndUpload });
</script>

<template>
  <div class="preview-wrapper">
    <!-- 
      Using classes from DisplayLeaderboardViewFinale to reuse the styles 
      (purple blob, podium layout, colors).
    -->
    <div
      class="c-session-preview c-display-leaderboard-view-finale is-centered"
      ref="containerRef"
    >
      <div class="c-display-leaderboard-view-finale__header">
        <div
          class="c-display-leaderboard-view-finale__podium custom-podium-layout"
        >
          <!-- Rank 2 (Silver) -->
          <div class="podium-place place-2">
            <LeaderboardPodiumIcon
              v-if="topThree.rank2"
              :visible="true"
              :animated="false"
              color="red"
              v-bind="getPlayerProps(topThree.rank2)"
            />
          </div>

          <!-- Rank 1 (Gold) -->
          <div class="podium-place place-1">
            <LeaderboardPodiumIcon
              v-if="topThree.rank1"
              :visible="true"
              :animated="false"
              color="blue"
              v-bind="getPlayerProps(topThree.rank1)"
            />
          </div>

          <!-- Rank 3 (Bronze) -->
          <div class="podium-place place-3">
            <LeaderboardPodiumIcon
              v-if="topThree.rank3"
              :visible="true"
              :animated="false"
              color="orange"
              v-bind="getPlayerProps(topThree.rank3)"
            />
          </div>
        </div>
      </div>

      <!-- No player list here -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-wrapper {
  position: fixed;
  top: 0;
  left: -9999px;
  z-index: -1000;
  pointer-events: none;
}

.c-session-preview {
  width: 800px;
  height: 600px;
  background: #fdffff; // Fallback background
  overflow: hidden;
  position: relative; // Ensure relative positioning for absolute children

  // Fix logo visibility and size for preview context
  .c-display-leaderboard-view-finale__logo.show-logo {
    opacity: 1 !important;
    position: absolute;
    top: 2rem;
    left: 2rem;
    width: 6rem;
    height: 6rem;
    img {
      width: 100%;
      height: auto;
    }
  }

  // Scale the podium to fit nicely in 800x600 if needed.
  // We'll use absolute positioning for strict control based on user requirements.
  .custom-podium-layout {
    display: block !important; // Override grid
    position: relative !important;
    width: 600px !important; // Fixed canvas for podium
    height: 400px !important;
    margin: 40px auto 0 !important; // Moved up more
    transform: scale(1.3); // Zoomed in
    transform-origin: center center;
    grid-template-columns: none !important;
    grid-template-rows: none !important;

    // Background Blob fix for block layout
    &::before {
      content: '';
      position: absolute;
      width: 500px;
      height: 500px;
      background: rgba(
        83,
        74,
        255,
        0.05
      ); // Match $color-primary-blue-75 approx or inherit
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
      border-radius: 9999px;
      pointer-events: none;
    }

    .podium-place {
      position: absolute;
      z-index: 1;
      display: flex;
      justify-content: center;
      width: 180px; // Estimate width of icon component
    }

    // Rank 1: Top Center
    .place-1 {
      top: -65px; // Moved up more
      left: 50%;
      transform: translateX(-50%);
      z-index: 2; // On top of others if overlap
    }

    // Rank 2: Bottom Left
    .place-2 {
      bottom: 90px; // Moved up more
      left: 20px;
    }

    // Rank 3: Bottom Right (Same height as Rank 2)
    .place-3 {
      bottom: 90px; // Moved up more
      right: 20px;
    }
  }

  // --- HTML2CANVAS OVERRIDES ---
  // Fix gradients and glows that fail to render correctly in html2canvas
  :deep(.c-leaderboard-podium-icon__profile-container) {
    // Strengthen the glow
    &.c-leaderboard-podium-icon__profile-container--blue {
      box-shadow: 0 0 40px 5px rgba(74, 207, 255, 0.8) !important;
    }
    &.c-leaderboard-podium-icon__profile-container--orange {
      box-shadow: 0 0 40px 5px rgba(255, 191, 102, 0.8) !important;
    }
    // Default red
    &:not(.c-leaderboard-podium-icon__profile-container--blue):not(
        .c-leaderboard-podium-icon__profile-container--orange
      ) {
      box-shadow: 0 0 40px 5px rgba(235, 141, 136, 0.8) !important;
    }

    // Fix Text Gradient: DISABLE gradient and use solid color
    // Targeting both tag 'h2' and class '.h2' to be safe
    .c-leaderboard-podium-icon__profileIcon h2,
    .c-leaderboard-podium-icon__profileIcon .h2 {
      background: none !important;
      -webkit-background-clip: border-box !important;
      background-clip: border-box !important;
      -webkit-text-fill-color: initial !important;

      // Default Red
      color: #99231d !important;
    }

    &.c-leaderboard-podium-icon__profile-container--blue
      .c-leaderboard-podium-icon__profileIcon
      h2,
    &.c-leaderboard-podium-icon__profile-container--blue
      .c-leaderboard-podium-icon__profileIcon
      .h2 {
      color: #007e94 !important;
    }

    &.c-leaderboard-podium-icon__profile-container--orange
      .c-leaderboard-podium-icon__profileIcon
      h2,
    &.c-leaderboard-podium-icon__profile-container--orange
      .c-leaderboard-podium-icon__profileIcon
      .h2 {
      color: #ce8006 !important;
    }
  }
}
</style>
