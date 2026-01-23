<script setup>
import { Dices, X } from 'lucide-vue-next';

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
  closeable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['change', 'close']);

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
        :disabled="item.disabled ?? false"
        @change="handleChange(item)"
      />

      <label class="c-tabbar__label" :for="getId(item, index)">
        <div v-if="!hideIcon" class="c-tabbar__label__icon">
          <component :is="item.icon ?? Dices" :size="20" />
        </div>

        <div class="c-tabbar__label__tekst">
          <p>{{ item.label }}</p>
        </div>

        <button
          v-if="closeable"
          class="c-tabbar__label__close"
          @click="
            (event) => {
              event.preventDefault();
              event.stopPropagation();
              emit('close', item.id);
            }
          "
          type="button"
          aria-label="Close tab"
        >
          <X :size="14" />
        </button>
      </label>
    </div>
  </div>
</template>

<style scoped></style>
