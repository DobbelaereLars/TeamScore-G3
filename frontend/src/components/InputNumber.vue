<script setup>
import { Minus, Plus } from "lucide-vue-next";
import Button from "./Button.vue";
import InputField from "./InputField.vue";
import { ref } from "vue";

const props = defineProps({
  label: {
    type: [String, Boolean],
    default: false,
  },
  id: {
    type: String,
    default: "inputtest",
  },
  name: {
    type: String,
    default: "inputtest",
  },
  type: {
    type: String,
    default: "text",
  },
  min: {
    type: [Number],
    default: 0,
  },
  max: {
    type: [Number],
    default: Infinity,
  },

});

const inputValue = ref(props.min);

const updateValue = (delta) => {
  const min = props.min ?? 0;          // default 0 als je wil
  const max = props.max ?? Infinity;   // geen limiet als niet gezet

  const current = Number(inputValue.value) || 0;
  let next = current + delta;

  if (next < min) next = min;
  if (next > max) next = max;

  inputValue.value = next;
};

</script>

<template>
  <div class="c-input-number">
    <p v-if="label">{{ label }}</p>
    <div class="c-input-number__container">
      <Button :is-icon-button="true" @click="updateValue(-1)" :is-disabled="inputValue <= min">
        <template #c-icon-left>
          <Minus :size="18" />
        </template>
      </Button>
      <InputField v-model="inputValue" :label="false" :placeholder="min" :id="id" :name="name" :type="type" :min="min"
        :max="max" />
      <Button :is-icon-button="true" @click="updateValue(1)" :is-disabled="inputValue >= max">
        <template #c-icon-left>
          <Plus :size="18" />
        </template>
      </Button>
    </div>
  </div>
</template>

<style scoped></style>