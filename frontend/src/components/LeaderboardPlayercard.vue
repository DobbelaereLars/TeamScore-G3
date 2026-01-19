<script setup>
import ProfileIcon from "./ProfileIcon.vue";
import ProgressBar from "./ProgressBar.vue";
import RollingNumber from "./RollingNumber.vue";

const props = defineProps({
  position: {
    type: Number,
    default: 4,
  },
  playerName: {
    type: String,
    default: "Player 4",
  },
  maxValue: {
    type: Number,
    default: 100,
  },
  score: {
    type: Number,
    default: 70,
  },
});
</script>

<template>
  <div class="c-leaderboard-playercard">
    <div class="c-leaderboard-playercard__rank-and-icon">
      <p class="h4 c-leaderboard-playercard__rank-and-icon__rank">
        #{{ props.position }}
      </p>
      <ProfileIcon :sizeUp="true" :playerName="props.playerName" />
    </div>
    <div class="c-leaderboard-playercard__name-and-progress">
      <p class="h5">{{ props.playerName }}</p>
      <ProgressBar :current-value="props.score" :max-value="props.maxValue" />
    </div>
    <div class="c-leaderboard-playercard__points">
      <p class="h3">
        <RollingNumber
          :value="props.score"
          :duration="800"
          :disableInitialAnimation="true"
        />
      </p>
      <p class="h6">punten</p>
    </div>
  </div>
</template>

<style scoped></style>
