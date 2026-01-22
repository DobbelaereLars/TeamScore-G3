<script setup>
import { computed } from 'vue';

const props = defineProps({
  imageSrc: {
    type: String,
    default: '/podium_screens/podium_screen_ph.png',
  },
  imageAlt: {
    type: String,
    default: 'Podium Screen Placeholder',
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  href: {
    type: String,
    default: '#',
  },
  status: {
    type: String,
    default: null,
  },
});

const statusLabel = computed(() => {
  switch (props.status) {
    case 'created':
      return 'Niet gestart';
    case 'in_progress':
      return 'Hervatten';
    case 'finished':
      return 'Afgelopen';
    default:
      return null;
  }
});
</script>

<template>
  <div class="c-session-card">
    <div class="c-session-card__head">
      <img :src="props.imageSrc" :alt="props.imageAlt" />
      <div
        v-if="statusLabel"
        class="c-session-card__badge"
        :class="`c-session-card__badge--${props.status}`"
      >
        <span>{{ statusLabel }}</span>
      </div>
    </div>

    <div class="c-session-card__body">
      <p v-if="props.title" class="u-bold">{{ props.title }}</p>
      <p v-if="props.subtitle">{{ props.subtitle }}</p>
    </div>

  </div>
</template>

<style scoped></style>
