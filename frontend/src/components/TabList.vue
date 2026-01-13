<script setup>
import { Dices, X } from 'lucide-vue-next';

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  name: {
    type: String,
    default: 'tablist',
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

const emit = defineEmits(['close', 'change']);

const getId = (item, index) => item.id ?? `${props.name}-${index}`;

const handleClose = (item, event) => {
  event.preventDefault();
  event.stopPropagation();
  emit('close', item.id ?? item);
};

const handleChange = (item) => {
  emit('change', item.id ?? item.value ?? null);
};
</script>

<template>
  <div class="c-tablist">
    <div
      v-for="(item, index) in items"
      :key="item.id ?? index"
      class="c-tablist__wrapper"
    >
      <input
        class="c-tablist__input u-hide"
        type="radio"
        :name="name"
        :id="getId(item, index)"
        :value="item.value ?? item.id ?? index"
        :checked="item.checked ?? false"
        @change="handleChange(item)"
      />
      <label class="c-tablist__label" :for="getId(item, index)">
        <div v-if="!hideIcon" class="c-tablist__label__icon">
          <component :is="item.icon ?? Dices" :size="20" />
        </div>

        <div class="c-tablist__label__tekst">
          <p>{{ item.label }}</p>
        </div>

        <button
          v-if="closeable"
          class="c-tablist__label__close"
          @click="handleClose(item, $event)"
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
