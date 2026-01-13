<script setup>
    const props = defineProps({
  ProfileName: {
    type: String,
    default: 'S1',
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'scoreboard-P1', 'scoreboard-P2', 'scoreboard-P3'].includes(value)
  }});
</script>

<template>
  <div class="c-profile__icon" :class="[`c-profile__icon--${variant}`, $attrs.class]">
    <p>{{ ProfileName }}</p>
  </div>
</template>

<style scoped></style>