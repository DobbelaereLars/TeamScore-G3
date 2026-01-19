<script setup>
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button.vue';
import TabList from '../components/TabList.vue';
import InputField from '../components/InputField.vue';
import InputSelect from '../components/InputSelect.vue';
import TabBar from '../components/TabBar.vue';
import Notice from '../components/Notice.vue';
import InputRadioCards from '../components/InputRadioCards.vue';
import ToggleWithDropdown from '../components/ToggleWithDropdown.vue';
import PlayersSetting from '../components/PlayersSetting.vue';
import Modal from '../components/Modal.vue';
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Dices,
  Settings2,
  Users,
  Route,
  Workflow,
  Plus,
  Target,
  Clock7,
  SquareCheck,
  LayoutList,
} from 'lucide-vue-next';
import InputNumber from '../components/InputNumber.vue';

const router = useRouter();

// Form state
const sessionName = ref('');
const selectedParticipantMode = ref('players');
const selectedGameMode = ref('single-game');
const participants = ref([]);

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
    roundsCount: 1,
    useSets: false,
    setsCount: 1,
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

const activeGameIndex = ref(0);
const gameToDeleteId = ref(null);
const deleteGameModalId = 'delete-game-modal';

// Assignment
const assignmentGameId = ref(null);
const assignmentModalId = 'assignment-modal';
const assignmentModalTitle = ref('');

const deleteGameModalTitle = computed(() => {
  const index = games.value.findIndex((g) => g.id === gameToDeleteId.value);
  const game = games.value[index];

  if (!game) return 'Game verwijderen?';

  const displayName = game.name || `Spel ${index + 1}`;
  return `${displayName} verwijderen?`;
});

// Computed
const activeGameId = computed(
  () => games.value[activeGameIndex.value]?.id ?? 'game-1',
);
const activeGame = computed(() => games.value[activeGameIndex.value]);

const showGameSeries = computed(
  () =>
    selectedGameMode.value === 'series-of-games' ||
    selectedGameMode.value === 'parallel-games',
);

const gameSeriesTabBar = computed(() =>
  games.value.map((game, index) => ({
    id: game.id,
    value: game.id,
    label: game.name || `Spel ${index + 1}`,
    checked: index === activeGameIndex.value,
  })),
);

const gameOptions = computed(() =>
  games.value.map((game, index) => ({
    value: game.id,
    label: game.name || `Spel ${index + 1}`,
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

const scoreModelRadioCards = computed(() => [
  {
    id: `points-${activeGameId.value}`,
    value: 'points',
    label: 'Puntenscore',
    description: 'Punten op basis van juiste antwoorden of acties.',
    icon: Target,
    checked: activeGame.value?.scoreModel === 'points',
  },
  {
    id: `time-${activeGameId.value}`,
    value: 'time',
    label: 'Tijdscore',
    description: 'Score bepaald door snelheid en tijdslimiet.',
    icon: Clock7,
    checked: activeGame.value?.scoreModel === 'time',
  },
  {
    id: `completed-${activeGameId.value}`,
    value: 'completed',
    label: 'Voltooid / niet voltooid',
    description: 'Punten alleen voor afgeronde opdrachten.',
    icon: SquareCheck,
    checked: activeGame.value?.scoreModel === 'completed',
  },
]);

const gameModusRadioCards = computed(() => [
  {
    id: 'single-game',
    value: 'single-game',
    label: 'Scoreboard voor één game',
    description: 'Eén scoreboard voor een enkele game.',
    icon: Dices,
    checked: selectedGameMode.value === 'single-game',
  },
  {
    id: 'series-of-games',
    value: 'series-of-games',
    label: 'Serie van games',
    description: 'Meerdere games na elkaar in één reeks.',
    icon: Route,
    checked: selectedGameMode.value === 'series-of-games',
  },
  {
    id: 'parallel-games',
    value: 'parallel-games',
    label: 'Parallelle games',
    description: 'Meerdere games tegelijk met verdeelde spelers/teams.',
    icon: Workflow,
    checked: selectedGameMode.value === 'parallel-games',
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

const participantModusTabBar = computed(() => [
  {
    id: 'players',
    value: 'players',
    label: 'Individuele spelers',
    checked: selectedParticipantMode.value === 'players',
  },
  {
    id: 'teams',
    value: 'teams',
    label: 'Teams',
    checked: selectedParticipantMode.value === 'teams',
  },
  {
    id: 'teams-with-players',
    value: 'teams-with-players',
    label: 'Teams met spelers',
    checked: selectedParticipantMode.value === 'teams-with-players',
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

const nextButtonText = computed(() => (isLastTab.value ? 'Klaar' : 'Volgende'));

// Methods
const handleParticipantModeChange = (value) => {
  selectedParticipantMode.value = value;
};

const handleGameModeChange = (value) => {
  selectedGameMode.value = value;

  // Update tabs
  const hasAssignment = gameSetupTabList.value.some(
    (t) => t.id === 'assignment',
  );
  if (value === 'parallel-games' && !hasAssignment) {
    gameSetupTabList.value.push({
      id: 'assignment',
      value: 'assignment',
      label: 'Indeling',
      icon: LayoutList,
    });
  } else if (value !== 'parallel-games' && hasAssignment) {
    gameSetupTabList.value = gameSetupTabList.value.filter(
      (t) => t.id !== 'assignment',
    );
  }

  // Reset to single game if switching to single-game mode
  if (value === 'single-game' && games.value.length > 1) {
    games.value = [games.value[0]];
    activeGameIndex.value = 0;
  } else if (
    (value === 'parallel-games' || value === 'series-of-games') &&
    games.value.length < 2
  ) {
    addGame();
  }
};

const handleScoreModelChange = (value) => {
  if (activeGame.value) {
    activeGame.value.scoreModel = value;
  }
};

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
  const maxId = games.value.reduce((max, game) => {
    const match = game.id.match(/^game-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 0);

  const newGameNumber = maxId + 1;
  const newGameId = `game-${newGameNumber}`;

  games.value.push({
    id: newGameId,
    name: `Spel ${newGameNumber}`,
    scoreModel: 'points',
    useRounds: false,
    roundsCount: 1,
    useSets: false,
    setsCount: 1,
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
      roundsCount: 1,
      useSets: false,
      setsCount: 1,
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

  gameToDeleteId.value = null;
};

const cancelDeleteGame = () => {
  gameToDeleteId.value = null;
};

const openAssignmentModal = (gameId) => {
  assignmentGameId.value = gameId;
  
  const index = games.value.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    const game = games.value[index];
    const gameName = game.name || `Spel ${index + 1}`;
    assignmentModalTitle.value = `Deelnemers voor ${gameName}`;
  } else {
    assignmentModalTitle.value = 'Deelnemers toewijzen';
  }

  const dialog = document.getElementById(assignmentModalId);
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
};

const closeAssignmentModal = () => {
  // We breken assignmentGameId niet af, zodat de modal niet flikkert tijdens het sluiten
  // assignmentGameId.value = null; 
};

const toggleParticipantAssignment = (participant, gameId) => {
  if (participant.assignedGameId === gameId) {
    participant.assignedGameId = null;
  } else {
    participant.assignedGameId = gameId;
  }
};

const getAssignedParticipants = (gameId) => {
  return participants.value.filter((p) => p.assignedGameId === gameId);
};

const goToPreviousTab = () => {
  if (isFirstTab.value) {
    router.push('/tablet');
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
  if (isLastTab.value) {
    // TODO: Submit form
    console.log('Form klaar!');
  } else {
    const nextIndex = activeTabIndex.value + 1;
    gameSetupTabList.value = gameSetupTabList.value.map((item, idx) => ({
      ...item,
      checked: idx === nextIndex,
    }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
};
</script>

<template>
  <div class="container p-game-setup-view">
    <!-- <div class="c-logo-header">
      <img class="c-logo-header__img" src="../assets/logo.webp" alt="Logo" />
    </div> -->

    <div class="row">
      <div class="col-12 col-lg-10 offset-lg-1 col-xl-8 offset-xl-2">
        <form class="p-game-setup-view__settings" @submit.prevent>
          <div class="p-game-setup-view__settings__head">
            <div class="p-game-setup-view__settings__head__subtitle">
              <Button href="/tablet" :is-icon-button="true" variant="secondary">
                <template #c-btn_icon-left>
                  <ArrowLeft :size="18" />
                </template>
              </Button>

              <div class="p-game-setup-view__settings__head__subtitle__title">
                <h1 class="h4">Spelinstellingen</h1>
                <p>Verander hier de instellingen van jouw spel</p>
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
                  placeholder="Bv. Sportdag 05/01/2026"
                />
              </div>

              <div
                class="p-game-setup-view__settings__body__content__participantmodus"
              >
                <div
                  class="p-game-setup-view__settings__body__content__participantmodus__subtitle"
                >
                  <h2 class="h6">Deelnemersmodus</h2>
                  <p>
                    Kies of je met individuele spelers of in teams zal spelen.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__participantmodus__content"
                >
                  <TabBar
                    :items="participantModusTabBar"
                    name="participant-modus"
                    :hideIcon="true"
                    @change="handleParticipantModeChange"
                  ></TabBar>

                  <Notice
                    text="Dit kan later niet meer worden gewijzigd"
                  ></Notice>
                </div>
              </div>

              <div
                class="p-game-setup-view__settings__body__content__gamemodus"
              >
                <h2 class="h6">Spelmodus</h2>

                <div
                  class="p-game-setup-view__settings__body__content__gamemodus__content"
                >
                  <InputRadioCards
                    :items="gameModusRadioCards"
                    name="game-modus"
                    @change="handleGameModeChange"
                  />

                  <Notice
                    text="Dit kan later niet meer worden gewijzigd"
                  ></Notice>
                </div>
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
                  placeholder="Bv. Tafeltennis"
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
                    min="1"
                    max="100"
                    label="Aantal rondes"
                    :id="`rounds-${activeGameId}`"
                    :name="`rounds-${activeGameId}`"
                    type="number"
                    v-model:toggled="activeGame.useRounds"
                    v-model="activeGame.roundsCount"
                  ></ToggleWithDropdown>

                  <ToggleWithDropdown
                    :inputId="`sets-toggle-${activeGameId}`"
                    labelTekst="Gebruik van sets"
                    min="1"
                    max="100"
                    label="Aantal sets per ronde/game"
                    :id="`sets-${activeGameId}`"
                    :name="`sets-${activeGameId}`"
                    type="number"
                    v-model:toggled="activeGame.useSets"
                    v-model="activeGame.setsCount"
                  ></ToggleWithDropdown>
                </div>
              </div>

              <div
                class="p-game-setup-view__settings__body__content__scoremodel"
              >
                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__subtitle"
                >
                  <h2 class="h6">Scoremodel voor deze game</h2>
                  <p>
                    Kies het type scoring dat voor deze game gebruikt wordt.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__content"
                >
                  <InputRadioCards
                    :items="scoreModelRadioCards"
                    :name="`score-model-${activeGameId}`"
                    @change="handleScoreModelChange"
                  />
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

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Bonuspunten</h2>
                  <ToggleWithDropdown
                    :inputId="`time-bonus-toggle-${activeGameId}`"
                    labelTekst="Bonus punten per actie"
                    min="1"
                    max="100"
                    label="Aantal bonus punten per actie"
                    :id="`time-bonus-${activeGameId}`"
                    :name="`timeBonus-${activeGameId}`"
                    type="number"
                    v-model:toggled="activeGame.useTimeBonusPoints"
                    v-model="activeGame.timeBonusPoints"
                  ></ToggleWithDropdown>
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
                    Wijs deelnemers toe aan een specifiek spel. Deelnemers die
                    geen spel toegewezen krijgen, doen niet mee.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__assignment__list"
                >
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
                        {{ game.name || `Spel ${index + 1}` }}
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

                  <div
                    v-if="participants.length === 0"
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
            cancel-btn-text="Sluiten"
            accept-btn-text="Opslaan"
            @cancel="closeAssignmentModal"
            @accept="closeAssignmentModal"
          >
            <div class="c-assignment-modal-list">
              <label
                v-for="participant in participants"
                :key="participant.id"
                class="c-assignment-modal-list__item"
                :class="{
                  'c-assignment-modal-list__item--active':
                    participant.assignedGameId === assignmentGameId,
                }"
              >
                <input
                  type="checkbox"
                  :checked="participant.assignedGameId === assignmentGameId"
                  @change="
                    toggleParticipantAssignment(participant, assignmentGameId)
                  "
                />
                <span class="c-assignment-modal-list__item__name">{{
                  participant.name
                }}</span>
                <span
                  v-if="
                    participant.assignedGameId &&
                    participant.assignedGameId !== assignmentGameId
                  "
                  class="c-assignment-modal-list__item__badge"
                >
                  In
                  {{
                    games.find((g) => g.id === participant.assignedGameId)
                      ?.name || 'ander spel'
                  }}
                </span>
              </label>
            </div>
            <div v-if="participants.length === 0">
              <p>Geen deelnemers gevonden.</p>
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
