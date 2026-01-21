<script setup>
import { X } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';
import Button from './Button.vue';

const props = defineProps({
  modalId: {
    type: String,
    required: true,
  },
  cancelBtnText: {
    type: String,
    default: 'Terug',
  },
  acceptBtnText: {
    type: String,
    default: 'Volgende',
  },
  title: {
    type: String,
    default: 'Modal Title',
  },
  text: {
    type: String,
    default: "Hi, I'm a dialog. Notice I have a gray overlay behind me?",
  },
  acceptBtnLink: {
    type: String,
    default: '#',
  },
});

const emit = defineEmits(['accept', 'cancel']);

const dialogRef = ref(null);
let observer = null;

onMounted(() => {
  const dialog = dialogRef.value;
  if (dialog) {
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'open'
        ) {
          if (dialog.hasAttribute('open')) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
          } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
          }
        }
      });
    });

    observer.observe(dialog, { attributes: true });
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
});

const closeDialog = (event) => {
  const dialog = event?.target?.closest('dialog');
  if (dialog && typeof dialog.close === 'function') {
    dialog.close();
  }
};

const handleCancel = (event) => {
  closeDialog(event);
  emit('cancel');
};

const handleAccept = (event) => {
  closeDialog(event);
  emit('accept');
};
</script>

<template>
  <dialog :id="modalId" class="c-modal" ref="dialogRef">
    <button
      class="c-modal__close-x"
      type="button"
      aria-label="close-modal"
      onclick="this.closest('dialog').close()"
    >
      <X :size="18" />
    </button>

    <div class="c-modal__textcontainer">
      <p class="h6">{{ title }}</p>
      <slot>
        <p class="c-modal__text">{{ text }}</p>
      </slot>
    </div>

    <div class="c-modal__btncontainer">
      <Button
        @click="handleCancel"
        :button-tekst="cancelBtnText"
        :clickable="false"
        variant="secondary"
      />
      <Button
        @click="handleAccept"
        :button-tekst="acceptBtnText"
        :href="acceptBtnLink"
        :clickable="false"
        variant="primary"
      />
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
dialog:not([open]) {
  display: none;
}
</style>
