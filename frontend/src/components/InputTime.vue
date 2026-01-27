<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: [Number, String], // Allow null
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

// Local state for inputs
const hours = ref('');
const minutes = ref('');
const seconds = ref('');
const milliseconds = ref('');

// Parse seconds (float) to Time Components
const parseTime = (totalSeconds) => {
  // Handle null/undefined (explicitly unset)
  if (totalSeconds === null || totalSeconds === undefined) {
    hours.value = '';
    minutes.value = '';
    seconds.value = '';
    milliseconds.value = '';
    return;
  }

  const val = Number(totalSeconds);
  if (isNaN(val)) {
    // If it's a non-number (but not null/undefined caught above)
    // usually defaulting to 0 is safer or empty.
    // Let's stick to empty for invalid inputs to avoid auto-0
    hours.value = '';
    minutes.value = '';
    seconds.value = '';
    milliseconds.value = '';
    return;
  }

  // Use empty string for zero values to show placeholders instead of "0"
  // This preserves the user experience of only showing filled-in values
  const h = Math.floor(val / 3600);
  const m = Math.floor((val % 3600) / 60);
  const s = Math.floor(val % 60);
  const ms = Math.round((val % 1) * 1000);

  hours.value = h || '';
  minutes.value = m || '';
  seconds.value = s || '';
  milliseconds.value = ms || '';
};

// Initial parse
parseTime(props.modelValue);

const calculateTotalSeconds = () => {
  return (
    (Number(hours.value) || 0) * 3600 +
    (Number(minutes.value) || 0) * 60 +
    (Number(seconds.value) || 0) +
    (Number(milliseconds.value) || 0) / 1000
  );
};

// Watch for external changes
watch(
  () => props.modelValue,
  (newVal) => {
    // Force clear if null, even if currentTotal is 0
    if (newVal === null) {
      hours.value = '';
      minutes.value = '';
      seconds.value = '';
      milliseconds.value = '';
      return;
    }

    // Only update if the calculated total differs significantly (to avoid cursor jumping)
    const currentTotal = calculateTotalSeconds();
    if (Math.abs(currentTotal - newVal) > 0.001) {
      parseTime(newVal);
    }
  },
);

const update = () => {
  // Check if everything is empty strings
  if (
    hours.value === '' &&
    minutes.value === '' &&
    seconds.value === '' &&
    milliseconds.value === ''
  ) {
    emit('update:modelValue', null);
    return;
  }

  // Enforce limits (only if not empty string to prevent coercion)
  if (hours.value !== '' && hours.value < 0) hours.value = 0;

  if (minutes.value !== '') {
    if (minutes.value > 60) minutes.value = 60;
    if (minutes.value < 0) minutes.value = 0;
  }

  if (seconds.value !== '') {
    if (seconds.value > 60) seconds.value = 60;
    if (seconds.value < 0) seconds.value = 0;
  }

  if (milliseconds.value !== '') {
    if (milliseconds.value > 999) milliseconds.value = 999;
    if (milliseconds.value < 0) milliseconds.value = 0;
  }

  const total = calculateTotalSeconds();
  emit('update:modelValue', total);
};
</script>

<template>
  <div class="c-input-time">
    <div class="c-input-time__group">
      <input
        type="number"
        v-model="hours"
        @change="update"
        min="0"
        :disabled="disabled"
        class="c-input-time__input"
        placeholder="u"
      />
      <span class="c-input-time__label">u</span>
    </div>
    <span class="c-input-time__separator">:</span>

    <div class="c-input-time__group">
      <input
        type="number"
        v-model="minutes"
        @change="update"
        min="0"
        max="60"
        :disabled="disabled"
        class="c-input-time__input"
        placeholder="m"
      />
      <span class="c-input-time__label">m</span>
    </div>
    <span class="c-input-time__separator">:</span>

    <div class="c-input-time__group">
      <input
        type="number"
        v-model="seconds"
        @change="update"
        min="0"
        max="60"
        :disabled="disabled"
        class="c-input-time__input"
        placeholder="s"
      />
      <span class="c-input-time__label">s</span>
    </div>
    <span class="c-input-time__separator">.</span>

    <div class="c-input-time__group">
      <input
        type="number"
        v-model="milliseconds"
        @change="update"
        min="0"
        max="999"
        :disabled="disabled"
        class="c-input-time__input"
        placeholder="ms"
      />
      <span class="c-input-time__label">ms</span>
    </div>
  </div>
</template>

<style scoped></style>
