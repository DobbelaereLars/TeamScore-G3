<script setup>
import { ref, computed } from 'vue';
import Button from '../components/Button.vue';
import TabList from '../components/TabList.vue';
import InputField from '../components/InputField.vue';
import TabBar from '../components/TabBar.vue';
import Notice from '../components/Notice.vue';
import InputRadioCards from '../components/InputRadioCards.vue';
import ToggleWithDropdown from '../components/ToggleWithDropdown.vue';
import PlayersSetting from '../components/PlayersSetting.vue';
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
} from 'lucide-vue-next';
import InputNumber from '../components/InputNumber.vue';

const gameSeriesTabBar = [
  {
    id: 'game-1',
    value: 'game-1',
    label: 'Spel 1',
    checked: true,
  },
  {
    id: 'game-2',
    value: 'game-2',
    label: 'Spel 2',
  },
  {
    id: 'game-3',
    value: 'game-3',
    label: 'Spel 3',
  },
];

const scoreModelRadioCards = [
  {
    id: 'points',
    value: 'points',
    label: 'Puntenscore',
    description: 'Punten op basis van juiste antwoorden of acties.',
    icon: Target,
    checked: true,
  },
  {
    id: 'time',
    value: 'time',
    label: 'Tijdscore',
    description: 'Score bepaald door snelheid en tijdslimiet.',
    icon: Clock7,
  },
  {
    id: 'completed',
    value: 'completed',
    label: 'Voltooid / niet voltooid',
    description: 'Punten alleen voor afgeronde opdrachten.',
    icon: SquareCheck,
  },
];

const gameModusRadioCards = [
  {
    id: 'single-game',
    value: 'single-game',
    label: 'Scoreboard voor één game',
    description: 'Eén scoreboard voor een enkele game.',
    icon: Dices,
    checked: true,
  },
  {
    id: 'series-of-games',
    value: 'series-of-games',
    label: 'Serie van games',
    description: 'Meerdere games na elkaar in één reeks.',
    icon: Route,
  },
  {
    id: 'parallel-games',
    value: 'parallel-games',
    label: 'Parallelle games',
    description: 'Meerdere games tegelijk met verdeelde spelers/teams.',
    icon: Workflow,
  },
];

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

const participantModusTabBar = ref([
  {
    id: 'individuals',
    value: 'individuals',
    label: 'Individuele spelers',
    checked: true,
  },
  {
    id: 'teams',
    value: 'teams',
    label: 'Teams',
  },
  {
    id: 'teams-with-players',
    value: 'teams-with-players',
    label: 'Teams met spelers',
  },
]);

// Track active tab
const activeTab = computed(() => {
  const activeItem = gameSetupTabList.value.find((item) => item.checked);
  return activeItem?.id ?? 'session';
});
</script>

<template>
  <div class="container p-game-setup-view">
    <div class="c-logo-header">
      <img class="c-logo-header__img" src="../assets/logo.webp" alt="Logo" />
    </div>

    <div class="row">
      <div class="col-8 offset-2">
        <form class="p-game-setup-view__settings">
          <div class="p-game-setup-view__settings__head">
            <Button href="/tablet" :is-icon-button="true" variant="secondary">
              <template #c-btn_icon-left>
                <ArrowLeft :size="18" />
              </template>
            </Button>

            <div class="p-game-setup-view__settings__head__title">
              <h1 class="h4">Spelinstellingen</h1>
              <p>Verander hier de instellingen van jouw spel</p>
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
              <div
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
                    ></TabBar>
                  </div>

                  <Button
                    :clickable="false"
                    variant="secondary"
                    button-tekst="Game toevoegen"
                  >
                    <template #c-btn_icon-left>
                      <Plus :size="18" />
                    </template>
                  </Button>
                </div>
              </div>
              <div class="p-game-setup-view__settings__body__content__gamename">
                <h2 class="h6">Spelnaam</h2>
                <InputField
                  id="game-name-1"
                  name="gameName1"
                  :label="false"
                  placeholder="Bv. Tafeltennis"
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
                    inputId="rounds-toggle"
                    labelTekst="Gebruik van rondes"
                    min="1"
                    max="10"
                    label="Aantal rondes"
                    id="rounds"
                    name="rounds"
                    type="number"
                  ></ToggleWithDropdown>

                  <ToggleWithDropdown
                    inputId="sets-toggle"
                    labelTekst="Gebruik van sets"
                    min="1"
                    max="10"
                    label="Aantal sets per ronde/game"
                    id="sets"
                    name="sets"
                    type="number"
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
                    Bepaal hier het aantal rondes, de punten per ronde en of er
                    gebruikt wordt gemaakt van sets.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__content"
                >
                  <InputRadioCards
                    :items="scoreModelRadioCards"
                    name="score-model-participants"
                  />
                </div>
              </div>

              <div
                class="p-game-setup-view__settings__body__content__scoremodel__settings"
              >
                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Puntenscore instellingen</h2>
                  <InputNumber
                    id="points-per-correct-answer"
                    name="pointsPerCorrectAnswer"
                    label="Punten per correcte actie"
                    type="number"
                  />
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__scoremodel__settings__section"
                >
                  <h2 class="h6">Bonuspunten</h2>
                  <ToggleWithDropdown
                    inputId="bonus-points-toggle"
                    labelTekst="Bonus punten per actie"
                    min="0"
                    max="100"
                    label="Aantal bonus punten"
                    id="bonus-points"
                    name="bonusPoints"
                    type="number"
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
                <PlayersSetting player-mode="players" />
              </div>
            </div>
          </div>

          <div class="p-game-setup-view__settings__footer">
            <Button href="/tablet" variant="secondary" button-tekst="Terug">
              <template #c-btn_icon-left>
                <ArrowLeft :size="18" />
              </template>
            </Button>

            <Button
              :clickable="false"
              variant="primary"
              button-tekst="Volgende"
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
