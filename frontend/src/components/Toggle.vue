<script setup>
defineProps({
  inputId: String,
  labelTekst: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['change']);
</script>

<template>
  <div class="c-toggle">
    <label class="c-toggle__label" :for="inputId">
      <input
        :id="inputId"
        :name="inputId"
        class="c-toggle__label__input"
        type="checkbox"
        @change="emit('change', $event)"
      />
      <span class="c-toggle__label__thumb"></span>
    </label>

    <span class="c-toggle__labeltekst">{{ labelTekst }}</span>
  </div>
</template>

<style scoped></style>
