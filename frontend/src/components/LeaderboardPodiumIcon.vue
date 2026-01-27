<script setup>
import Crown from '../assets/crown.svg';
import RollingNumber from './RollingNumber.vue'; // Import the component
import { computed } from 'vue';
// ... (rest is same)

const props = defineProps({
  color: {
    type: String,
    default: 'red',
    validator: (value) => ['red', 'blue', 'orange'].includes(value),
  },
  spelersnaam: {
    type: String,
    default: 'speler',
  },
  score: {
    type: Number,
    default: null,
  },
  displayScore: {
    type: String,
    default: '',
  },
  visible: {
    type: Boolean,
    default: true,
  },
  animated: {
    type: Boolean,
    default: true,
  },
});

const profileInitials = computed(() => {
  const nameParts = props.spelersnaam
    .trim()
    .split(' ')
    .filter((part) => part.length > 0);
  if (nameParts.length === 0) return 'S';
  if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
});
</script>

<template>
  <div
    class="c-leaderboard-podium-icon"
    :class="`c-leaderboard-podium-icon--${color}`"
  >
    <div class="c-leaderboard-podium-icon__profile">
      <img
        v-if="color === 'blue'"
        :src="Crown"
        alt="crown"
        class="c-leaderboard-podium-icon__crown"
      />
      <div
        class="c-leaderboard-podium-icon__profile-container"
        :class="{
          'c-leaderboard-podium-icon__profile-container--blue':
            color === 'blue',
          'c-leaderboard-podium-icon__profile-container--orange':
            color === 'orange',
        }"
      >
        <div class="c-leaderboard-podium-icon__profileIcon">
          <p class="h2">{{ profileInitials }}</p>
        </div>
      </div>
      <div
        class="c-leaderboard-podium-icon__rank"
        :class="{
          'c-leaderboard-podium-icon__rank--blue': color === 'blue',
          'c-leaderboard-podium-icon__rank--orange': color === 'orange',
        }"
      >
        <p class="h4">
          {{
            color === 'blue'
              ? 1
              : color === 'red'
                ? 2
                : color === 'orange'
                  ? 3
                  : '4'
          }}
        </p>
      </div>
    </div>

    <div class="c-leaderboard-podium-icon__details">
      <p class="h5">{{ spelersnaam }}</p>
      <p class="h3">
        <span v-if="displayScore !== undefined && displayScore !== ''">{{
          displayScore
        }}</span>
        <RollingNumber
          v-else-if="score !== null && score !== undefined"
          :value="score"
          :duration="800"
          :trigger="visible"
          :disableInitialAnimation="!animated"
        />
        <span v-else>--:--</span>
      </p>
    </div>
  </div>
</template>

<style scoped></style>
