<script setup>
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import Button from '../components/Button.vue';
import SessionCard from '../components/SessionCard.vue';
import { Gamepad2, History } from 'lucide-vue-next';
import socket from '../utils/socket';
import { sessionRepository } from '../services/api';

const router = useRouter();
const sessions = ref([]);
const loading = ref(true);

// const handleSocketTest = () => {
//   console.log('Sending test-popup event...');
//   socket.emit('test-popup', {
//     message: 'Dit is een test popup vanuit Tablet Home View!',
//   });
// };

const createNewSession = () => {
  // Inform display to go to player list (lobby)
  socket.emit('session-init');
  router.push('/tablet/setup');
};

const fetchSessions = async () => {
  try {
    const response = await sessionRepository.getAll();
    sessions.value = response.data;
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
};

const handleSessionReferal = (session) => {
  sessionStorage.setItem('sessionId', session.id);
  if (session.status === 'finished') {
    router.push(`/tablet/sessions/${session.id}`);
  } else if (session.status === 'in_progress') {
    socket.emit('display:navigate', {
      name: 'display-scoreboard',
      params: { sessionId: session.id },
    });
    router.push(`/tablet/game/players`);
  } else if (session.status === 'created') {
    socket.emit('display:navigate', {
      name: 'display-scoreboard',
      params: { sessionId: session.id },
    });
    router.push(`/tablet/game/players`);
  }
};

const getSubtitle = (session) => {
  const count = session.participant_count || 0;
  let label = '';
  if (session.participant_mode === 'players') {
    label = count === 1 ? 'speler' : 'spelers';
  } else {
    label = count === 1 ? 'team' : 'teams';
  }
  return `${count} ${label}`;
};

onMounted(() => {
  fetchSessions();
});
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

      <Button @click.prevent="createNewSession" button-tekst="Maak een spel">
        <template #c-btn_icon-left>
          <Gamepad2 :size="18" />
        </template>
      </Button>

      <!-- <Button
        class="p-tablet-home-view__socket-test-btn"
        button-tekst="Socket.io test"
        variant="secondary"
        :clickable="false"
        @click.prevent="handleSocketTest"
      >
      </Button> -->
    </div>

    <div class="p-tablet-home-view__body">
      <div class="p-tablet-home-view__history">
        <div class="p-tablet-home-view__history__subtitle">
          <History :size="32"></History>
          <h2 class="h4">Vorige sessies</h2>
        </div>

        <div class="p-tablet-home-view__history__cards">
          <p
            v-if="sessions.length === 0 && !loading"
            class="p-tablet-home-view__history__cards__text"
          >
            Nog geen sessies gestart
          </p>

          <div v-else class="row g-4">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="col-7 col-sm-6 col-md-4 col-lg-3"
            >
              <SessionCard
                :title="`${session.name} - ${formatDate(session.created_at)}`"
                :subtitle="getSubtitle(session)"
                :status="session.status"
                image-src="/podium_screens/podium_screen_ph.webp"
                @click="handleSessionReferal(session)"
              >
                <!-- Optional: Label for status could act as a slot or overlay if SessionCard supported it -->
                <!-- For now, we rely on standard card -->
              </SessionCard>
            </div>
          </div>

          <!-- STATIC CARDS (Commented out) -->
          <!-- 
          <div class="row g-4">
            <div class="col-7 col-sm-6 col-md-4 col-lg-3">
              <SessionCard
                title="Standaardspel - 6/01/2026"
                subtitle="6 teams"
                image-src="/podium_screens/podium_screen_ph.webp"
                href="#"
              />
            </div>
            ...
          </div>
          -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
