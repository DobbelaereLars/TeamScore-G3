<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Button from '../components/Button.vue';
import TabList from '../components/TabList.vue';
import InputField from '../components/InputField.vue';
import InputSelect from '../components/InputSelect.vue';
import TabBar from '../components/TabBar.vue';
import ToggleWithDropdown from '../components/ToggleWithDropdown.vue';
import PlayersSetting from '../components/PlayersSetting.vue';
import Modal from '../components/Modal.vue';
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Settings2,
  Users,
  Plus,
  LayoutList,
} from 'lucide-vue-next';
import InputNumber from '../components/InputNumber.vue';
import socket from '../utils/socket';
import {
  sessionRepository,
  gameRepository,
  participantRepository,
  playerRepository,
  teamRepository,
} from '../services/api';

const router = useRouter();
const route = useRoute();
const currentSessionId = sessionStorage.getItem('sessionId');

// Form state
const sessionName = ref('');
const selectedParticipantMode = ref('players');
const selectedGameMode = ref('single-game');
const participants = ref([]);
const originalParticipants = ref([]);

// Time notation options
const timeNotationOptions = [
  { value: 'hh:mm:ss', label: 'Uur : minuut : seconde' },
  { value: 'mm:ss', label: 'Minuut : seconde' },
  { value: 'ss', label: 'Seconde' },
  { value: 'hh:mm:ss:ms', label: 'Uur : minuut : seconde : milliseconde' },
];

// Games management (voor serie en parallelle games)
const games = ref([
  {
    id: 'game-1',
    name: '',
    scoreModel: 'points',
    useRounds: false,
    roundsCount: 2,
    useSets: false,
    setsCount: 2,
    originalUseSets: false,
    currentRound: 1,
    pointsPerAction: 1,
    pointsRanking: 'highest-first',
    useBonusPoints: false,
    bonusPoints: 1,
    timeNotation: 'mm:ss',
    timeRanking: 'fastest-first',
    useTimeBonusPoints: false,
    timeBonusPoints: 1,
  },
]);
const originalGames = ref([]);

const activeGameIndex = ref(0);
const gameToDeleteId = ref(null);
const deleteGameModalId = 'delete-game-modal';
const deleteGameModalTitle = ref('Game verwijderen?');

// Assignment
const assignmentGameId = ref(null);
const assignmentModalId = 'assignment-modal';
const assignmentModalTitle = ref('');
const tempAssignments = ref({}); // Stores temporary state while modal is open { participantId: gameId | null }

// Assignment Warning Modal
const showAssignmentWarning = ref(false);
const assignmentWarningModalId = 'assignment-warning-modal';
const assignmentWarningModalTitle = ref('Waarschuwing: Punten Reset');
const pendingAssignmentChanges = ref([]);

const sessionNamePlaceholder = computed(() => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `Bv. Sportdag ${day}/${month}/${year}`;
});

onMounted(async () => {
  try {
    const storedId = sessionStorage.getItem('sessionId');
    const currentSessionId = storedId ? parseInt(storedId) : 1;

    const sessionRes = await sessionRepository.getById(currentSessionId);
    sessionName.value = sessionRes.data.name;

    // Map backend modes to frontend values
    const partMode = sessionRes.data.participant_mode;
    if (partMode === 'teams_with_players')
      selectedParticipantMode.value = 'teams-with-players';
    else selectedParticipantMode.value = partMode;

    const gMode = sessionRes.data.game_mode;
    if (gMode === 'single') selectedGameMode.value = 'single-game';
    else if (gMode === 'series') selectedGameMode.value = 'series-of-games';
    else if (gMode === 'parallel') selectedGameMode.value = 'parallel-games';
    else selectedGameMode.value = 'single-game';

    const gamesRes = await sessionRepository.getGames(currentSessionId);
    if (gamesRes.data && gamesRes.data.length > 0) {
      games.value = gamesRes.data.map((g) => {
        const config = JSON.parse(g.score_config || '{}');
        const scoreType =
          g.score_type === 'boolean' ? 'completed' : g.score_type;

        let pointRanking = 'highest-first';
        let timeRanking = 'fastest-first';

        if (scoreType === 'points') {
          pointRanking =
            g.ranking_rule === 'lowest_wins' ? 'lowest-first' : 'highest-first';
        } else if (scoreType === 'time') {
          timeRanking =
            g.ranking_rule === 'highest_wins'
              ? 'slowest-first'
              : 'fastest-first';
        }

        return {
          ...config,
          id: g.id,
          name: g.name,
          scoreModel: scoreType,
          useRounds: g.rounds > 1,
          roundsCount: g.rounds > 1 ? g.rounds : 2,
          useSets: g.sets > 1,
          setsCount: g.sets > 1 ? g.sets : 2,
          originalUseSets: g.sets > 1,
          originalRoundsCount: g.rounds > 1 ? g.rounds : 0,
          currentRound: g.current_round || 1,
          pointsPerAction: config.pointsPerAction || 1,
          useBonusPoints: !!g.bonus_points,
          bonusPoints: g.bonus_points || 1,
          pointsRanking: pointRanking,
          timeRanking: timeRanking,
          timeNotation: config.timeNotation || 'mm:ss',
          isFinished: g.is_finished === 1,
        };
      });
      // Store original games for deletion logic
      originalGames.value = JSON.parse(JSON.stringify(games.value));
    }

    // Set active game based on query param
    const queryGameId = route.query.gameId;
    if (queryGameId) {
      const gameIndex = games.value.findIndex(
        (g) => String(g.id) === String(queryGameId),
      );
      if (gameIndex !== -1) {
        activeGameIndex.value = gameIndex;
      }
    }

    const participantsRes =
      await sessionRepository.getParticipants(currentSessionId);
    if (participantsRes.data) {
      participants.value = participantsRes.data;
      originalParticipants.value = JSON.parse(
        JSON.stringify(participantsRes.data),
      );
    }
  } catch (error) {
    console.error('Error loading session settings:', error);
  }
});

const activeGameId = computed(
  () => games.value[activeGameIndex.value]?.id ?? 'game-1',
);
const activeGame = computed(() => games.value[activeGameIndex.value]);

const showGameSeries = computed(
  () =>
    selectedGameMode.value === 'series-of-games' ||
    selectedGameMode.value === 'parallel-games',
);

const hasValidParticipants = computed(() => {
  if (selectedParticipantMode.value === 'teams-with-players') {
    return participants.value.some(
      (team) => team.players && team.players.length > 0,
    );
  }
  return participants.value.length > 0;
});

const gameSeriesTabBar = computed(() => {
  // Find the first unfinished game for series logic
  // This is the "current" game in a series sequence
  const currentSeriesGameId = games.value.find((g) => !g.isFinished)?.id;

  // For parallel, rely on route query if available
  const contextGameId = route.query.gameId;

  return games.value.map((game, index) => {
    let isProtected = false;

    if (selectedGameMode.value === 'series-of-games') {
      // In series: Protect the first unfinished game (the current active one)
      // Future games remain deletable. Past games are disabled (already handled).
      isProtected = game.id === currentSeriesGameId;
    } else if (selectedGameMode.value === 'parallel-games') {
      // In parallel: Protect all existing games (from backend).
      // Only newly added (local) games can be removed before saving.
      const isNew = String(game.id).startsWith('game-');
      if (!isNew) {
        isProtected = true;
      }
    }

    return {
      id: game.id,
      value: game.id,
      label: getDefaultGameName(game, index),
      checked: index === activeGameIndex.value,
      disabled: selectedGameMode.value === 'series-of-games' && game.isFinished,
      closeable: !isProtected, // Prevent deletion if protected
    };
  });
});

const gameOptions = computed(() =>
  games.value.map((game, index) => ({
    value: game.id,
    label: getDefaultGameName(game, index),
  })),
);

const timerankingTabBar = computed(() => [
  {
    id: 'fastest-first',
    value: 'fastest-first',
    label: 'Snelste tijd wint',
    checked: activeGame.value?.timeRanking === 'fastest-first',
  },
  {
    id: 'slowest-first',
    value: 'slowest-first',
    label: 'Langzaamste tijd wint',
    checked: activeGame.value?.timeRanking === 'slowest-first',
  },
]);

const pointsRankingTabBar = computed(() => [
  {
    id: 'highest-first',
    value: 'highest-first',
    label: 'Hoogste score wint',
    checked: activeGame.value?.pointsRanking === 'highest-first',
  },
  {
    id: 'lowest-first',
    value: 'lowest-first',
    label: 'Laagste score wint',
    checked: activeGame.value?.pointsRanking === 'lowest-first',
  },
]);

const gameSetupTabList = ref([
  {
    id: 'session',
    value: 'session',
    label: 'Sessie',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'rules',
    value: 'rules',
    label: 'Spelregels',
    icon: Settings2,
  },
  {
    id: 'participants',
    value: 'participants',
    label: 'Deelnemers',
    icon: Users,
  },
]);

// Track active tab
const activeTab = computed(() => {
  const activeItem = gameSetupTabList.value.find((item) => item.checked);
  return activeItem?.id ?? 'session';
});

const activeTabIndex = computed(() =>
  gameSetupTabList.value.findIndex((item) => item.checked),
);

const isFirstTab = computed(() => activeTabIndex.value === 0);
const isLastTab = computed(
  () => activeTabIndex.value === gameSetupTabList.value.length - 1,
);

const nextButtonText = computed(() => {
  if (
    selectedGameMode.value === 'parallel-games' &&
    activeTab.value === 'participants'
  ) {
    return 'Volgende';
  }
  return isLastTab.value ? 'Opslaan' : 'Volgende';
});

const isNextButtonDisabled = computed(() => {
  if (activeTab.value === 'participants') {
    return !hasValidParticipants.value;
  }
  if (activeTab.value === 'assignment') {
    const allParticipantsAssigned = participants.value.every(
      (p) => p.assignedGameId,
    );
    // Modified: Only check that NEW games have participants if possible, or just warn?
    // The requirement says "everyone assigned" AND "each game has at least one".
    // If a new game is added but no one assigned to it yet, this blocks.
    const allGamesHaveParticipants = games.value.every((g) =>
      participants.value.some((p) => p.assignedGameId === g.id),
    );
    return !allParticipantsAssigned || !allGamesHaveParticipants;
  }
  return false;
});

const unassignedParticipants = computed(() =>
  participants.value.filter((p) => !p.assignedGameId),
);

const updateAssignmentTabVisibility = () => {
  const isParallel = selectedGameMode.value === 'parallel-games';
  const isValid = hasValidParticipants.value;
  const shouldHaveAssignment = isParallel && isValid;

  const assignmentIndex = gameSetupTabList.value.findIndex(
    (t) => t.id === 'assignment',
  );

  if (shouldHaveAssignment && assignmentIndex === -1) {
    gameSetupTabList.value.push({
      id: 'assignment',
      value: 'assignment',
      label: 'Indeling',
      icon: LayoutList,
    });
  } else if (!shouldHaveAssignment && assignmentIndex !== -1) {
    if (activeTab.value === 'assignment') {
      const participantsIndex = gameSetupTabList.value.findIndex(
        (t) => t.id === 'participants',
      );
      if (participantsIndex !== -1) {
        gameSetupTabList.value.forEach(
          (t, i) => (t.checked = i === participantsIndex),
        );
      }
    }
    gameSetupTabList.value = gameSetupTabList.value.filter(
      (t) => t.id !== 'assignment',
    );
  }
};

watch([selectedGameMode, hasValidParticipants], () => {
  updateAssignmentTabVisibility();
});

// Watch for rounds toggle changes
watch(
  () => activeGame.value?.useRounds,
  (newValue, oldValue) => {
    if (newValue && !oldValue && activeGame.value) {
      // When toggle is turned on, set to minimum of 2
      if (activeGame.value.roundsCount < 2) {
        activeGame.value.roundsCount = 2;
      }
    }
  },
);

// Watch for sets toggle changes
watch(
  () => activeGame.value?.useSets,
  (newValue, oldValue) => {
    // If trying to turn OFF, but originalUseSets is true -> revert to ON
    if (!newValue && oldValue && activeGame.value?.originalUseSets) {
      nextTick(() => {
        if (activeGame.value) activeGame.value.useSets = true;
      });
      return;
    }

    if (newValue && !oldValue && activeGame.value) {
      // When toggle is turned on, set to minimum of 2
      if (activeGame.value.setsCount < 2) {
        activeGame.value.setsCount = 2;
      }
    }
  },
);

// Watch for bonus points toggle changes
watch(
  () => activeGame.value?.useBonusPoints,
  (newValue, oldValue) => {
    if (newValue && !oldValue && activeGame.value) {
      // When toggle is turned on, set to minimum of 1
      if (!activeGame.value.bonusPoints || activeGame.value.bonusPoints < 1) {
        activeGame.value.bonusPoints = 1;
      }
    }
  },
);

// Methods
const handleGameTabChange = (gameId) => {
  const index = games.value.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    activeGameIndex.value = index;
  }
};

const handleGameTabClose = (gameId) => {
  const minGames =
    selectedGameMode.value === 'parallel-games' ||
    selectedGameMode.value === 'series-of-games'
      ? 2
      : 1;

  if (games.value.length <= minGames) {
    return;
  }

  gameToDeleteId.value = gameId;
  const index = games.value.findIndex((g) => g.id === gameId);
  const displayName =
    index !== -1 ? getDefaultGameName(games.value[index], index) : 'Game';
  deleteGameModalTitle.value = `${displayName} verwijderen?`;

  const dialog = document.getElementById(deleteGameModalId);
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
};

const handleTimeRankingChange = (value) => {
  if (activeGame.value) {
    activeGame.value.timeRanking = value;
  }
};

const handlePointsRankingChange = (value) => {
  if (activeGame.value) {
    activeGame.value.pointsRanking = value;
  }
};

function addGame() {
  const maxNumber = games.value.reduce((max, game) => {
    return Math.max(max, getGameNumber(game));
  }, 0);

  const newGameNumber = maxNumber + 1;
  const newGameId = `game-${newGameNumber}`;

  games.value.push({
    id: newGameId,
    name: '',
    scoreModel: 'points',
    useRounds: false,
    roundsCount: 2,
    useSets: false,
    setsCount: 2,
    originalUseSets: false,
    currentRound: 1,
    pointsPerAction: 1,
    pointsRanking: 'highest-first',
    useBonusPoints: false,
    bonusPoints: 1,
    timeNotation: 'mm:ss',
    timeRanking: 'fastest-first',
    useTimeBonusPoints: false,
    timeBonusPoints: 1,
  });

  activeGameIndex.value = games.value.length - 1;

  nextTick(() => {
    const label = document.querySelector(`label[for="${newGameId}"]`);
    if (label) {
      label.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  });
}

const confirmDeleteGame = () => {
  if (!gameToDeleteId.value) return;

  const index = games.value.findIndex((g) => g.id === gameToDeleteId.value);
  if (index === -1) {
    gameToDeleteId.value = null;
    return;
  }

  games.value.splice(index, 1);

  if (games.value.length === 0) {
    games.value.push({
      id: 'game-1',
      name: '',
      pointsRanking: 'highest-first',
      scoreModel: 'points',
      useRounds: false,
      roundsCount: 2,
      useSets: false,
      setsCount: 2,
      originalUseSets: false,
      currentRound: 1,
      pointsPerAction: 1,
      useBonusPoints: false,
      bonusPoints: 1,
      timeNotation: 'mm:ss',
      timeRanking: 'fastest-first',
      useTimeBonusPoints: false,
      timeBonusPoints: 1,
    });
    activeGameIndex.value = 0;
  } else if (activeGameIndex.value >= games.value.length) {
    activeGameIndex.value = games.value.length - 1;
  } else if (index <= activeGameIndex.value && activeGameIndex.value > 0) {
    activeGameIndex.value = activeGameIndex.value - 1;
  }
};

const cancelDeleteGame = () => {
  // gameToDeleteId.value = null;
};

// Helper to open modal safely
const safeOpenModal = (id) => {
  nextTick(() => {
    const dialog = document.getElementById(id);
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      console.error(`Failed to open modal ${id}`);
    }
  });
};

const openAssignmentModal = (gameId) => {
  assignmentGameId.value = gameId;

  // Initialize temp assignments
  tempAssignments.value = {};
  participants.value.forEach((p) => {
    tempAssignments.value[p.id] = p.assignedGameId;
  });

  const index = games.value.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    const game = games.value[index];
    const gameName = getDefaultGameName(game, index);
    assignmentModalTitle.value = `Deelnemers voor ${gameName}`;
  } else {
    assignmentModalTitle.value = 'Deelnemers toewijzen';
  }

  safeOpenModal(assignmentModalId);
};

const closeAssignmentModal = () => {
  // Just close, discard changes
};

const toggleWarningModalId = 'toggle-warning-modal';
const pendingToggle = ref(null);

const confirmToggle = () => {
  if (pendingToggle.value) {
    tempAssignments.value[pendingToggle.value.participantId] =
      pendingToggle.value.gameId;
    pendingToggle.value = null;
  }
};

const cancelToggle = () => {
  pendingToggle.value = null;
};

const saveAssignmentChanges = () => {
  participants.value.forEach((p) => {
    if (tempAssignments.value.hasOwnProperty(p.id)) {
      p.assignedGameId = tempAssignments.value[p.id];
    }
  });
  // Close is handled by modal emit
};

const toggleParticipantAssignment = (participantId, gameId) => {
  const currentAssigned = tempAssignments.value[participantId];

  if (currentAssigned === gameId) {
    // Check if the participant had an original assignment to revert to
    const originalParticipant = participants.value.find(
      (p) => p.id === participantId,
    );
    const originalAssignment = originalParticipant?.assignedGameId;

    if (originalAssignment && originalAssignment !== gameId) {
      tempAssignments.value[participantId] = originalAssignment;
    } else {
      tempAssignments.value[participantId] = null;
    }
  } else {
    // UX Request: Show warning if this is a "Move" from another game
    const originalParticipant = originalParticipants.value.find(
      (p) => p.id === participantId,
    );

    // Check if player is ALREADY assigned to another game (and not just unassigned)
    // AND that other game is not null
    // AND that older assignment was saved in "originalParticipants" (so we are modifying persistent state)
    // If original.assignedGameId is set, and we are assigning to `gameId` (which is different),
    // it's a move that will reset scores.

    // Also consider `currentAssigned` in `tempAssignments`. If I move P1 from G1 to G3.
    // tempAssignments[P1] is 'game-1'. I click 'game-3'.
    // Logic: warn if originalAssigned exists and is different from new target.

    const isMove =
      originalParticipant &&
      originalParticipant.assignedGameId &&
      String(originalParticipant.assignedGameId) !== String(gameId);

    if (isMove) {
      // It's a move!
      // Trigger warning modal for THIS specific toggle?
      // "popup bij het aanvinken". Yes.
      pendingToggle.value = { participantId, gameId };
      safeOpenModal(toggleWarningModalId); // Open the warning modal
      return; // Don't apply change yet
    }

    tempAssignments.value[participantId] = gameId;
  }
};

const getAssignedParticipants = (gameId) => {
  return participants.value.filter((p) => p.assignedGameId === gameId);
};

const getGameNumber = (game) => {
  // 1. Try to extract logical number from specific patterns (new games)
  const idStr = String(game.id);
  const match = idStr.match(/^game-(\d+)$/);
  if (match) return parseInt(match[1], 10);

  // 2. If it's a persistent game (from DB), look at its ORIGINAL name (at load time)
  // This preserves the number for "Spel 6" after reload, but ignores "Spel 5" if just renamed from "Spel 2"
  const originalGame = originalGames.value.find((og) => og.id === game.id);
  if (originalGame) {
    const nameMatch = originalGame.name.match(/^Spel (\d+)$/i);
    if (nameMatch) {
      return parseInt(nameMatch[1], 10);
    }
    // If original name didn't have a number, fallback to index
    const index = originalGames.value.indexOf(originalGame);
    return index + 1;
  }

  // 3. Fallback: Use current index + 1
  const currentIndex = games.value.findIndex((g) => g.id === game.id);
  if (currentIndex !== -1) return currentIndex + 1;

  return 0;
};

const getDefaultGameName = (game, index = -1) => {
  if (game.name) return game.name;

  const number = getGameNumber(game);
  if (number > 0) return `Spel ${number}`;

  // Fallback if number resolution failed (should rarely happen)
  if (index !== -1) return `Spel ${index + 1}`;
  return 'Spel ?';
};

const getGameName = (gameId) => {
  const index = games.value.findIndex((g) => g.id === gameId);
  if (index === -1) return 'ander spel';
  return getDefaultGameName(games.value[index], index);
};

const performSave = async (assignmentMoves = []) => {
  try {
    console.log('=== SAVING CHANGES ===');
    console.log('Current participants:', participants.value);
    console.log('Original participants:', originalParticipants.value);

    // 1. Update Session Info
    const sessionPayload = {
      sessionName: sessionName.value,
      status: 'in_progress',
    };
    await sessionRepository.update(currentSessionId, sessionPayload);

    // Keep track of new game IDs mapping: { 'game-1': 105 }
    const newGameIdMap = {};

    // 2. Update Each Game Configuration (Sequentially to avoid DB transaction deadlocks)
    for (const [index, game] of games.value.entries()) {
      // Check if it's a new game (ID starts with 'game-')
      const isNewGame = String(game.id).startsWith('game-');
      const tempId = game.id; // Store temp ID

      const gameName = game.name || getDefaultGameName(game, index);
      // Persist the generated name back to the local object so it stays stable
      if (!game.name) {
        game.name = gameName;
      }

      const gamePayload = {
        name: gameName,
        rounds: game.useRounds ? game.roundsCount : 1,
        sets: game.useSets ? game.setsCount : 1,
        points_per_click: game.pointsPerAction,
        bonus_points: game.useBonusPoints ? game.bonusPoints : 0,
        scoreModel: game.scoreModel,
        pointsRanking: game.pointsRanking,
        timeRanking: game.timeRanking,
        timeNotation: game.timeNotation,
        useBonusPoints: game.useBonusPoints,
        sessionId: currentSessionId || sessionStorage.getItem('sessionId'), // Ensure we have a session ID
        participantEntities: participants.value?.map((p) => p.id) || [], // Pass all current participants
      };

      if (isNewGame) {
        console.log(`Creating NEW game: ${game.name}`);
        const res = await gameRepository.create(gamePayload);
        // Update local ID with real ID from backend to prevent re-creation
        if (res.data && res.data.id) {
          game.id = res.data.id;
          newGameIdMap[tempId] = res.data.id; // Map temp ID to real ID
        }
      } else {
        console.log(`Updating existing game: ${game.id}`);
        await gameRepository.update(game.id, gamePayload);
      }
    }

    // 3. Process Assignment Moves (Moved after game creation!)
    if (assignmentMoves.length > 0) {
      console.log('Processing assignment moves:', assignmentMoves);
      // Translate temp game IDs to real ones
      const translatedMoves = assignmentMoves.map((move) => {
        const realNewGameId = newGameIdMap[move.newGameId] || move.newGameId;
        return { ...move, newGameId: realNewGameId };
      });
      await sessionRepository.updateAssignments(
        currentSessionId,
        translatedMoves,
      );
    }

    // 3b. Update assignments for NEW participants that were assigned to NEW games
    // Update participants list with real game IDs before sending 'addParticipants'
    participants.value.forEach((p) => {
      if (p.isNew && p.assignedGameId && newGameIdMap[p.assignedGameId]) {
        p.assignedGameId = newGameIdMap[p.assignedGameId];
      }
    });

    // 2b. Delete Removed Games
    const currentGameIds = games.value.map((g) => g.id);
    const removedGames = originalGames.value.filter(
      (og) => !currentGameIds.includes(og.id),
    );

    if (removedGames.length > 0) {
      console.log('Games to delete:', removedGames);
      const deletePromises = removedGames.map((g) => {
        console.log(`Deleting game ${g.id} (${g.name})`);
        return gameRepository.delete(g.id);
      });
      await Promise.all(deletePromises);
    }

    // Refresh originalGames baseline after all game ops are done
    originalGames.value = JSON.parse(JSON.stringify(games.value));

    // 3. Delete removed participants
    const currentParticipantIds = participants.value.map((p) => p.id);
    const removedParticipants = originalParticipants.value.filter(
      (op) => !currentParticipantIds.includes(op.id),
    );

    console.log('Participants to delete:', removedParticipants);

    // Delete each participant sequentially to handle errors properly
    for (const p of removedParticipants) {
      console.log(`Deleting participant ${p.id} (${p.name})`);

      try {
        // Delete the player or team - participant.id IS the player/team id
        if (selectedParticipantMode.value === 'players') {
          // In players mode, p.id is a player ID
          await playerRepository.delete(p.id);
        } else if (selectedParticipantMode.value === 'teams') {
          // In teams mode, p.id is a team ID
          await teamRepository.delete(p.id);
        } else if (selectedParticipantMode.value === 'teams-with-players') {
          // In teams-with-players mode, p.id is a team ID
          await teamRepository.delete(p.id);
        }
        console.log(`Successfully deleted ${p.name}`);
      } catch (error) {
        console.error(
          `Failed to delete participant ${p.id} (${p.name}):`,
          error,
        );
        // Continue with other deletions even if one fails
      }
    }

    // 3b. For teams-with-players mode, also check for removed sub-players
    if (selectedParticipantMode.value === 'teams-with-players') {
      for (const team of participants.value) {
        const originalTeam = originalParticipants.value.find(
          (ot) => ot.id === team.id,
        );
        if (originalTeam && originalTeam.players && team.players) {
          const currentPlayerIds = team.players.map((sp) => sp.id);
          const removedSubPlayers = originalTeam.players.filter(
            (osp) => !currentPlayerIds.includes(osp.id),
          );

          for (const subPlayer of removedSubPlayers) {
            console.log(
              `Deleting sub-player ${subPlayer.id} (${subPlayer.name}) from team ${team.name}`,
            );
            try {
              await playerRepository.delete(subPlayer.id);
              console.log(`Successfully deleted sub-player ${subPlayer.name}`);
            } catch (error) {
              console.error(
                `Failed to delete sub-player ${subPlayer.id}:`,
                error,
              );
            }
          }
        }
      }
    }

    // 4. Update existing participants (players/teams) that were modified
    const updatePromises = [];
    participants.value.forEach((p) => {
      if (!p.isNew) {
        const original = originalParticipants.value.find(
          (op) => op.id === p.id,
        );
        if (original && original.name !== p.name) {
          console.log(
            `Name changed for participant ${p.id}: "${original.name}" -> "${p.name}"`,
          );
          console.log('Participant data:', p);
          // Name changed - update the player or team
          // The participant.id IS the player.id or team.id depending on mode
          if (selectedParticipantMode.value === 'players') {
            // Update player name - participant.id is the player.id
            console.log(`Updating player ${p.id} to name "${p.name}"`);
            updatePromises.push(
              playerRepository.update(p.id, { name: p.name }),
            );
          } else if (
            selectedParticipantMode.value === 'teams' ||
            selectedParticipantMode.value === 'teams-with-players'
          ) {
            // Update team name - participant.id is the team.id
            console.log(`Updating team ${p.id} to name "${p.name}"`);
            updatePromises.push(teamRepository.update(p.id, { name: p.name }));
          }
        }

        // For teams-with-players mode, check sub-players
        if (
          selectedParticipantMode.value === 'teams-with-players' &&
          p.players
        ) {
          p.players.forEach((subPlayer) => {
            if (!subPlayer.isNew) {
              const originalTeam = originalParticipants.value.find(
                (op) => op.id === p.id,
              );
              if (originalTeam && originalTeam.players) {
                const originalSubPlayer = originalTeam.players.find(
                  (osp) => osp.id === subPlayer.id,
                );
                if (
                  originalSubPlayer &&
                  originalSubPlayer.name !== subPlayer.name
                ) {
                  console.log(
                    `Updating sub-player ${subPlayer.id} to name "${subPlayer.name}"`,
                  );
                  updatePromises.push(
                    playerRepository.update(subPlayer.id, {
                      name: subPlayer.name,
                    }),
                  );
                }
              }
            }
          });
        }
      }
    });

    console.log(`Total updates to perform: ${updatePromises.length}`);
    await Promise.all(updatePromises);

    // 5. Add New Participants/Teams if any
    // For new teams in teams-with-players mode, include the players array so backend can handle it
    const newParticipants = participants.value
      .filter((p) => p.isNew)
      .map((p) => {
        if (
          selectedParticipantMode.value === 'teams-with-players' &&
          p.players
        ) {
          return {
            ...p,
            players: p.players.map((sub) => ({ name: sub.name })), // Only send player names
          };
        }
        return p;
      });

    // For teams-with-players, find ONLY EXISTING teams that have new sub-players
    // (New teams already have their players included in newParticipants)
    const newSubPlayers = [];
    if (selectedParticipantMode.value === 'teams-with-players') {
      participants.value.forEach((p) => {
        // Only process EXISTING teams (!isNew) with new sub-players
        if (!p.isNew && p.players && p.players.length > 0) {
          p.players.forEach((sub) => {
            if (sub.isNew) {
              newSubPlayers.push({
                teamId: p.id,
                name: sub.name,
                assignedGameId: p.assignedGameId, // Use parent team's assignment
              });
            }
          });
        }
      });
    }

    console.log('New participants to add:', newParticipants);
    console.log('New sub-players to add:', newSubPlayers);

    if (newParticipants.length > 0 || newSubPlayers.length > 0) {
      await sessionRepository.addParticipants(currentSessionId, {
        newParticipants,
        newSubPlayers,
      });
    }

    // IMPORTANT: Reload participants to sync DB state and clear isNew flags
    // This is useful if the router.push doesn't happen immediately or if we change navigation logic later.
    const freshParticipants =
      await sessionRepository.getParticipants(currentSessionId);
    if (freshParticipants.data) {
      participants.value = freshParticipants.data;
      originalParticipants.value = JSON.parse(
        JSON.stringify(freshParticipants.data),
      );
    }

    router.push({ name: 'tablet-player-list' });
  } catch (error) {
    console.error('Failed to save settings:', error);
    // Even if error, try to go back or show alert?
    // For now just go back as per original behavior
    router.push({ name: 'tablet-player-list' });
  }
};

const getChangedAssignments = () => {
  const moves = [];
  if (!originalParticipants.value || originalParticipants.value.length === 0)
    return [];

  console.log('Calculating changed assignments...');
  participants.value.forEach((p) => {
    if (p.isNew) return;

    const original = originalParticipants.value.find((op) => op.id === p.id);

    // Allow move if original had NO assignment, OR if assignment changed
    if (original) {
      const oldId = original.assignedGameId;
      const newId = p.assignedGameId;

      // We only care if:
      // 1. New ID is set (we are assigning them to something)
      // 2. New ID is DIFFERENT from Old ID (change)
      // 3. (Optional) Old ID was null and New ID is set (New Assignment) - handled by case 2 logic usually

      // Note: newId from tempAssignments might be null if we unassigned them?
      // If we unassigned them (Checkbox unchecked), newId is null.
      // But the requirement for 'moves' array in backend usually expects a target game.
      // Getting 'unassigned' logic is trickier. Currently backend `updateAssignments` assumes moving TO a game.
      // If we want to support Unassign, we need to handle that.
      // But user issue is "Added to last game", so they are assigned.

      if (newId && String(newId) !== String(oldId || '')) {
        console.log(
          `Detected change for ${p.name} (${p.id}): ${oldId} -> ${newId}`,
        );
        moves.push({
          id: p.id,
          type: selectedParticipantMode.value === 'players' ? 'player' : 'team',
          oldGameId: oldId, // might be null/undefined
          newGameId: newId,
        });
      }
    }
  });

  console.log('Final moves list:', moves);
  return moves;
};

const saveChanges = async () => {
  // With instant toggle warnings, we don't necessarily need the final warning,
  // BUT user might have missed it or we double check.
  // However, if we warn on Toggle, the 'tempAssignments' are committed to 'participants' locally.
  // The `getChangedAssignments` logic detects changes on save time.
  // If we want fewer clicks, maybe skip warning here if user already confirmed toggles?
  // But keeping it is safer.
  // User requested "popup bij het aanvinken".
  const moves = getChangedAssignments();
  if (moves.length > 0) {
    pendingAssignmentChanges.value = moves;
    // We can conditionally skip this if we assume user saw the toggle warning.
    // But since `saveAssignmentChanges` commits multiple changes,
    // and one toggle warning is per-checkbox,
    // showing a final summary is good practice (system feedback).
    // But if user says "Opslaan doet niets", maybe they are blocked by a bug here.
    // Let's ensure showAssignmentWarning works.
    showAssignmentWarning.value = true;
    safeOpenModal(assignmentWarningModalId);
  } else {
    await performSave([]);
  }
};

const confirmAssignmentSave = async () => {
  showAssignmentWarning.value = false;
  await performSave(pendingAssignmentChanges.value);
  pendingAssignmentChanges.value = [];
};

const cancelAssignmentSave = () => {
  showAssignmentWarning.value = false;
  pendingAssignmentChanges.value = [];
};

const goToPreviousTab = () => {
  if (isFirstTab.value) {
    router.push({ name: 'tablet-player-list' });
  } else {
    const prevIndex = activeTabIndex.value - 1;
    gameSetupTabList.value = gameSetupTabList.value.map((item, idx) => ({
      ...item,
      checked: idx === prevIndex,
    }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
};

const goToNextTab = () => {
  if (isNextButtonDisabled.value) return;

  if (isLastTab.value) {
    saveChanges();
  } else {
    const nextIndex = activeTabIndex.value + 1;
    gameSetupTabList.value = gameSetupTabList.value.map((item, idx) => ({
      ...item,
      checked: idx === nextIndex,
    }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
};

watch(
  [participants, selectedParticipantMode],
  ([newParticipants, newMode]) => {
    const displayList = newParticipants.map((p) => ({ playerName: p.name }));
    socket.emit('display:update-participants', {
      list: displayList,
      mode: newMode,
    });
  },
  { deep: true },
);

const handleSocketConnect = () => {
  if (participants.value.length > 0) {
    const displayList = participants.value.map((p) => ({ playerName: p.name }));
    socket.emit('display:update-participants', {
      list: displayList,
      mode: selectedParticipantMode.value,
    });
  }
};

onMounted(() => {
  socket.on('connect', handleSocketConnect);
  // Also check immediately if already connected
  if (socket.connected) {
    handleSocketConnect();
  }
});

onUnmounted(() => {
  socket.off('connect', handleSocketConnect);
});
</script>

<template>
  <div class="container p-game-setup-view">
    <div class="row">
      <div class="col-12 col-lg-10 offset-lg-1 col-xl-8 offset-xl-2">
        <form class="p-game-setup-view__settings" @submit.prevent>
          <div class="p-game-setup-view__settings__head">
            <div class="p-game-setup-view__settings__head__subtitle">
              <Button
                @click="router.push({ name: 'tablet-player-list' })"
                :clickable="false"
                :is-icon-button="true"
                variant="secondary"
              >
                <template #c-btn_icon-left>
                  <ArrowLeft :size="18" />
                </template>
              </Button>

              <div class="p-game-setup-view__settings__head__subtitle__title">
                <h1 class="h4">Spelinstellingen</h1>
                <p>Pas hier de instellingen van het huidige spel aan</p>
              </div>
            </div>

            <div class="p-game-setup-view__settings__head__logo">
              <img src="../assets/logo.webp" alt="TeamScore Logo" />
            </div>
          </div>

          <div class="p-game-setup-view__settings__body">
            <TabList
              v-model:items="gameSetupTabList"
              name="game-setup-tablist"
              :hideIcon="false"
            ></TabList>

            <!-- Sessie Tab Content -->
            <div
              v-show="activeTab === 'session'"
              class="p-game-setup-view__settings__body__content"
            >
              <div
                class="p-game-setup-view__settings__body__content__sessionname"
              >
                <h2 class="h6">Sessienaam</h2>
                <InputField
                  id="session-name"
                  name="sessionName"
                  :label="false"
                  :placeholder="sessionNamePlaceholder"
                  v-model="sessionName"
                />
              </div>
            </div>

            <!-- Spelregels Tab Content -->
            <div
              v-show="activeTab === 'rules'"
              class="p-game-setup-view__settings__body__content"
            >
              <!-- Games in deze reeks - Alleen voor Serie/Parallelle games -->
              <div
                v-show="showGameSeries"
                class="p-game-setup-view__settings__body__content__gameseries"
              >
                <div
                  class="p-game-setup-view__settings__body__content__gameseries__subtitle"
                >
                  <h2 class="h6">Games in deze reeks</h2>
                  <p>Kies een spel om de instellingen daarvan aan te passen</p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__gameseries__content"
                >
                  <div
                    class="p-game-setup-view__settings__body__content__gameseries__content__tabbar"
                  >
                    <TabBar
                      :items="gameSeriesTabBar"
                      name="game-series-rules"
                      :hideIcon="true"
                      class="c-tabbar--hug"
                      :closeable="
                        games.length >
                        (selectedGameMode === 'parallel-games' ||
                        selectedGameMode === 'series-of-games'
                          ? 2
                          : 1)
                      "
                      @change="handleGameTabChange"
                      @close="handleGameTabClose"
                    ></TabBar>
                  </div>

                  <Button
                    variant="secondary"
                    button-tekst="Game toevoegen"
                    @click="addGame"
                    :clickable="false"
                  >
                    <template #c-btn_icon-left>
                      <Plus :size="18" />
                    </template>
                  </Button>
                </div>
              </div>

              <!-- Spelnaam - Alleen voor Serie/Parallelle games -->
              <div
                v-show="showGameSeries"
                class="p-game-setup-view__settings__body__content__gamename"
              >
                <h2 class="h6">Spelnaam</h2>
                <InputField
                  :id="`game-name-${activeGameId}`"
                  :name="`gameName-${activeGameId}`"
                  :label="false"
                  :placeholder="getDefaultGameName(activeGame, activeGameIndex)"
                  v-model="activeGame.name"
                />
              </div>

              <div
                class="p-game-setup-view__settings__body__content__gamestructure"
              >
                <div
                  class="p-game-setup-view__settings__body__content__gamestructure__subtitle"
                >
                  <h2 class="h6">Spelstructuur: rondes en sets</h2>
                  <p>
                    Bepaal hier het aantal rondes, de punten per ronde en of er
                    gebruikt wordt gemaakt van sets.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__gamestructure__content"
                >
                  <ToggleWithDropdown
                    :inputId="`rounds-toggle-${activeGameId}`"
                    labelTekst="Gebruik van rondes"
                    :min="
                      Math.max(
                        2,
                        activeGame.currentRound || 1,
                        activeGame.originalRoundsCount || 0,
                      )
                    "
                    max="100"
                    label="Aantal rondes"
                    :id="`rounds-${activeGameId}`"
                    type="number"
                    v-model:toggled="activeGame.useRounds"
                    v-model="activeGame.roundsCount"
                  >
                  </ToggleWithDropdown>

                  <ToggleWithDropdown
                    v-if="!activeGame.originalUseSets"
                    :inputId="`sets-toggle-${activeGameId}`"
                    labelTekst="Gebruik van sets"
                    min="2"
                    max="100"
                    :label="
                      activeGame.useRounds
                        ? 'Aantal sets per ronde'
                        : 'Aantal sets per game'
                    "
                    :id="`sets-${activeGameId}`"
                    :name="`sets-${activeGameId}`"
                    type="number"
                    v-model:toggled="activeGame.useSets"
                    v-model="activeGame.setsCount"
                  >
                  </ToggleWithDropdown>
                </div>
              </div>

              <!-- Puntenscore instellingen -->
              <div
                v-show="activeGame?.scoreModel === 'points'"
                class="p-game-setup-view__settings__body__content__scoremodel__settings"
              >
                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Puntenscore instellingen</h2>
                  <InputNumber
                    :id="`points-per-action-${activeGameId}`"
                    :name="`pointsPerAction-${activeGameId}`"
                    label="Punten per correcte actie"
                    type="number"
                    min="1"
                    max="100"
                    v-model="activeGame.pointsPerAction"
                  />
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Rangorde</h2>
                  <TabBar
                    :items="pointsRankingTabBar"
                    :name="`points-ranking-${activeGameId}`"
                    :hideIcon="true"
                    @change="handlePointsRankingChange"
                  ></TabBar>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Bonuspunten</h2>
                  <ToggleWithDropdown
                    :inputId="`points-bonus-toggle-${activeGameId}`"
                    labelTekst="Bonus punten per actie"
                    min="1"
                    max="100"
                    label="Aantal bonus punten per actie"
                    :id="`points-bonus-${activeGameId}`"
                    :name="`pointsBonus-${activeGameId}`"
                    type="number"
                    v-model:toggled="activeGame.useBonusPoints"
                    v-model="activeGame.bonusPoints"
                  ></ToggleWithDropdown>
                </div>
              </div>

              <!-- Tijdscore instellingen -->
              <div
                v-show="activeGame?.scoreModel === 'time'"
                class="p-game-setup-view__settings__body__content__scoremodel__settings"
              >
                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Tijdnotatie</h2>
                  <InputSelect
                    :id="`time-notation-${activeGameId}`"
                    :name="`timeNotation-${activeGameId}`"
                    :label="false"
                    :options="timeNotationOptions"
                    v-model="activeGame.timeNotation"
                  />
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Rangorde</h2>
                  <TabBar
                    :items="timerankingTabBar"
                    :name="`time-ranking-${activeGameId}`"
                    :hideIcon="true"
                    @change="handleTimeRankingChange"
                  ></TabBar>
                </div>
              </div>
            </div>

            <!-- Deelnemers Tab Content -->
            <div
              v-show="activeTab === 'participants'"
              class="p-game-setup-view__settings__body__content"
            >
              <div
                class="p-game-setup-view__settings__body__content__participants"
              >
                <PlayersSetting
                  v-model:participants="participants"
                  :player-mode="selectedParticipantMode"
                />
              </div>
            </div>

            <!-- Indeling Tab Content -->
            <div
              v-show="activeTab === 'assignment'"
              class="p-game-setup-view__settings__body__content"
            >
              <div
                class="p-game-setup-view__settings__body__content__assignment"
              >
                <div
                  class="p-game-setup-view__settings__body__content__assignment__subtitle"
                >
                  <h2 class="h6">Indeling van spelers</h2>
                  <p>
                    Wijs deelnemers toe aan een specifiek spel. Je kunt pas naar
                    de volgende stap gaan wanneer iedereen is ingedeeld en elk
                    spel minstens één deelnemer heeft.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__assignment__list"
                >
                  <template v-if="hasValidParticipants">
                    <div
                      v-if="unassignedParticipants.length > 0"
                      class="c-notice c-notice--warning mb-4"
                    >
                      <div class="c-notice__content">
                        <strong>Let op:</strong> Er zijn nog deelnemers niet
                        toegewezen:
                        {{
                          unassignedParticipants.map((p) => p.name).join(', ')
                        }}. Wijs ze toe aan een spel om verder te gaan.
                      </div>
                    </div>

                    <div
                      v-for="(game, index) in games"
                      :key="game.id"
                      class="p-game-setup-view__settings__body__content__assignment__list__game-card"
                    >
                      <div
                        class="p-game-setup-view__settings__body__content__assignment__list__game-card__header"
                      >
                        <span
                          class="p-game-setup-view__settings__body__content__assignment__list__game-card__title h6"
                        >
                          {{ getDefaultGameName(game) }}
                        </span>
                        <Button
                          variant="secondary"
                          button-tekst="Wijzig"
                          :clickable="false"
                          @click="openAssignmentModal(game.id)"
                        />
                      </div>

                      <div
                        class="p-game-setup-view__settings__body__content__assignment__list__game-card__participants"
                      >
                        <span
                          v-for="p in getAssignedParticipants(game.id)"
                          :key="p.id"
                          class="p-game-setup-view__settings__body__content__assignment__list__game-card__participants__tag"
                        >
                          {{ p.name }}
                        </span>
                        <span
                          v-if="getAssignedParticipants(game.id).length === 0"
                          class="p-game-setup-view__settings__body__content__assignment__list__game-card__participants__empty"
                        >
                          Geen deelnemers
                        </span>
                      </div>
                    </div>
                  </template>

                  <div
                    v-if="!hasValidParticipants"
                    class="p-game-setup-view__settings__body__content__assignment__empty"
                  >
                    <p>
                      Er zijn nog geen deelnemers toegevoegd. Ga terug naar de
                      vorige stap.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Modal
            :modal-id="deleteGameModalId"
            :title="deleteGameModalTitle"
            text="Weet je zeker dat je deze game wil verwijderen? Deze actie kan niet ongedaan worden gemaakt."
            cancel-btn-text="Annuleren"
            accept-btn-text="Verwijderen"
            @cancel="cancelDeleteGame"
            @accept="confirmDeleteGame"
          />

          <Modal
            :modal-id="assignmentModalId"
            :title="assignmentModalTitle"
            cancel-btn-text="Annuleren"
            accept-btn-text="Opslaan"
            @cancel="closeAssignmentModal"
            @accept="saveAssignmentChanges"
          >
            <p class="c-modal__text">
              Selecteer de deelnemers die meedoen aan dit spel. Deelnemers die
              al zijn toegewezen aan een ander spel, worden daar verwijderd als
              je ze hier selecteert.
            </p>
            <div class="c-assignment-modal-list">
              <label
                v-for="participant in participants"
                :key="participant.id"
                class="c-assignment-modal-list__item"
                :class="{
                  'c-assignment-modal-list__item--active':
                    tempAssignments[participant.id] === assignmentGameId,
                }"
              >
                <input
                  type="checkbox"
                  :checked="
                    tempAssignments[participant.id] === assignmentGameId
                  "
                  @change="
                    toggleParticipantAssignment(
                      participant.id,
                      assignmentGameId,
                    )
                  "
                />
                <span class="c-assignment-modal-list__item__name">{{
                  participant.name
                }}</span>
                <span
                  v-if="
                    tempAssignments[participant.id] &&
                    tempAssignments[participant.id] !== assignmentGameId
                  "
                  class="c-assignment-modal-list__item__badge"
                >
                  In {{ getGameName(tempAssignments[participant.id]) }}
                </span>
              </label>
            </div>
            <div v-if="participants.length === 0">
              <p>Geen deelnemers gevonden.</p>
            </div>
          </Modal>

          <Modal
            :modal-id="toggleWarningModalId"
            title="Speler verplaatsen?"
            cancel-btn-text="Annuleren"
            accept-btn-text="Verplaatsen"
            @cancel="cancelToggle"
            @accept="confirmToggle"
          >
            <div class="c-modal__content">
              <p class="c-modal__text">
                Deze speler is al toegewezen aan een ander spel.
              </p>
              <div class="c-notice c-notice--danger mb-4">
                <p>
                  <strong>Let op:</strong> Als je deze speler verplaatst, worden
                  de huidige scores verwijderd (reset naar 0).
                </p>
              </div>
              <p class="c-modal__text">Weet je zeker dat je wilt doorgaan?</p>
            </div>
          </Modal>

          <Modal
            :modal-id="assignmentWarningModalId"
            :title="assignmentWarningModalTitle"
            cancel-btn-text="Annuleren"
            accept-btn-text="Doorgaan"
            @cancel="cancelAssignmentSave"
            @accept="confirmAssignmentSave"
          >
            <div class="c-modal__content">
              <p class="c-modal__text">
                Je hebt de indeling voor
                {{ pendingAssignmentChanges.length }} deelnemer(s) gewijzigd via
                de instellingen.
              </p>
              <div class="c-notice c-notice--danger mb-4">
                <p>
                  <strong>Let op:</strong> Door de indeling te wijzigen,
                  beschouwt het systeem dit als een nieuwe deelname. De scores
                  die deze deelnemer(s) hadden in hun vorige spel worden
                  hierdoor <strong>gereset</strong> (verwijderd).
                </p>
              </div>
              <p class="c-modal__text">
                Weet je zeker dat je wilt doorgaan en opslaan?
              </p>
            </div>
          </Modal>

          <div class="p-game-setup-view__settings__footer">
            <Button
              variant="secondary"
              button-tekst="Terug"
              @click="goToPreviousTab"
              :clickable="false"
            >
              <template #c-btn_icon-left>
                <ArrowLeft :size="18" />
              </template>
            </Button>

            <Button
              variant="primary"
              :button-tekst="nextButtonText"
              @click="goToNextTab"
              :clickable="false"
              :is-disabled="isNextButtonDisabled"
            >
              <template #c-btn_icon-right>
                <ArrowRight :size="18" />
              </template>
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
