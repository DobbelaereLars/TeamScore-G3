<script setup>
import ProfileIcon from './ProfileIcon.vue';
import ProgressBar from './ProgressBar.vue';
import RollingNumber from './RollingNumber.vue';

const props = defineProps({
  position: {
    type: Number,
    default: 4,
  },
  playerName: {
    type: String,
    default: 'Player 4',
  },
  maxValue: {
    type: Number,
    default: 100,
  },
  score: {
    type: Number,
    default: 70,
  },
  displayScore: {
    type: String,
    default: '',
  },
  scoreLabel: {
    type: String,
    default: 'punten',
  },
});
</script>

<template>
  <div class="c-leaderboard-playercard">
    <div class="c-leaderboard-playercard__rank-and-icon">
      <p class="h4 c-leaderboard-playercard__rank-and-icon__rank">
        #{{ props.position }}
      </p>
      <ProfileIcon size="large" :playerName="props.playerName" />
    </div>
    <div class="c-leaderboard-playercard__name-and-progress">
      <p class="h5">{{ props.playerName }}</p>
      <ProgressBar :current-value="props.score" :max-value="props.maxValue" />
    </div>
    <div class="c-leaderboard-playercard__points">
      <p class="h3">
        <span v-if="displayScore">{{ displayScore }}</span>
        <RollingNumber
          v-else
          :value="props.score"
          :duration="800"
          :disableInitialAnimation="true"
        />
      </p>
      <p class="h6">{{ scoreLabel }}</p>
    </div>
  </div>
</template>

<style scoped></style>
