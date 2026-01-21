<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    modelValue: {
        type: Number,
        default: 0,
    },
});

const emit = defineEmits(['update:modelValue']);

// Local state for inputs
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
const milliseconds = ref(0);

// Parse seconds (float) to Time Components
const parseTime = (totalSeconds) => {
    // Handle null/undefined/NaN
    const val = Number(totalSeconds);
    if (isNaN(val)) {
        hours.value = 0;
        minutes.value = 0;
        seconds.value = 0;
        milliseconds.value = 0;
        return;
    }

    hours.value = Math.floor(val / 3600);
    minutes.value = Math.floor((val % 3600) / 60);
    seconds.value = Math.floor(val % 60);
    // Handle floating point precision issues for MS
    milliseconds.value = Math.round((val % 1) * 1000);
};

// Initial parse
parseTime(props.modelValue);

const calculateTotalSeconds = () => {
    return (
        (Number(hours.value) || 0) * 3600 +
        (Number(minutes.value) || 0) * 60 +
        (Number(seconds.value) || 0) +
        (Number(milliseconds.value) || 0) / 1000
    );
};

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
    // Only update if the calculated total differs significantly (to avoid cursor jumping)
    const currentTotal = calculateTotalSeconds();
    if (Math.abs(currentTotal - newVal) > 0.001) {
        parseTime(newVal);
    }
});

const update = () => {
    // Enforce limits
    if (hours.value < 0) hours.value = 0;

    if (minutes.value > 60) minutes.value = 60;
    if (minutes.value < 0) minutes.value = 0;

    if (seconds.value > 60) seconds.value = 60;
    if (seconds.value < 0) seconds.value = 0;

    if (milliseconds.value > 999) milliseconds.value = 999;
    if (milliseconds.value < 0) milliseconds.value = 0;

    const total = calculateTotalSeconds();
    emit('update:modelValue', total);
};

</script>

<template>
    <div class="c-input-time">
        <div class="c-input-time__group">
            <input type="number" v-model="hours" @input="update" min="0" class="c-input-time__input" placeholder="00" />
            <span class="c-input-time__label">u</span>
        </div>
        <span class="c-input-time__separator">:</span>

        <div class="c-input-time__group">
            <input type="number" v-model="minutes" @input="update" min="0" max="60" class="c-input-time__input"
                placeholder="00" />
            <span class="c-input-time__label">m</span>
        </div>
        <span class="c-input-time__separator">:</span>

        <div class="c-input-time__group">
            <input type="number" v-model="seconds" @input="update" min="0" max="60" class="c-input-time__input"
                placeholder="00" />
            <span class="c-input-time__label">s</span>
        </div>
        <span class="c-input-time__separator">.</span>

        <div class="c-input-time__group">
            <input type="number" v-model="milliseconds" @input="update" min="0" max="999"
                class="c-input-time__input c-input-time__input--ms" placeholder="000" />
            <span class="c-input-time__label">ms</span>
        </div>
    </div>
</template>

<style scoped></style>