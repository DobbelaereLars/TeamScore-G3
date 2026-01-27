<script setup>
import ScoreboardPlayercard from '../components/ScoreboardPlayercard.vue';
import { gameRepository, sessionRepository } from '../services/api'; // Import repository
import logo from '../assets/logo.webp';
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { formatScore, getScoreLabel } from '../utils/formatters';

// Initial state can be empty or mock, we'll overwrite it when loadGameData is called
const players = ref([]);

// Function to load game data (to be called via SocketIO event later)
const loadGameData = async (gameId) => {
  try {
    const response = await gameRepository.getScores(gameId);

    // Map backend data to frontend structure
    players.value = response.data.map((p) => ({
      id: p.id,
      spelersnaam: p.spelersnaam,
      score: p.score !== null && p.score !== undefined ? p.score : null,
      rank: p.rank,
    }));

    // Optional: Fetch game and session details to update header
    const gameResponse = await gameRepository.getById(gameId);
    if (gameResponse.data) {
      gameinfo.value.gamename = gameResponse.data.name;
      gameinfo.value.totalRounds = gameResponse.data.rounds;
      gameinfo.value.currentRound = gameResponse.data.current_round;
      gameinfo.value.totalSets = gameResponse.data.sets;
      gameinfo.value.currentSet = gameResponse.data.current_set;

      gameinfo.value.scoreType = gameResponse.data.score_type || 'points';
      gameinfo.value.rankingRule =
        gameResponse.data.ranking_rule || 'highest_wins';

      try {
        gameinfo.value.scoreConfig = JSON.parse(
          gameResponse.data.score_config || '{}',
        );
      } catch (e) {
        gameinfo.value.scoreConfig = {};
      }

      // Also get session to check mode
      if (gameResponse.data.session_id) {
        try {
          const sessionRes = await sessionRepository.getById(
            gameResponse.data.session_id,
          );
          gameinfo.value.sessionName = sessionRes.data.name;
          gameinfo.value.gameMode = sessionRes.data.game_mode;
        } catch (err) {
          console.error(err);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load game data:', error);
  }
};

// Expose the function so it can be called externally (e.g. by socket listener)
defineExpose({
  loadGameData,
});

/*
const players = ref([
  {
    id: 1,
    spelersnaam: "John Doe",
    score: 85,
  },
  ...
]);
*/

const gameinfo = ref({
  currentRound: 0,
  totalRounds: 0,
  currentSet: 0,
  totalSets: 0,
  gamename: '',
  sessionName: '',
  gameMode: '',
  scoreType: 'points',
  scoreConfig: {},
  rankingRule: 'highest_wins',
});

// Calculate the highest score among all players
const maxScore = computed(() => {
  if (players.value.length === 0) return 100;
  // If boolean, max is 1.
  if (gameinfo.value.scoreType === 'boolean') return 1;
  const scores = players.value
    .map((player) => player.score)
    .filter((s) => s !== null && s !== undefined);

  if (scores.length === 0) return 100;

  const max = Math.max(...scores);
  return max > 0 ? max : 100;
});

// Calculate the minimum score among all players (for lowest_wins scenarios)
const minScore = computed(() => {
  if (players.value.length === 0) return 0;
  const scores = players.value
    .map((player) => player.score)
    .filter((s) => s !== null && s !== undefined);

  if (scores.length === 0) return 0;

  return Math.min(...scores);
});

// Computed property to sort players by score and calculate position/variant
const sortedPlayers = computed(() => {
  let sorted = [...players.value];

  // Custom sorting based on ranking rule
  const isLowestWins = gameinfo.value.rankingRule === 'lowest_wins';

  // For boolean: Completed (1) > Not Completed (0). Always High Wins.
  // Unless user mapped Completed differently. Usually 1 is good.

  sorted.sort((a, b) => {
    if (gameinfo.value.scoreType === 'boolean') {
      return b.score - a.score; // 1 before 0
    }
    if (isLowestWins) {
      // For time/golf: Lower is better.
      // null means "no score yet" -> should go last
      const valA = a.score;
      const valB = b.score;

      const isNullA = valA === null || valA === undefined;
      const isNullB = valB === null || valB === undefined;

      if (isNullA && isNullB) return 0;
      if (isNullA) return 1;
      if (isNullB) return -1;

      return valA - valB;
    }

    // Explicit check for Highest Wins (Slowest time) to handle nulls correctly
    const valA = a.score;
    const valB = b.score;
    const isNullA = valA === null || valA === undefined;
    const isNullB = valB === null || valB === undefined;

    if (isNullA && isNullB) return 0;
    if (isNullA) return 1; // Null is last
    if (isNullB) return -1;

    return b.score - a.score;
  });

  return sorted.map((player, index) => {
    const position = index + 1;
    let variant;

    if (position === 1) {
      variant = 'P1';
    } else if (position === 2) {
      variant = 'P2';
    } else if (position === 3) {
      variant = 'P3';
    } else {
      variant = 'Px';
    }

    return {
      ...player,
      position,
      variant,
      maxValue: maxScore.value,
      minValue: minScore.value,
      rankingRule: gameinfo.value.rankingRule,
      displayScore: formatScore(
        player.score,
        gameinfo.value.scoreType,
        gameinfo.value.scoreConfig,
      ),
      scoreLabel: getScoreLabel(gameinfo.value.scoreType, player.score),
    };
  });
});

const currentPage = ref(0);
const playersPerPage = ref(0); // Initialize at 0 to prevent flash of wrong layout
const playersContainer = ref(null);

// Calculate how many players fit per page based on screen width
const calculatePlayersPerPage = () => {
  if (playersContainer.value) {
    const containerWidth = playersContainer.value.offsetWidth;
    const cardWidth = 280; // 17.5rem = 280px
    const gap = 15; // 0.9375rem ≈ 15px
    const columnsPerRow = Math.floor(
      (containerWidth + gap) / (cardWidth + gap),
    );
    // Ensure we have at least one column/row to avoid issues, though 0 is handled below
    if (columnsPerRow > 0) {
      playersPerPage.value = columnsPerRow * 2; // 2 rows
    }
  }
};

// Paginated players
const paginatedPlayers = computed(() => {
  if (playersPerPage.value === 0) return [];
  const start = currentPage.value * playersPerPage.value;
  const end = start + playersPerPage.value;
  return sortedPlayers.value.slice(start, end);
});

const totalPages = computed(() => {
  if (playersPerPage.value === 0) return 0;
  return Math.ceil(sortedPlayers.value.length / playersPerPage.value);
});

import socket from '../utils/socket';

let pageInterval = null;

const handleSession = (data) => {
  if (data && data.sessionId) {
    // Persist to URL
    const url = new URL(window.location);
    url.searchParams.set('sessionId', data.sessionId);
    window.history.pushState({}, '', url);
    // Persist to storage
    sessionStorage.setItem('display_sessionId', data.sessionId);

    sessionRepository.getGames(data.sessionId).then((response) => {
      if (response.data && response.data.length > 0) {
        const lowestGameId = Math.min(...response.data.map((g) => g.id));
        loadGameData(lowestGameId);
      }
    });
    return;
  }
};

const router = useRouter();

const handleNavigate = (data) => {
  if (data.name) {
    router.push({ name: data.name, query: data.params });
  }
};

const handleSelectedGame = (data) => {
  if (data && data.gameId) {
    // Persist to URL
    const url = new URL(window.location);
    url.searchParams.set('gameId', data.gameId);
    window.history.pushState({}, '', url);
    // Persist to storage
    sessionStorage.setItem('display_gameId', data.gameId);

    loadGameData(data.gameId);
  }
};

const handleScoreUpdate = (data) => {
  // data = { gameId, participantId, score, scoreType }

  // Verify if update belongs to current game (if we know the current game ID)
  const currentGameId = sessionStorage.getItem('display_gameId');
  if (currentGameId && String(data.gameId) !== String(currentGameId)) {
    return;
  }

  // Find player to update
  const player = players.value.find(
    (p) => String(p.id) === String(data.participantId),
  );
  if (player) {
    player.score = data.score;
  } else {
    // If player not found locally, reload all data to be safe (might be new player or mapping issue)
    if (currentGameId) {
      loadGameData(currentGameId);
    }
  }
};

const handleGameConfigUpdated = (data) => {
  const currentGameId = sessionStorage.getItem('display_gameId');
  if (currentGameId && String(data.gameId) === String(currentGameId)) {
    loadGameData(currentGameId);
  }
};

const showRoundOverlay = ref(false);
const roundBannerText = ref('');
const setBannerText = ref('');
let overlayTimeout = null;

const handleGameInfoUpdate = async (data) => {
  if (data.gameId) {
    // Only update if it matches current game or we just want to show latest info
    const currentGameId = sessionStorage.getItem('display_gameId');
    if (!currentGameId || String(data.gameId) === String(currentGameId)) {
      if (data.gameName) gameinfo.value.gamename = data.gameName;

      // Check for changes to trigger animation
      const roundChanged =
        data.currentRound && data.currentRound !== gameinfo.value.currentRound;
      const setChanged =
        data.currentSet && data.currentSet !== gameinfo.value.currentSet;

      if (roundChanged || setChanged) {
        // Clear existing timeout if any, to reset the duration
        if (overlayTimeout) clearTimeout(overlayTimeout);

        // Force reset the overlay to trigger re-animation
        showRoundOverlay.value = false;
        await nextTick();

        // Update texts
        roundBannerText.value = '';
        setBannerText.value = '';

        if (roundChanged) {
          roundBannerText.value = `RONDE ${data.currentRound}`;
        }

        if (setChanged) {
          setBannerText.value = `SET ${data.currentSet}`;
        }

        // Show overlay with new text
        showRoundOverlay.value = true;

        // Set new timeout using the tracked variable
        overlayTimeout = setTimeout(() => {
          showRoundOverlay.value = false;
        }, 3000);
      }

      if (data.currentSet) gameinfo.value.currentSet = data.currentSet;
      if (data.totalSets) gameinfo.value.totalSets = data.totalSets;
      if (data.currentRound) gameinfo.value.currentRound = data.currentRound;
      if (data.totalRounds) gameinfo.value.totalRounds = data.totalRounds;
    }
  }
};

onMounted(() => {
  // Listen for game selection from dashboard
  socket.on('display:session', handleSession);
  socket.on('display:selected-game', handleSelectedGame);
  socket.on('display:navigate', handleNavigate);
  socket.on('score:update', handleScoreUpdate);
  socket.on('display:update-game-info', handleGameInfoUpdate);
  socket.on('game-config-updated', handleGameConfigUpdated);

  // Check URL params first, then sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  const urlGameId = urlParams.get('gameId');
  const urlSessionId = urlParams.get('sessionId');

  const storedGameId = sessionStorage.getItem('display_gameId');
  const storedSessionId = sessionStorage.getItem('display_sessionId');

  const gameIdToLoad = urlGameId || storedGameId;
  const sessionIdToLoad = urlSessionId || storedSessionId;

  if (gameIdToLoad) {
    loadGameData(gameIdToLoad);
  } else if (sessionIdToLoad) {
    // If we only have session, load games to find the first one
    handleSession({ sessionId: sessionIdToLoad });
  }

  calculatePlayersPerPage();

  // Add resize listener to recalculate on window resize
  window.addEventListener('resize', calculatePlayersPerPage);

  // Only start auto-scroll if there are multiple pages
  if (totalPages.value > 1) {
    pageInterval = setInterval(() => {
      currentPage.value = (currentPage.value + 1) % totalPages.value;
    }, 30000); // 30 seconds
  }
});

// Watch for game name changes to recalculate layout after render
watch(
  () => gameinfo.value.gamename,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        calculatePlayersPerPage();
      });
    }
  },
);

onUnmounted(() => {
  socket.off('display:session', handleSession);
  socket.off('display:selected-game', handleSelectedGame);
  socket.off('display:navigate', handleNavigate);
  socket.off('score:update', handleScoreUpdate);
  socket.off('display:update-game-info', handleGameInfoUpdate);
  socket.off('game-config-updated', handleGameConfigUpdated);
  window.removeEventListener('resize', calculatePlayersPerPage);
  if (pageInterval) {
    clearInterval(pageInterval);
  }
});
</script>

<template>
  <div class="v-display-scoreboard" v-if="gameinfo.gamename">
    <div class="v-display-scoreboard-header">
      <div class="v-display-scoreboard-logo">
        <img :src="logo" alt="TeamScore Logo" style="height: 8rem" />
      </div>
      <div class="v-display-scoreboard-info">
        <h2 v-if="gameinfo.gameMode === 'single'">
          {{ gameinfo.sessionName }}
        </h2>
        <h2 v-else>{{ gameinfo.gamename }}</h2>
        <p
          v-if="gameinfo.totalRounds > 1"
          class="v-display-scoreboard-round h6"
        >
          Ronde {{ gameinfo.currentRound }} van {{ gameinfo.totalRounds }}
        </p>
        <div v-if="gameinfo.totalSets > 1" class="v-display-scoreboard-sets">
          <p>Set {{ gameinfo.currentSet }} van {{ gameinfo.totalSets }}</p>
        </div>
      </div>
    </div>
    <div class="v-display-scoreboard-players-wrapper" ref="playersContainer">
      <Transition name="slide">
        <TransitionGroup
          tag="div"
          name="scoreboard-item"
          :key="currentPage"
          class="v-display-scoreboard-players-container"
        >
          <div
            v-for="player in paginatedPlayers"
            :key="player.id"
            class="scoreboard-item-wrapper"
          >
            <ScoreboardPlayercard
              :spelersnaam="player.spelersnaam"
              :score="player.score"
              :display-score="player.displayScore"
              :score-label="player.scoreLabel"
              :max-value="maxScore"
              :min-value="minScore"
              :ranking-rule="gameinfo.rankingRule"
              :position="player.position"
              :variant="player.variant"
            />
          </div>
        </TransitionGroup>
      </Transition>
    </div>

    <!-- Round Transition Banner -->
    <Transition name="banner-slide">
      <div
        v-if="showRoundOverlay"
        class="v-display-scoreboard-round-banner"
        :class="{ 'is-stacked': roundBannerText && setBannerText }"
      >
        <div class="v-display-scoreboard-round-banner__content">
          <div
            v-if="roundBannerText"
            class="v-display-scoreboard-round-banner__track"
          >
            <span
              v-for="n in 10"
              :key="'r' + n"
              class="v-display-scoreboard-round-banner__text"
            >
              {{ roundBannerText }} <span class="dot">&bull;</span>
            </span>
          </div>

          <div
            v-if="setBannerText"
            class="v-display-scoreboard-round-banner__track"
          >
            <span
              v-for="n in 10"
              :key="'s' + n"
              class="v-display-scoreboard-round-banner__text"
            >
              {{ setBannerText }} <span class="dot">&bull;</span>
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped></style>
