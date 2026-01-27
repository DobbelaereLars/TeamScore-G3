<script setup>
import { Info } from 'lucide-vue-next';

const props = defineProps({
  text: {
    type: String,
    default: 'Nog geen tekst meegegeven',
  },
});
</script>

<template>
  <div class="c-notice">
    <Info class="c-notice__icon" :size="16"></Info>
    <p class="c-notice__tekst">{{ text }}</p>
  </div>
</template>

<style scoped></style>
