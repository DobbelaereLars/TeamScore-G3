<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import socket from "../utils/socket";

const router = useRouter();
const showPopup = ref(false);
const popupMessage = ref("");

const handleShowPopup = (data) => {
  console.log("Received show-popup event:", data);
  popupMessage.value = data.message;
  showPopup.value = true;

  // Auto-hide na 3 seconden
  setTimeout(() => {
    showPopup.value = false;
  }, 3000);
};

const handleNavigate = (data) => {
  console.log("Received navigate event:", data);
  if (data.name) {
    router.push({ name: data.name, query: data.params });
  }
};

onMounted(() => {
  // Clear any previous session data when returning to splash screen
  sessionStorage.clear();
  console.log("Display session storage cleared");

  socket.on("show-popup", handleShowPopup);
  socket.on("display:navigate", handleNavigate);
});

onUnmounted(() => {
  socket.off("show-popup", handleShowPopup);
  socket.off("display:navigate", handleNavigate);
});
</script>

<template>
  <div class="container p-display-splash-view">
    <img
      class="p-display-splash-view__logo"
      src="../assets/logo.webp"
      alt="Logo"
    />
    <h1 class="p-display-splash-view__title h3">
      Wachten op een sessie<span class="dot">.</span><span class="dot">.</span
      ><span class="dot">.</span>
    </h1>

    <!-- Socket.io test popup -->
    <Transition name="popup">
      <div v-if="showPopup" class="p-display-splash-view__popup">
        <p>{{ popupMessage }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped></style>
