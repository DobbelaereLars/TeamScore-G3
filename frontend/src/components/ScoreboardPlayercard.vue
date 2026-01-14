<script setup>
    import ProgressBar from './ProgressBar.vue';
    import ProfileIcon from './ProfileIcon.vue';
    import { computed } from 'vue';
   import {
  Crown,
  Medal,
  Trophy
} from 'lucide-vue-next'
    
    const props = defineProps({
  variant: {
    type: String,
    default: 'Px',
    validator: (value) => ['Px', 'P1', 'P2', 'P3'].includes(value)},
    spelersnaam: {
      type: String,
      default: 'speler 1',
    },
    score: {
      type: Number,
      default: 0,
    },
    maxValue: {
      type: Number,
      default: 100,
    },
    position: {
      type: Number,
      default: 1,
    },


});

const profileInitials = computed(() => {
  const nameParts = props.spelersnaam.trim().split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) return 'S';
  if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
});

</script>

<template>
  <div class="c-player-card">
    <div v-if="variant === 'P1'" class="c-player-card-icon-wrapper c-player-card-icon-wrapper--P1">
      <Crown :size="28" style="position: absolute; visibility: hidden;" />
    </div>
    <div v-else-if="variant === 'P2'" class="c-player-card-icon-wrapper c-player-card-icon-wrapper--P2">
      <Medal :size="28" style="position: absolute; visibility: hidden;" />
    </div>
    <div v-else-if="variant === 'P3'" class="c-player-card-icon-wrapper c-player-card-icon-wrapper--P3">
      <Trophy :size="28" style="position: absolute; visibility: hidden;" />
    </div>
    <div class="c-player-card-rank" :class="[`c-player-card-rank--${variant}`, $attrs.class]">
      <p class="u-bold">#{{ position }}</p>
    </div>
    <div class="c-player-card-container">
    <div class="c-player-card-info">
        <ProfileIcon class="c-player-card-profile" :ProfileName="profileInitials" :variant="`scoreboard-${variant}`" />
    
      <p class="c-player-card-name h5">{{ spelersnaam }}</p>
      <div class="c-player-card-score-section">
        <p class="c-player-card-score-value h4 u-bold" :class="[`c-player-card-score-value--${variant}`, $attrs.class]">{{ score }}</p>
        <p class="c-player-card-score-label" >punten</p>
      </div>

    </div>
        <ProgressBar :current-value="score" :max-value="`${maxValue}`" :variant="`${variant}`" />

    </div>
  </div>
</template>

<style scoped>
  

</style>
