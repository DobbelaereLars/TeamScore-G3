<script setup>
defineProps({
  inputId: String
})

const emit = defineEmits(['change'])
</script>

<template>
  <label class="c-toggle" :for="inputId">
    <input :id="inputId" :name="inputId" class="c-toggle__input" type="checkbox" @change="emit('change', $event)" />
    <span class="c-toggle__thumb"></span>
  </label>
</template>

<style scoped></style>
