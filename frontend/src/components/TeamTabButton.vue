<script setup>
import { X } from 'lucide-vue-next';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  closeable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click', 'close']);

const handleClick = () => {
  emit('click');
};

const handleClose = (event) => {
  event.stopPropagation();
  emit('close');
};
</script>

<template>
  <button
    class="c-players-setting__tab"
    :class="{ 'c-players-setting__tab--active': isActive }"
    @click="handleClick"
  >
    <span
      >{{ label
      }}<template v-if="count !== null"> ({{ count }})</template></span
    >

    <div
      v-if="closeable"
      class="c-players-setting__tab__close"
      @click="handleClose"
      role="button"
      aria-label="Sluit tab"
    >
      <X :size="14" />
    </div>
  </button>
</template>

<style scoped></style>
