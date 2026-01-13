<script setup>
import { computed } from 'vue';

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
  currentValue: {
    type: Number,
    default: 0,
  },
});

const progressPercentage = computed(() => {
  if (props.maxValue > 0) {
    return Math.min((props.currentValue / props.maxValue) * 100, 100);
  }
  return Math.min(props.progress, 100);
});
</script>

<template>
  <div class="c-progressbar">
    <div class="c-progressbar__track">
      <div 
        class="c-progressbar__fill" 
        :style="{ width: `${progressPercentage}%` }"
      ></div>
    </div>
  </div>
</template>
