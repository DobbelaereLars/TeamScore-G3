<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: [String, Boolean],
    default: 'Input label',
  },
  placeholder: {
    type: String,
    default: 'Input placeholder',
  },
  id: {
    type: String,
    default: 'inputtest',
  },
  name: {
    type: String,
    default: 'inputtest',
  },
});

const labelText = computed(() => {
  if (props.label === false) return '';
  if (typeof props.label === 'string' && props.label !== '') return props.label;
  return 'Input label';
});
</script>

<template>
  <div class="c-input-field">
    <label v-if="labelText" :for="id">{{ labelText }}</label>
    <input
      :id="id"
      :name="name"
      class="c-input-field__input"
      type="text"
      :placeholder="placeholder"
    />
  </div>
</template>

<style scoped></style>
