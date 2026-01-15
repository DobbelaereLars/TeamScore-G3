<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  inputId: String,
  labelTekst: {
    type: String,
    default: '',
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const internalChecked = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    internalChecked.value = newVal;
  }
);

const handleChange = (event) => {
  internalChecked.value = event.target.checked;
  emit('update:modelValue', event.target.checked);
  emit('change', event);
};
</script>

<template>
  <div class="c-toggle">
    <label class="c-toggle__label" :for="inputId">
      <input
        :id="inputId"
        :name="inputId"
        class="c-toggle__label__input"
        type="checkbox"
        :checked="internalChecked"
        @change="handleChange"
      />
      <span class="c-toggle__label__thumb"></span>
    </label>

    <span class="c-toggle__labeltekst">{{ labelTekst }}</span>
  </div>
</template>

<style scoped></style>
