<script setup>
import { Minus, Plus, Check, X } from 'lucide-vue-next';
import Button from './Button.vue';
import ProfileIcon from './ProfileIcon.vue';
import InputTime from './InputTime.vue';
import { ref, watch, computed } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: 'Speler',
  },
  points: {
    type: Number,
    default: 0,
  },
  value: {
    type: [Number, Boolean],
    default: 0,
  },
  scoreType: {
    type: String,
    default: 'points', // points, time, boolean
  },
  rank: {
    type: Number,
    default: 99,
  },
  perClick: {
    type: Number,
    default: 1,
  },
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'large', 'extra-large'].includes(value),
  },
});

const emit = defineEmits(['updatePoints', 'updateScore']);

const displayName = computed(() => {
  const validName = props.name || '';
  if (validName.length > 15) {
    return validName.substring(0, 15) + '...';
  }
  return validName;
});

// Local state for inputs (especially time)
const localValue = ref(props.value);

watch(
  () => props.value,
  (newVal) => {
    localValue.value = newVal;
  },
);

// Points Logic
const increasePoints = () => {
  const val = props.points !== undefined ? props.points : props.value;
  const newVal = val + props.perClick;
  emit('updatePoints', newVal);
  emit('updateScore', newVal);
};

const decreasePoints = () => {
  const val = props.points !== undefined ? props.points : props.value;
  const calculatedVal = val - props.perClick;
  // Prevent negative scores
  const newVal = calculatedVal < 0 ? 0 : calculatedVal;

  emit('updatePoints', newVal);
  emit('updateScore', newVal);
};

// Time Logic
const updateTime = (newVal) => {
  emit('updateScore', Number(newVal));
};

// Boolean Logic
const setBoolean = (boolVal) => {
  emit('updateScore', boolVal ? 1 : 0);
};
</script>

<template>
  <div
    class="c-host-player-item"
    :class="{
      'c-host-player-item--time': scoreType === 'time',
      'c-host-player-item--boolean': scoreType === 'boolean',
    }"
  >
    <div class="c-host-player-item__playercontainer">
      <div class="c-host-player-item__profile">
        <ProfileIcon variant="default" :size="size" :player-name="name" />
        <span class="c-host-player-item__rank">#{{ rank }}</span>
      </div>

      <div class="c-host-player-item__playerinfo">
        <p class="h5" :title="name">{{ displayName }}</p>

        <!-- Points View Display -->
        <div v-if="scoreType === 'points'" class="c-host-player-item__points">
          <span class="h4 c-host-player-item__points--value">{{ points }}</span>
          <p class="c-host-player-item__points--label">punten</p>
        </div>

        <!-- Boolean Display -->
        <div v-if="scoreType === 'boolean'" class="c-host-player-item__points">
          <span class="c-host-player-item__points--value">
            <Check v-if="value === 1" :size="18" class="text-success" />
            <X v-else :size="18" class="text-danger" />
            <p>{{ value === 1 ? 'Voltooid' : 'Niet voltooid' }}</p>
          </span>
        </div>
      </div>
    </div>

    <div class="c-host-player-item__buttons">
      <!-- Points Controls -->
      <template v-if="scoreType === 'points'">
        <Button
          :is-icon-button="true"
          :clickable="false"
          variant="primary"
          @click="increasePoints"
        >
          <template #c-btn_icon-left>
            <Plus :size="18" />
          </template>
        </Button>
        <Button
          :is-icon-button="true"
          :clickable="false"
          variant="secondary"
          @click="decreasePoints"
        >
          <template #c-btn_icon-left>
            <Minus :size="18" />
          </template>
        </Button>
      </template>

      <!-- Time Controls -->
      <template v-else-if="scoreType === 'time'">
        <div class="c-host-player-item__input-wrapper">
          <InputTime
            :modelValue="Number(value)"
            @update:modelValue="updateTime"
          />
        </div>
      </template>

      <!-- Boolean Controls -->
      <template v-else-if="scoreType === 'boolean'">
        <Button
          :is-icon-button="true"
          :clickable="false"
          variant="secondary"
          @click="setBoolean(true)"
          :class="{ 'is-active': value === 1 }"
          class="u-text-success"
        >
          <template #c-btn_icon-left>
            <Check :size="18" />
          </template>
        </Button>
        <Button
          :is-icon-button="true"
          :clickable="false"
          variant="secondary"
          @click="setBoolean(false)"
          class="u-text-danger"
        >
          <template #c-btn_icon-left>
            <X :size="18" />
          </template>
        </Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.text-success {
  color: var(--color-success, #28a745);
}

.text-danger {
  color: var(--color-danger, #dc3545);
}

.u-text-success {
  color: var(--color-success, #28a745);
}

.u-text-danger {
  color: var(--color-danger, #dc3545);
}

u-flex-center {
  display: flex;
  align-items: center;
}
</style>
