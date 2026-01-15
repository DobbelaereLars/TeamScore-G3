<script setup>
import InputNumber from './InputNumber.vue';
import Toggle from './Toggle.vue';
import { ref, watch } from 'vue';

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
    type: [Number, String],
    default: '0',
  },
  max: {
    type: [Number, String],
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
  toggled: {
    type: Boolean,
    default: false,
  },
  modelValue: {
    type: [Number, String],
    default: 0,
  },
});

const emit = defineEmits(['update:toggled', 'update:modelValue']);

const internalToggled = ref(props.toggled);

watch(
  () => props.toggled,
  (newVal) => {
    internalToggled.value = newVal;
  }
);

const handleToggleUpdate = (val) => {
  internalToggled.value = val;
  emit('update:toggled', val);
};
</script>

<template>
  <div class="c-toggle-dropdown">
    <Toggle
      :inputId="inputId"
      :labelTekst="labelTekst"
      :modelValue="internalToggled"
      @update:modelValue="handleToggleUpdate"
    />
    <div
      class="c-toggle__label__dropdown"
      :class="{ 'c-toggle__label__dropdown--active': internalToggled }"
    >
      <InputNumber
        :min="min"
        :max="max"
        :label="label"
        :id="id"
        :name="name"
        :type="type"
        :modelValue="modelValue"
        @update:modelValue="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>

<style scoped></style>
