<script setup>
import Button from '../components/Button.vue';
import { ArrowLeft } from 'lucide-vue-next';
</script>

<template>
  <div class="container p-game-setup-view">
    <div class="c-logo-header">
      <img class="c-logo-header__img" src="../assets/logo.webp" alt="Logo" />
    </div>

    <div class="row">
      <div class="col-8 offset-2">
        <div class="p-game-setup-view__settings">
          <div class="p-game-setup-view__settings__head">
            <Button href="/tablet" :is-icon-button="true" variant="secondary">
              <template #c-btn_icon-left>
                <ArrowLeft :size="18" />
              </template>
            </Button>

            <div class="p-game-setup-view__settings__head__title">
              <h1 class="h4">Spelinstellingen</h1>
              <p>Verander hier de instellingen van jouw spel</p>
            </div>
          </div>

          <div class="p-game-setup-view__settings__body"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
