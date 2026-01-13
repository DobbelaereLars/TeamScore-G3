<script setup>
import { computed } from 'vue';

const props = defineProps({
  buttonTekst: {
    type: String,
    default: '',
  },
  isIconButton: {
    type: Boolean,
    default: false,
  },
  href: {
    type: String,
    default: '#',
  },

  isDisabled: {
    type: Boolean,
    default: false,
  },
});

const realHref = computed(() => {
  // normalize missing or empty href to '#'
  if (props.href === '' || props.href == null) return '#';
  return props.href;
});
</script>

<template>
  <a :href="realHref"
    :class="'c-btn' + (isIconButton ? ' c-btn--icon-only' : '') + (isDisabled ? ' c-btn--disabled' : '')">
    <span v-if="$slots['c-icon-left']" class="c-icon-container">
      <slot name="c-icon-left"></slot>
    </span>
    <span v-if="buttonTekst && !isIconButton" class="c-ButtonText">{{
      buttonTekst
    }}</span>
    <span v-if="$slots['c-icon-right']" class="c-icon-container">
      <slot name="c-icon-right"></slot>
    </span>
  </a>
</template>

<style scoped>
.c-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
