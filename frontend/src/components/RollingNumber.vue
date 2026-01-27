<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  value: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    default: 1500,
  },
  startDelay: {
    type: Number,
    default: 0,
  },
  trigger: {
    type: Boolean,
    default: true,
  },
  disableInitialAnimation: {
    type: Boolean,
    default: false,
  },
});

const displayValue = ref(props.disableInitialAnimation ? props.value : 0);
const hasAnimated = ref(props.disableInitialAnimation);

const animateValue = (start, end, duration) => {
  let startTimestamp = null;
  let lastUpdate = 0;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);

    // Throttle updates to ~30fps for better Pi performance
    if (timestamp - lastUpdate > 33 || progress >= 1) {
      lastUpdate = timestamp;
      // Ease out quart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      displayValue.value = Math.floor(easeProgress * (end - start) + start);
    }

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      displayValue.value = end;
    }
  };
  window.requestAnimationFrame(step);
};

// Start when trigger becomes true
watch(
  () => props.trigger,
  (newVal) => {
    if (newVal && !hasAnimated.value && !props.disableInitialAnimation) {
      hasAnimated.value = true;
      setTimeout(() => {
        animateValue(0, props.value, props.duration);
      }, props.startDelay);
    }
  },
  { immediate: true },
);

watch(
  () => props.value,
  (newVal, oldVal) => {
    if (props.trigger) {
      animateValue(oldVal || 0, newVal, props.duration);
    }
  },
);
</script>

<template>
  <span>{{ displayValue }}</span>
</template>
