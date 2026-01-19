<script setup>
import { ref } from 'vue';
import HostPlayerItem from '../components/HostPlayerItem.vue';

const players = ref([
  { id: 1, name: 'Alice', points: 10, rank: 1 },
  { id: 2, name: 'Bob', points: 8, rank: 2 },
  { id: 3, name: 'Charlie', points: 6, rank: 3 },
  { id: 4, name: 'David', points: 4, rank: 4 },
  { id: 5, name: 'Eve', points: 2, rank: 5 }
]);

const perClick = 2;

const updatePlayerPointsInArray = (playerId, newPoints) => {
  const player = players.value.find(p => p.id === playerId);
  if (player) {
    player.points = newPoints;
  }
};
</script>

<template>
  <div class="container">
    <div class="row">
      <div class="c-player-list">
        <div class="c-player-list__header">

        </div>
        <div class="c-player-list__title">
          <p class="h4">Deelnemers</p>
          <p class="c-player-list__greytext">Klik op + of - om punten toe te voegen of af te trekken, of voeg
            bonuspunten
            toe.</p>
        </div>

        <div class="c-player-list__players">
          <HostPlayerItem v-for="player in players" :key="player.id" :name="player.name" :points="player.points"
            :rank="player.rank" :perClick="perClick"
            @updatePoints="(newPoints) => updatePlayerPointsInArray(player.id, newPoints)" />
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped></style>