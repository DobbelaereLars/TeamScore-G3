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

const emit = defineEmits(['update:items', 'close', 'change']);

const getId = (item, index) => item.id ?? `${props.name}-${index}`;

const handleClose = (item, event) => {
  event.preventDefault();
  event.stopPropagation();

  const itemId = item.id ?? item;

  // Find the item being closed met actuele checked-state
  const closedItem = props.items.find((i) => i.id === itemId);
  const wasChecked = closedItem?.checked ?? false;

  // Verwijder het item uit de array
  const newItems = props.items.filter((i) => i.id !== itemId);

  // Alleen een andere tab selecteren als de gesloten tab geselecteerd was
  if (wasChecked && newItems.length > 0) {
    // Kies de eerste overblijvende tab als nieuwe geselecteerde
    const updatedItems = newItems.map((i, index) => ({
      ...i,
      checked: index === 0,
    }));
    emit('update:items', updatedItems);
  } else {
    emit('update:items', newItems);
  }

  emit('close', itemId);
};

const handleChange = (item) => {
  const itemId = item.id ?? item.value ?? null;

  // Update de checked-state zodat die altijd overeenkomt met de DOM
  const updatedItems = props.items.map((i) => ({
    ...i,
    checked: i.id === itemId,
  }));

  emit('update:items', updatedItems);
  emit('change', itemId);
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
