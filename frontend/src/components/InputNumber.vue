<script setup>
import { Minus, Plus } from 'lucide-vue-next';
import Button from './Button.vue';
import InputField from './InputField.vue';
import { ref, computed } from 'vue';

const props = defineProps({
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

const minValue = computed(() => Number(props.min) || 0);
const maxValue = computed(() => {
  const val = Number(props.max);
  return isNaN(val) ? Infinity : val;
});

const inputValue = ref(minValue.value);

const updateValue = (delta) => {
  const current = Number(inputValue.value) || minValue.value;
  let next = current + delta;

  if (next < minValue.value) next = minValue.value;
  if (next > maxValue.value) next = maxValue.value;

  inputValue.value = next;
};
</script>

<template>
  <div class="c-input-number">
    <p v-if="label">{{ label }}</p>
    <div class="c-input-number__container">
      <Button :is-icon-button="true" @click="updateValue(-1)" :is-disabled="inputValue <= minValue">
        <template #c-btn_icon-left>
          <Minus :size="18" />
        </template>
      </Button>
      <InputField v-model="inputValue" :label="false" :placeholder="minValue" :id="id" :name="name" :type="type"
        :min="minValue" :max="maxValue" />
      <Button :is-icon-button="true" @click="updateValue(1)" :is-disabled="inputValue >= maxValue">
        <template #c-btn_icon-left>
          <Plus :size="18" />
        </template>
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
