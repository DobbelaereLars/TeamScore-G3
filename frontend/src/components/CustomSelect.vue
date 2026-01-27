<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps({
    modelValue: {
        type: [String, Number],
        required: true
    },
    options: {
        type: Array,
        required: true
    },
    labelKey: {
        type: String,
        default: 'label'
    },
    valueKey: {
        type: String,
        default: 'value'
    }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const windowWidth = ref(window.innerWidth);

const selectedOption = computed(() => {
    return props.options.find(option => option[props.valueKey] === props.modelValue);
});

const displayText = computed(() => {
    if (!selectedOption.value) return 'Selecteer...';
    const text = selectedOption.value[props.labelKey];
    const isSmallerThanMd = windowWidth.value < 992;
    return (isSmallerThanMd && text.length > 12) ? text.substring(0, 12) + '...' : text;
});

const selectOption = (option) => {
    emit('update:modelValue', option[props.valueKey]);
    isOpen.value = false;
};

const toggleDropdown = () => {
    isOpen.value = !isOpen.value;
};

// Sluit dropdown wanneer er buiten geklikt wordt
const closeDropdown = (event) => {
    if (!event.target.closest('.c-custom-select')) {
        isOpen.value = false;
    }
};

const handleResize = () => {
    windowWidth.value = window.innerWidth;
};

// Voeg event listener toe wanneer component mount
onMounted(() => {
    document.addEventListener('click', closeDropdown);
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    document.removeEventListener('click', closeDropdown);
    window.removeEventListener('resize', handleResize);
});
</script>

<template>
    <div class="c-custom-select">
        <button type="button" class="c-custom-select__trigger h2" @click="toggleDropdown">
            <span>{{ displayText }}</span>
            <ChevronDown :size="24" :class="['c-custom-select__icon', { 'c-custom-select__icon--open': isOpen }]" />
        </button>

        <Transition name="dropdown">
            <div v-if="isOpen" class="c-custom-select__dropdown">
                <button v-for="option in options" :key="option[valueKey]" type="button"
                    class="c-custom-select__option h6"
                    :class="{ 'c-custom-select__option--selected': option[valueKey] === modelValue }"
                    @click="selectOption(option)">
                    {{ option[labelKey] }}
                </button>
            </div>
        </Transition>
    </div>
</template>

<style scoped lang="scss">
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px);
}
</style>
