<script setup>
import ProfileIcon from "../components/ProfileIcon.vue";
import { ref, computed } from "vue";

const players = ref([
  { playerName: "Jhonny Depp" },
  { playerName: "Will Smith" },
  { playerName: "Tom Cruise" },
  { playerName: "Brad Pitt" },
  { playerName: "Leonardo DiCaprio" },
  { playerName: "Robert Downey Jr." },
  { playerName: "Scarlett Johansson" },
  { playerName: "Jennifer Lawrence" },
  { playerName: "Chris Evans" },
  { playerName: "Yarne Diopere" },
]);

const totalPlayers = computed(() => {
  return players.value.length;
});
</script>

<template>
  <div class="c-displayPlayerList">
    <div class="c-displayPlayerList__header">
      <img src="@/assets/logo.webp" alt="Logo" style="height: 7rem" />
      <div class="c-displayPlayerList__header__text">
        <p class="h4">Wachten tot het spel start</p>
        <p class="h6">Spelers worden nog toegevoegd</p>
      </div>
    </div>
    <div class="c-displayPlayerList__players">
      <div
        class="c-displayPlayerList__players__player"
        v-for="player in players"
        :key="player.playerName"
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
