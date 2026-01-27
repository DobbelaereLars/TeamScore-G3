<script setup>
import { computed } from "vue";

const props = defineProps({
  progress: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100,
  },
  maxValue: {
    type: Number,
    default: 100,
  },
  minValue: {
    type: Number,
    default: 0,
  },
  currentValue: {
    type: Number,
    default: 0,
  },
  rankingRule: {
    type: String,
    default: "highest_wins",
  },
  variant: {
    type: String,
    default: "Px",
    validator: (value) => [, "P1", "P2", "P3", "Px"].includes(value),
  },
});

const progressPercentage = computed(() => {
  if (props.maxValue > 0) {
    // For "lowest_wins" (fastest time wins, lowest score wins), invert the progress bar
    // The lowest value should have the highest fill percentage
    if (props.rankingRule === "lowest_wins") {
      // If currentValue is null/undefined → no progress
      // But 0 is a VALID score (best possible for lowest_wins)
      if (props.currentValue === null || props.currentValue === undefined) return 0;
      
      // If current value is 0, it's the best possible score → 100%
      if (props.currentValue === 0) return 100;
      
      // If max equals min (all same non-zero value), show 100%
      if (props.maxValue === props.minValue) return 100;
      
      // Invert: min score = 100%, max score = smaller percentage
      // Formula: (max - current) / (max - min) * 100
      // This gives 100% to the min value and approaches lower % for max value
      const range = props.maxValue - props.minValue;
      if (range <= 0) return 100; // All same value
      
      const invertedProgress = ((props.maxValue - props.currentValue) / range) * 100;
      return Math.min(Math.max(invertedProgress, 10), 100); // Min 10% to always show something
    }
    
    // Default: highest wins - normal calculation
    // Null/undefined → no progress, 0 is valid (but shows 0%)
    if (props.currentValue === null || props.currentValue === undefined) return 0;
    return Math.min((props.currentValue / props.maxValue) * 100, 100);
  }
  return Math.min(props.progress, 100);
});
</script>

<template>
  <div class="c-progressbar">
    <div
      class="c-progressbar__track"
      :class="`c-progressbar__track--${props.variant}`"
    >
      <div
        class="c-progressbar__fill"
        :class="`c-progressbar__fill--${props.variant}`"
        :style="{ width: `${progressPercentage}%` }"
      ></div>
    </div>
  </div>
</template>
