<script setup>
import Crown from '../assets/crown.svg';
import { computed } from 'vue';

const props = defineProps({
  color: {
    type: String,
    default: 'red',
    validator: (value) => ['red', 'blue', 'orange'].includes(value)
  },
  spelersnaam: {
    type: String,
    default: 'hank de speler',
  },
  score: {
    type: Number,
    default: 0
  },
})

const profileInitials = computed(() => {
  const nameParts = props.spelersnaam.trim().split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) return 'S';
  if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
});
</script>

<template>
  <div class="c-leaderboard-podium-icon">
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
          'c-leaderboard-podium-icon__profile-container--blue': color === 'blue',
          'c-leaderboard-podium-icon__profile-container--orange': color === 'orange'
        }"
      >
        <div class="c-leaderboard-podium-icon__profileIcon">
          <h2>{{ profileInitials }}</h2>
        </div>
      </div>
      <div class="c-leaderboard-podium-icon__rank"
        :class="{
          'c-leaderboard-podium-icon__rank--blue': color === 'blue',
          'c-leaderboard-podium-icon__rank--orange': color === 'orange'
        }"
      >
        <h4 v-if="color == 'blue'">2</h4>
        <h4 v-else>2</h4>
      </div>
    </div>

    <div class="c-leaderboard-podium-icon__details">
      <h5 v-if="color == 'blue'">{{ spelersnaam }}</h5>
      <h5 v-else>{{ spelersnaam }}</h5>
      <h3 v-if="color=='blue'">{{ score }}</h3>
      <h3 v-else>{{ score }}</h3>
    </div>
  </div>
</template>

<style scoped></style>
