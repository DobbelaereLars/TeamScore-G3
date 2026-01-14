<script setup>
import LeaderboardPodiumIcon from '../components/LeaderboardPodiumIcon.vue';
</script>

<template>
  <div class="test-cont">
    <LeaderboardPodiumIcon color="blue" />
    <LeaderboardPodiumIcon color="blue" />
  </div>
</template>

<style scoped>
  .test-cont {
    display: flex;
    gap: 2rem;
    align-items: center;
  }
</style>
