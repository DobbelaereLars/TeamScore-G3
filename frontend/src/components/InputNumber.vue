<script setup>
import { Minus, Plus } from 'lucide-vue-next';
import Button from './Button.vue';
import InputField from './InputField.vue';
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: 0,
  },
  label: {
    type: [String, Boolean],
    default: false,
  },
  id: {
    type: String,
    default: 'inputtest',
  },
  name: {
    type: String,
    default: 'inputtest',
  },
  type: {
    type: String,
    default: 'text',
  },
  min: {
    type: [Number, String],
    default: 0,
  },
  max: {
    type: [Number, String],
    default: Infinity,
  },
});

const emit = defineEmits(['update:modelValue']);

const minValue = computed(() => Number(props.min) || 0);
const maxValue = computed(() => {
  const val = Number(props.max);
  return isNaN(val) ? Infinity : val;
});

const internalValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    internalValue.value = newVal;
  }
);

const updateValue = (delta) => {
  const current = Number(internalValue.value) || minValue.value;
  let next = current + delta;

  if (next < minValue.value) next = minValue.value;
  if (next > maxValue.value) next = maxValue.value;

  internalValue.value = next;
  emit('update:modelValue', next);
};

const onInput = (value) => {
  internalValue.value = value;
  emit('update:modelValue', value);
};
</script>

<template>
  <div class="c-input-number">
    <p v-if="label">{{ label }}</p>
    <div class="c-input-number__container">
      <Button :clickable="false" :is-icon-button="true" @click="updateValue(-1)" :is-disabled="internalValue <= minValue">
        <template #c-btn_icon-left>
          <Minus :size="18" />
        </template>
      </Button>
      <InputField :modelValue="internalValue" @update:modelValue="onInput" :label="false" :placeholder="String(minValue)"
        :id="id" :name="name" :type="type" :min="minValue" :max="maxValue" />
      <Button :clickable="false" :is-icon-button="true" @click="updateValue(1)" :is-disabled="internalValue >= maxValue">
        <template #c-btn_icon-left>
          <Plus :size="18" />
        </template>
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
