<script setup>
import ProfileIcon from '../components/ProfileIcon.vue';
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import socket from '../utils/socket';

const router = useRouter();
const containerRef = ref(null);
const scaleClass = ref('');
const isScrollable = ref(false);

const players = ref([
  { playerName: 'Jhonny Depp' },
  { playerName: 'Jhonny Depp' },
  { playerName: 'Jhonny Depp' },
  { playerName: 'Jhonny Depp' },
  { playerName: 'Jhonny Depp' },
]);

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
        console.log(`Optimized: Shrunk to level "${scaleLevels[i]}"`);
        return;
      }
    }

    // Even smallest didn't fit
    console.log('No fit found, enabling scroll at smallest level');
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
        console.log(`Optimized: Reverted to level "${scaleLevels[i + 1]}"`);
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
  console.log('Received navigate event:', data);
  if (data.name) {
    router.push({ name: data.name });
  }
};

watch(
  players,
  () => {
    checkOverflow();
  },
  { deep: true, immediate: false },
);

onMounted(async () => {
  socket.on('display:navigate', handleNavigate);
  window.addEventListener('resize', checkOverflow);
  await checkOverflow();
});

onUnmounted(() => {
  socket.off('display:navigate', handleNavigate);
  window.removeEventListener('resize', checkOverflow);
});
</script>

<template>
  <div class="container c-displayPlayerList">
    <div class="c-displayPlayerList__header">
      <img
        class="c-displayPlayerList__header__img"
        src="@/assets/logo.webp"
        alt="Logo"
      />
      <div class="c-displayPlayerList__header__text">
        <h1 class="h4">Wachten tot het spel start</h1>
        <p class="h6">Spelers worden nog toegevoegd</p>
      </div>
    </div>
    <div
      class="c-displayPlayerList__players"
      :class="[scaleClass, { 'allow-scroll': isScrollable }]"
      ref="containerRef"
    >
      <div
        class="c-displayPlayerList__players__player"
        v-for="(player, index) in players"
        :key="`${player.playerName}-${index}`"
      >
        <ProfileIcon
          :playerName="player.playerName"
          variant="default"
          size="extra-large"
        />
        <p class="h6">{{ player.playerName }}</p>
      </div>
    </div>
    <div class="c-displayPlayerList__footer">
      <p class="h5">{{ totalPlayers }} spelers ...</p>
    </div>
  </div>
</template>

<style scoped></style>
