<script setup>
import Button from '../components/Button.vue';
import { Gamepad2 } from 'lucide-vue-next';
</script>

<template>
  <div class="container p-tablet-home-view">
    <div class="p-tablet-home-view__head">
      <img class="p-tablet-home-view__logo" src="../assets/logo.webp" alt="" />

      <p class="p-tablet-home-view__subtitle">
        Het digitale scorebord voor teambuildings, sportieve challenges en
        groepsactiviteiten.<br>Start snel, hou punten live bij en maak elke ronde
        meteen zichtbaar.
      </p>

      <Button href="/tablet/game/settings" button-tekst="Maak een spel">
        <template #c-btn_icon-left>
          <Gamepad2 :size="18" />
        </template>
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
