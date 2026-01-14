<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import socket from '../utils/socket';

const showPopup = ref(false);
const popupMessage = ref('');

const handleShowPopup = (data) => {
  console.log('Received show-popup event:', data);
  popupMessage.value = data.message;
  showPopup.value = true;

  // Auto-hide na 3 seconden
  setTimeout(() => {
    showPopup.value = false;
  }, 3000);
};

onMounted(() => {
  socket.on('show-popup', handleShowPopup);
});

onUnmounted(() => {
  socket.off('show-popup', handleShowPopup);
});
</script>

<template>
  <div class="container p-display-splash-view">
    <img
      class="p-display-splash-view__logo"
      src="../assets/logo.webp"
      alt="Logo"
    />
    <h1 class="p-display-splash-view__title h3">Wachten op een sessie...</h1>

    <!-- Socket.io test popup -->
    <Transition name="popup">
      <div v-if="showPopup" class="p-display-splash-view__popup">
        <p>{{ popupMessage }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped></style>
