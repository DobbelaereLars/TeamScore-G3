import { createRouter, createWebHistory } from 'vue-router';

import TabletHomeView from '../views/TabletHomeView.vue';
import GameSetupView from '../views/GameSetupView.vue';
import InGameSettingsView from '../views/InGameSettingsView.vue';
import PlayerListView from '../views/PlayerListView.vue';
import EndGameSummaryView from '../views/EndGameSummaryView.vue';
import PreviousSessionView from '../views/PreviousSessionView.vue';

import DisplaySplashView from '../views/DisplaySplashView.vue';
import DisplayScoreboardView from '../views/DisplayScoreboardView.vue';
import DisplayLeaderboardView from '../views/DisplayLeaderboardView.vue';
import DisplayPlayerListView from '../views/DisplayPlayerListView.vue';

const routes = [
  // Tablet routes
  { path: '/', redirect: '/tablet' },
  { path: '/tablet', name: 'tablet-home', component: TabletHomeView },
  { path: '/tablet/setup', name: 'game-setup', component: GameSetupView },
  {
    path: '/tablet/game/settings',
    name: 'ingame-settings',
    component: InGameSettingsView,
  },
  {
    path: '/tablet/game/players',
    name: 'tablet-player-list',
    component: PlayerListView,
  },
  {
    path: '/tablet/game/end',
    name: 'endgame-summary',
    component: EndGameSummaryView,
  },
  {
    path: '/tablet/sessions/:id',
    name: 'previous-session',
    component: PreviousSessionView,
  },

  // Display (Pi) routes
  {
    path: '/display/splash',
    name: 'display-splash',
    component: DisplaySplashView,
  },
  {
    path: '/display/scoreboard',
    name: 'display-scoreboard',
    component: DisplayScoreboardView,
  },
  {
    path: '/display/leaderboard',
    name: 'display-leaderboard',
    component: DisplayLeaderboardView,
  },
  {
    path: '/display/players',
    name: 'display-player-list',
    component: DisplayPlayerListView,
  },
  {
    path: '/test',
    name: 'test',
    component: () => import('../test/test.vue'),
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
