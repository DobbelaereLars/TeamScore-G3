<script setup>
import ProfileIcon from '../components/ProfileIcon.vue';
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import socket from '../utils/socket';

const router = useRouter();
const containerRef = ref(null);
const scaleClass = ref('');
const isScrollable = ref(false);
const participantMode = ref('players');

const players = ref([]);

// Scale levels from largest to smallest for smoother transitions
const scaleLevels = [
  '',
  'scale-150', // Slightly smaller
  'scale-140',
  'scale-130', // ~ Old Medium
  'scale-120',
  'scale-110',
  'scale-100', // ~ Old Small
  'scale-90',
  'scale-80', // ~ Old Tiny
  'scale-70', // New smallest
];

const checkOverflow = async () => {
  if (!containerRef.value) return;

  // 1. Determine current level index to start searching from
  let currentIndex = scaleLevels.indexOf(scaleClass.value);
  if (currentIndex === -1) currentIndex = 0;

  // Wait for the DOM to reflect the added player
  await nextTick();

  const el = containerRef.value;
  // Helper to check fit (buffer of 1px for rounding)
  const fits = () => el.scrollHeight <= el.clientHeight + 1;

  // 2. Decide search direction
  if (!fits()) {
    // Case: Overflowing -> We must search SMALLER sizes (downwards)
    isScrollable.value = false; // Disable scroll to try fitting first

    for (let i = currentIndex + 1; i < scaleLevels.length; i++) {
      scaleClass.value = scaleLevels[i];
      await nextTick();

      if (fits()) {
        return;
      }
    }

    // Even smallest didn't fit
    isScrollable.value = true;
  } else {
    // Case: Fits -> We can try LARGER sizes (upwards) to fill space
    // Only necessary if we want to grow back (e.g. players removed)
    isScrollable.value = false;

    for (let i = currentIndex - 1; i >= 0; i--) {
      // Speculatively apply larger size
      scaleClass.value = scaleLevels[i];
      await nextTick();

      if (!fits()) {
        // Too big! Revert to the previous size (i + 1) which worked.
        scaleClass.value = scaleLevels[i + 1];
        return;
      }
    }
    // If we passed the loop, we are at max size (index 0) and it fits.
  }
};

const totalPlayers = computed(() => {
  return players.value.length;
});

const handleNavigate = (data) => {
  if (data.name) {
    router.push({ name: data.name, query: data.params });
  }
};

const handleUpdateParticipants = (data) => {
  // Check if data is array (old format) or object (new format)
  if (Array.isArray(data)) {
    players.value = data;
  } else if (data && typeof data === 'object') {
    players.value = data.list || [];
    if (data.mode) {
      participantMode.value = data.mode;
    }
  }
};

const statusText = computed(() => {
  if (participantMode.value === 'players') {
    return 'Spelers worden nog toegevoegd';
  } else {
    return 'Teams worden nog toegevoegd';
  }
});

const counterText = computed(() => {
  const count = totalPlayers.value;
  if (participantMode.value === 'players') {
    return `${count} speler${count === 1 ? '' : 's'} ...`;
  } else {
    return `${count} team${count === 1 ? '' : 's'} ...`;
  }
});

watch(
  players,
  () => {
    checkOverflow();
  },
  { deep: true, immediate: false },
);

onMounted(async () => {
  socket.on('display:navigate', handleNavigate);
  socket.on('display:update-participants', handleUpdateParticipants);

  // Ask server for latest data immediately on connect
  socket.emit('display:request-participants');

  window.addEventListener('resize', checkOverflow);
  await checkOverflow();
});

onUnmounted(() => {
  socket.off('display:navigate', handleNavigate);
  socket.off('display:update-participants', handleUpdateParticipants);
  window.removeEventListener('resize', checkOverflow);
});
</script>

<template>
  <div class="container c-displayPlayerList">
    <div class="c-displayPlayerList__header">
      <img class="c-displayPlayerList__header__img" src="@/assets/logo.webp" alt="Logo" />
      <div class="c-displayPlayerList__header__text">
        <h1 class="h4">Wachten tot het spel start</h1>
        <p class="h6">{{ statusText }}</p>
      </div>
    </div>
    <div class="c-displayPlayerList__players" :class="[scaleClass, { 'allow-scroll': isScrollable }]"
      ref="containerRef">
      <div class="c-displayPlayerList__players__player" v-for="(player, index) in players"
        :key="`${player.playerName}-${index}`">
        <ProfileIcon :playerName="player.playerName" variant="default" size="extra-large" />
        <p class="h6">{{ player.playerName }}</p>
      </div>
    </div>
    <div class="c-displayPlayerList__footer">
      <p class="h5">{{ counterText }}</p>
    </div>
  </div>
</template>

<style scoped></style>
