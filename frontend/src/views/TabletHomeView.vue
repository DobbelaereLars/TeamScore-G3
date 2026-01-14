<script setup>
import Button from '../components/Button.vue';
import SessionCard from '../components/SessionCard.vue';
import { Gamepad2, History } from 'lucide-vue-next';
</script>

<template>
  <div class="container p-tablet-home-view">
    <div class="p-tablet-home-view__head">
      <img class="p-tablet-home-view__logo" src="../assets/logo.webp" alt="" />

      <p class="p-tablet-home-view__subtitle">
        Het digitale scorebord voor teambuildings, sportieve challenges en
        groepsactiviteiten.<br />Start snel, hou punten live bij en maak elke
        ronde meteen zichtbaar.
      </p>

      <Button href="/tablet/game/settings" button-tekst="Maak een spel">
        <template #c-btn_icon-left>
          <Gamepad2 :size="18" />
        </template>
      </Button>
    </div>

    <div class="p-tablet-home-view__body">
      <div class="p-tablet-home-view__history">
        <div class="p-tablet-home-view__history__subtitle">
          <History :size="32"></History>
          <h2 class="h4">Vorige sessies</h2>
        </div>

        <div class="p-tablet-home-view__history__cards">
          <!-- <p class="p-tablet-home-view__history__cards__text">
            Nog geen sessies gestart
          </p> -->

          <div class="row g-4">
            <div class="col-7 col-sm-6 col-md-4 col-lg-3">
              <SessionCard
                title="Standaardspel - 6/01/2026"
                subtitle="6 teams"
                image-src="/podium_screens/podium_screen_ph.png"
                href="#"
              />
            </div>

            <div class="col-7 col-sm-6 col-md-4 col-lg-3">
              <SessionCard
                title="Battle Royale - 10/01/2026"
                subtitle="4 teams"
                image-src="/podium_screens/podium_screen_ph.png"
                href="#"
              />
            </div>

            <div class="col-7 col-sm-6 col-md-4 col-lg-3">
              <SessionCard
                title="Toernooi - 12/01/2026"
                subtitle="8 teams"
                image-src="/podium_screens/podium_screen_ph.png"
                href="#"
              />
            </div>

            <div class="col-7 col-sm-6 col-md-4 col-lg-3">
              <SessionCard
                title="Sprint Challenge"
                subtitle="3 teams"
                image-src="/podium_screens/podium_screen_ph.png"
                href="#"
              />
            </div>

            <div class="col-7 col-sm-6 col-md-4 col-lg-3">
              <SessionCard
                title="Finaleavond"
                subtitle="5 teams"
                image-src="/podium_screens/podium_screen_ph.png"
                href="#"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
