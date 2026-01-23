<script setup>
import { X, Pencil } from 'lucide-vue-next';
import { ref, nextTick } from 'vue';

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
  editable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click', 'close', 'rename']);

const isEditing = ref(false);
const editInput = ref(null);
const editValue = ref('');

const handleClick = () => {
  if (!isEditing.value) {
    emit('click');
  }
};

const handleClose = (event) => {
  event.stopPropagation();
  emit('close');
};

const startEditing = (event) => {
  event.stopPropagation();
  editValue.value = props.label;
  isEditing.value = true;
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus();
      editInput.value.select();
    }
  });
};

const stopEditing = () => {
  if (isEditing.value) {
    if (editValue.value.trim() && editValue.value !== props.label) {
      emit('rename', editValue.value.trim());
    }
    isEditing.value = false;
  }
};
</script>

<template>
  <button
    type="button"
    class="c-players-setting__tab"
    :class="{ 'c-players-setting__tab--active': isActive }"
    @click="handleClick"
  >
    <div v-show="isEditing" class="c-players-setting__tab__edit-wrapper">
      <input
        ref="editInput"
        v-model="editValue"
        class="c-players-setting__tab__edit-input"
        @blur="stopEditing"
        @keyup.enter="stopEditing"
        @click.stop
      />
    </div>

    <span v-show="!isEditing"
      >{{ label
      }}<template v-if="count !== null"> ({{ count }})</template></span
    >

    <div class="c-players-setting__tab__actions">
      <div
        v-if="editable && isActive && !isEditing"
        class="c-players-setting__tab__icon"
        @click="startEditing"
        role="button"
        aria-label="Wijzig naam"
      >
        <Pencil :size="12" />
      </div>

      <div
        v-if="closeable && !isEditing"
        class="c-players-setting__tab__icon"
        @click="handleClose"
        role="button"
        aria-label="Sluit tab"
      >
        <X :size="14" />
      </div>
    </div>
  </button>
</template>

<style scoped></style>
