<script setup>
import InputField from './InputField.vue';
import Toggle from './Toggle.vue';
import { ref } from 'vue';

defineProps({
    inputId: String
});

const isChecked = ref(false);
</script>

<template>
    <div>
        <Toggle :inputId="inputId" @change="isChecked = !isChecked" />
        <div class="c-toggle__dropdown" :class="{ 'c-toggle__dropdown--active': isChecked }">
        </div>
    </div>
</template>

<style scoped></style>