<script setup>
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
});
</script>

<template>
  <div class="c-session-card">
    <div class="c-session-card__head">
      <img :src="props.imageSrc" :alt="props.imageAlt" />
    </div>

    <div class="c-session-card__body">
      <p v-if="props.title" class="u-bold">{{ props.title }}</p>
      <p v-if="props.subtitle">{{ props.subtitle }}</p>
    </div>

    <a class="c-session-card__link" :href="props.href"></a>
  </div>
</template>

<style scoped></style>
