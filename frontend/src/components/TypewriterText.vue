<script setup>
import { ref, watch, computed } from "vue";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  typingSpeed: {
    type: Number,
    default: 50, // ms per char
  },
  deleteSpeed: {
    type: Number,
    default: 30, // ms per char delete
  },
});

const displayText = ref(props.text);
const isTyping = ref(false);

watch(
  () => props.text,
  async (newVal, oldVal) => {
    if (newVal === oldVal) return;

    isTyping.value = true;

    // 1. Find common prefix
    let commonPrefixLength = 0;
    const minLength = Math.min(newVal.length, oldVal.length);
    for (let i = 0; i < minLength; i++) {
      if (newVal[i] === oldVal[i]) {
        commonPrefixLength++;
      } else {
        break;
      }
    }

    // 2. Backspace (Delete)
    while (displayText.value.length > commonPrefixLength) {
      await wait(props.deleteSpeed);
      displayText.value = displayText.value.slice(0, -1);
    }

    // 3. Type (Add)
    while (displayText.value.length < newVal.length) {
      await wait(props.typingSpeed);
      displayText.value = newVal.slice(0, displayText.value.length + 1);
    }

    isTyping.value = false;
  },
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
</script>

<template>
  <span>{{ displayText }}<span v-if="isTyping" class="cursor">|</span></span>
</template>

<style scoped>
.cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
