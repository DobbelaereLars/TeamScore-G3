<script setup>
import ProgressBar from './ProgressBar.vue';
import ProfileIcon from './ProfileIcon.vue';
import { computed } from 'vue';
import { Crown, Medal, Trophy } from 'lucide-vue-next';

const props = defineProps({
  variant: {
    type: String,
    default: 'Px',
    validator: (value) => ['Px', 'P1', 'P2', 'P3'].includes(value),
  },
  spelersnaam: {
    type: String,
    default: 'Speler 1',
  },
  score: {
    type: Number,
    default: 0,
  },
  displayScore: {
    type: String,
    default: '',
  },
  scoreLabel: {
    type: String,
    default: 'punten',
  },
  maxValue: {
    type: Number,
    default: 100,
  },
  minValue: {
    type: Number,
    default: 0,
  },
  rankingRule: {
    type: String,
    default: 'highest_wins',
  },
  position: {
    type: Number,
    default: 1,
  },
});
</script>

<template>
  <div class="c-player-card">
    <div
      v-if="variant === 'P1'"
      class="c-player-card-icon-wrapper c-player-card-icon-wrapper--P1"
    >
      <Crown :size="28" style="position: absolute; visibility: hidden" />
    </div>
    <div
      v-else-if="variant === 'P2'"
      class="c-player-card-icon-wrapper c-player-card-icon-wrapper--P2"
    >
      <Medal :size="28" style="position: absolute; visibility: hidden" />
    </div>
    <div
      v-else-if="variant === 'P3'"
      class="c-player-card-icon-wrapper c-player-card-icon-wrapper--P3"
    >
      <Trophy :size="28" style="position: absolute; visibility: hidden" />
    </div>
    <div
      class="c-player-card-rank"
      :class="[`c-player-card-rank--${variant}`, $attrs.class]"
    >
      <p class="u-bold">#{{ position }}</p>
    </div>
    <div class="c-player-card-container">
      <div class="c-player-card-info">
        <ProfileIcon
          class="c-player-card-profile"
          :playerName="spelersnaam"
          :variant="`scoreboard-${variant}`"
          size="large"
        />

        <p class="c-player-card-name h5">{{ spelersnaam }}</p>
        <div class="c-player-card-score-section">
          <p
            class="c-player-card-score-value h4 u-bold"
            :class="[`c-player-card-score-value--${variant}`, $attrs.class]"
          >
            {{ displayScore || score }}
          </p>
          <p class="c-player-card-score-label">{{ scoreLabel }}</p>
        </div>
      </div>
      <ProgressBar
        :current-value="score"
        :max-value="maxValue"
        :min-value="minValue"
        :ranking-rule="rankingRule"
        :variant="variant"
      />
    </div>
  </div>
</template>

<style scoped></style>
