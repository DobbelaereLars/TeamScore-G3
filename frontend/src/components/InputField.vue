<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { //nodig voor v-model
    type: [String, Number],
    default: "",
  },
  label: {
    type: [String, Boolean],
    default: "Input label",
  },
  placeholder: {
    type: String,
    default: "Input placeholder",
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
    type: [String, Number],
    default: null,
  },
  max: {
    type: [String, Number],
    default: null,
  },
});

const labelText = computed(() => {
  if (props.label === false) return "";
  if (typeof props.label === "string" && props.label !== "") return props.label;
  return "Input label";
});

const emit = defineEmits(["update:modelValue"]); //nodig voor v-model

const onChange = (e) => {
  if (props.type !== 'number') return;
  let v = Number(e.target.value);
  if (Number.isNaN(v)) return;

  if (v < props.min) v = props.min;
  if (v > props.max) v = props.max;

  emit("update:modelValue", v);
};
</script>

<template>
  <div :class="'c-input-field' + (type === 'number' ? ' c-input-field--number' : '')">
    <label v-if="labelText" :for="id">{{ labelText }}</label>
    <input :id="id" :name="name"
      :class="'c-input-field__input' + (type === 'number' ? ' c-input-field__input--number' : '')" :type="type"
      :placeholder="placeholder" v-bind="type === 'number' ? { min: props.min, max: props.max } : {}"
      :value="modelValue" @input="emit('update:modelValue', $event.target.value)" @change="onChange" />
    <!-- stuurt de waarde terug bij v-model -->
  </div>
</template>

<style scoped></style>
