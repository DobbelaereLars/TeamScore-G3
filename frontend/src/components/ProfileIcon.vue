<script setup>
    const props = defineProps({
  ProfileName: {
    type: String,
    default: 'S1',
  }});
</script>

<template>
  <div class="c-profile__icon">
    <p>{{ ProfileName }}</p>
  </div>
</template>

<style scoped></style>