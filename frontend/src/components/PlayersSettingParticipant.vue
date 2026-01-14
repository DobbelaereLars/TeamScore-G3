<script setup>
import { X } from 'lucide-vue-next';
import ProfileIcon from './ProfileIcon.vue';

const props = defineProps({
    name: {
        type: String,
        default: 'Speler',
    },
});

const emit = defineEmits(['delete']);

const handleDelete = () => {
    emit('delete');
};
</script>

<template>
    <div class="c-players-setting__participant">
        <ProfileIcon variant="default" :player-name="name" />
        <p>{{ name }}</p>
        <X :size="18" @click="handleDelete" class="c-players-setting__participant-delete-x" />
    </div>
</template>

<style scoped></style>
