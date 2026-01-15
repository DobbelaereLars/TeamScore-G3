<script setup>
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  label: {
    type: [String, Boolean],
    default: 'Label',
  },
  modelValue: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const handleChange = (event) => {
  emit('update:modelValue', event.target.value);
};
</script>

<template>
  <div class="c-input-select">
    <label v-if="label !== false" class="c-input-select__label" :for="id">
      {{ label }}
    </label>
    <div class="c-input-select__wrapper">
      <select
        :id="id"
        :name="name"
        class="c-input-select__input"
        :value="modelValue"
        @change="handleChange"
      >
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <ChevronDown :size="24" class="c-input-select__icon" />
    </div>
  </div>
</template>

<style scoped></style>
