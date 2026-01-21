<script setup>
import { X, Pencil } from 'lucide-vue-next';
import ProfileIcon from './ProfileIcon.vue';
import { ref, nextTick, watch } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: 'Speler',
  },
});

const emit = defineEmits(['delete', 'rename']);

const isEditing = ref(false);
const inputRef = ref(null);
const inputValue = ref(props.name);

watch(
  () => props.name,
  (newVal) => {
    inputValue.value = newVal;
  },
);

const handleDelete = () => {
  emit('delete');
};

const startEditing = () => {
  inputValue.value = props.name;
  isEditing.value = true;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
};

const stopEditing = () => {
  if (isEditing.value) {
    if (inputValue.value.trim() && inputValue.value.trim() !== props.name) {
      emit('rename', inputValue.value.trim());
    } else {
      inputValue.value = props.name;
    }
    isEditing.value = false;
  }
};

const cancelEditing = () => {
  inputValue.value = props.name;
  isEditing.value = false;
};
</script>

<template>
  <div class="c-players-setting__participant">
    <ProfileIcon variant="default" :player-name="name" />

    <div class="c-players-setting__participant-content">
      <input
        v-if="isEditing"
        ref="inputRef"
        v-model="inputValue"
        class="c-players-setting__participant-input"
        @blur="stopEditing"
        @keyup.enter="stopEditing"
        @keyup.esc="cancelEditing"
      />
      <p v-else class="c-players-setting__participant-name">
        {{ name }}
      </p>
    </div>

    <div class="c-players-setting__participant-actions">
      <Pencil
        v-if="!isEditing"
        :size="18"
        @click="startEditing"
        class="c-players-setting__participant-action"
      />
      <X
        :size="18"
        @click="handleDelete"
        class="c-players-setting__participant-action c-players-setting__participant-action--delete"
      />
    </div>
  </div>
</template>

<style scoped></style>
