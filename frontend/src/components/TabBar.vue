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
  hideIcon: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['change']);

const getId = (item, index) => item.id ?? `${props.name}-${index}`;

const handleChange = (item) => {
  emit('change', item.value ?? item.id);
};
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
        @change="handleChange(item)"
      />

      <label class="c-tabbar__label" :for="getId(item, index)">
        <div v-if="!hideIcon" class="c-tabbar__label__icon">
          <component :is="item.icon ?? Dices" :size="20" />
        </div>

        <div class="c-tabbar__label__tekst">
          <p>{{ item.label }}</p>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped></style>
