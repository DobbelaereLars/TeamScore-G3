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
  currentValue: {
    type: Number,
    default: 0,
  },
  variant: {
    type: String,
    default: "Px",
    validator: (value) => [, "P1", "P2", "P3", "Px"].includes(value),
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
