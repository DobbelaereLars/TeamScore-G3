<script setup>
import { computed } from 'vue';
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

const labelText = computed(() => {
  if (props.label === false) return '';
  if (typeof props.label === 'string' && props.label !== '') return props.label;
  return 'Input label';
});

const emit = defineEmits(['update:modelValue']);

const handleChange = (event) => {
  emit('update:modelValue', event.target.value);
};
</script>

<template>
  <div class="c-input-select">
    <label v-if="labelText" class="c-input-select__label" :for="id">
      {{ labelText }}
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
