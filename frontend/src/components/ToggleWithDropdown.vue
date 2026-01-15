<script setup>
import InputNumber from './InputNumber.vue';
import Toggle from './Toggle.vue';
import { ref } from 'vue';

const props = defineProps({
  inputId: {
    type: String,
    required: true,
  },
  labelTekst: {
    type: String,
    default: '',
  },
  min: {
    type: String,
    default: '0',
  },
  max: {
    type: String,
    default: '100',
  },
  label: {
    type: String,
    default: 'Aantal',
  },
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'number',
  },
});

const isChecked = ref(false);

const handleToggleChange = (event) => {
  isChecked.value = event.target.checked;
};
</script>

<template>
  <div class="c-toggle-dropdown">
    <Toggle
      :inputId="inputId"
      :labelTekst="labelTekst"
      @change="handleToggleChange"
    />
    <div
      class="c-toggle__label__dropdown"
      :class="{ 'c-toggle__label__dropdown--active': isChecked }"
    >
      <InputNumber
        :min="min"
        :max="max"
        :label="label"
        :id="id"
        :name="name"
        :type="type"
      />
    </div>
  </div>
</template>

<style scoped></style>
