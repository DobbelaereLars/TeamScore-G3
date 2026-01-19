<script setup>
import { X } from 'lucide-vue-next';
import Button from './Button.vue';

const props = defineProps({
    modalId: {
        type: String,
        required: true
    },
    cancelBtnText: {
        type: String,
        default: 'Terug'
    },
    acceptBtnText: {
        type: String,
        default: 'Volgende'
    },
    title: {
        type: String,
        default: 'Modal Title'
    },
    text: {
        type: String,
        default: "Hi, I'm a dialog. Notice I have a gray overlay behind me?"
    },
    acceptBtnLink: {
        type: String,
        default: '#'
    }
})

const emit = defineEmits(['accept']);

const handleAccept = (event) => {
    emit('accept');
};
</script>

<template>
    <dialog :id="modalId" class="c-modal">
        <button class="c-modal__close-x" type="button" aria-label="close-modal"
            onclick="this.closest('dialog').close()">
            <X :size="18" />
        </button>

        <div class="c-modal__textcontainer">
            <p class="h6">{{ title }}</p>
            <p class="c-modal__text">{{ text }}</p>
        </div>

        <div class="c-modal__btncontainer">
            <Button @click="$el.closest('dialog').close()" :button-tekst="cancelBtnText" :clickable="false"
                variant="secondary" />
            <Button v-if="acceptBtnLink !== '#'" :button-tekst="acceptBtnText" :href="acceptBtnLink"
                variant="primary" />
            <Button v-else @click="handleAccept" :button-tekst="acceptBtnText" :clickable="false" variant="primary" />
        </div>
    </dialog>
</template>

<style lang="scss" scoped>
dialog:not([open]) {
    display: none;
}
</style>