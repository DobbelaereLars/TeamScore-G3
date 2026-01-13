<script setup>
import { Dices } from 'lucide-vue-next';

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  name: {
    type: String,
    default: 'tabbar',
  },
});

const getId = (item, index) => item.id ?? `${props.name}-${index}`;
</script>

<template>
  <div class="c-tabbar">
    <div
      v-for="(item, index) in items"
      :key="item.id ?? index"
      class="c-tabbar__wrapper"
    >
      <input
        class="c-tabbar__input u-hide"
        type="radio"
        :name="name"
        :id="getId(item, index)"
        :value="item.value ?? item.id ?? index"
        :checked="item.checked ?? false"
      />

      <label class="c-tabbar__label" :for="getId(item, index)">
        <div class="c-tabbar__label__icon">
          <component :is="item.icon ?? Dices" />
        </div>

        <div class="c-tabbar__label__tekst">
          <p>{{ item.label }}</p>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped></style>
