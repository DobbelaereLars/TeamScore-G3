<script setup>
const props = defineProps({
    label: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        default: null
    },
    isActive: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['click']);

const handleClick = () => {
    emit('click');
};
</script>

<template>
    <button class="c-players-setting__tab" :class="{ 'c-players-setting__tab--active': isActive }" @click="handleClick">
        {{ label }}<template v-if="count !== null"> ({{ count }})</template>
    </button>
</template>

<style scoped></style>
