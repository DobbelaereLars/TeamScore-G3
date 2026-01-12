<script setup>
defineProps({
  buttonTekst: {
    type: String,
    default: ''
  },
  isIconButton: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <button 
    class="c-btn"
    :class="{ 'c-btn--icon-only': isIconButton }"
  >
    <span v-if="$slots['c-icon-left']" class="c-icon-container">
      <slot name="c-icon-left"></slot>
    </span>
    <span v-if="buttonTekst && !isIconButton" class="c-ButtonText">{{ buttonTekst }}</span>
    <span v-if="$slots['c-icon-right']" class="c-icon-container">
      <slot name="c-icon-right"></slot>
    </span>
  </button>
</template>

<style scoped>
.c-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>