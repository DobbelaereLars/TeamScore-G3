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
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary'].includes(v),
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
  <a
    :href="realHref"
    class="c-btn"
    :class="[
      `c-btn--${props.variant}`,
      { 'c-btn--icon-only': props.isIconButton },
      { 'c-btn--disabled': props.isDisabled },
    ]"
  >
    <span v-if="$slots['c-btn_icon-left']" class="c-btn_icon-container">
      <slot name="c-btn_icon-left"></slot>
    </span>

    <span v-if="buttonTekst && !isIconButton">{{ buttonTekst }}</span>

    <span v-if="$slots['c-btn_icon-right']" class="c-btn_icon-container">
      <slot name="c-btn_icon-right"></slot>
    </span>
  </a>
</template>
