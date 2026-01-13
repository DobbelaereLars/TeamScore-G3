<script setup>
import InputNumber from './InputNumber.vue';
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
            <InputNumber min="2" max="10" label="Aantal bonuspunten (voorbeeld)" id="bonuspunten" name="bonuspunten"
                type="number" />
        </div>
    </div>
</template>

<style scoped></style>