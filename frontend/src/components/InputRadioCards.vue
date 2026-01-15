<script setup>
import { Dices } from 'lucide-vue-next';

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  name: {
    type: String,
    default: 'radio-cards',
  },
});

const emit = defineEmits(['change']);

const getId = (item, index) => item.id ?? `${props.name}-${index}`;

const handleChange = (item) => {
  emit('change', item.value ?? item.id);
};
</script>

<template>
  <div class="c-input-radio-cards">
    <div
      v-for="(item, index) in items"
      :key="item.id ?? index"
      class="c-input-radio-cards__wrapper"
    >
      <input
        class="c-input-radio-cards__input u-hide"
        type="radio"
        :name="name"
        :id="getId(item, index)"
        :value="item.value ?? item.id ?? index"
        :checked="item.checked ?? false"
        @change="handleChange(item)"
      />
      <label class="c-input-radio-cards__label" :for="getId(item, index)">
        <div class="c-input-radio-cards__label__icon">
          <component :is="item.icon ?? Dices" />
        </div>

        <div class="c-input-radio-cards__label__tekst">
          <p class="u-bold">{{ item.label }}</p>
          <span>{{ item.description }}</span>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
