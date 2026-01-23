<script setup>
import { useRouter } from 'vue-router';
import { ref, onMounted, computed } from 'vue';
import Button from '../components/Button.vue';
import SessionCard from '../components/SessionCard.vue';
import Modal from '../components/Modal.vue';
import { Gamepad2, History, Play, RotateCw, Trash2 } from 'lucide-vue-next';
import socket from '../utils/socket';
import { sessionRepository } from '../services/api';

const router = useRouter();
const sessions = ref([]);
const loading = ref(true);

const showStartModal = ref(false);
const selectedSession = ref(null);

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
  if (session.status === 'finished') {
    sessionStorage.setItem('sessionId', session.id);
    router.push(`/tablet/sessions/${session.id}`);
  } else {
    selectedSession.value = session;
    const dialog = document.getElementById('start-resume-modal');
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }
};

const confirmStartResume = () => {
  if (!selectedSession.value) return;

  const session = selectedSession.value;
  sessionStorage.setItem('sessionId', session.id);

  socket.emit('display:navigate', {
    name: 'display-scoreboard',
    params: { sessionId: session.id },
  });

  router.push(`/tablet/game/players`);

  closeModal();
};

const closeModal = () => {
  const dialog = document.getElementById('start-resume-modal');
  if (dialog && typeof dialog.close === 'function') {
    dialog.close();
  }
  selectedSession.value = null;
};

const modalContent = computed(() => {
  if (!selectedSession.value) return { title: '', text: '', btn: '' };

  if (selectedSession.value.status === 'created') {
    return {
      title: 'Spel starten',
      text: `Je staat op het punt om de sessie "${selectedSession.value.name}" te starten. Wil je beginnen met het spel, of wil je deze sessie verwijderen?`,
      btn: 'Start spel',
    };
  } else {
    // in_progress
    return {
      title: 'Spel hervatten',
      text: `Je staat op het punt om de sessie "${selectedSession.value.name}" te hervatten. Wil je verdergaan waar je gebleven was, of wil je deze sessie verwijderen?`,
      btn: 'Hervat spel',
    };
  }
});

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

const deleteSessionModalId = 'delete-session-modal';

const requestDeleteSessionFromModal = () => {
  // Close the start/resume modal
  const startModal = document.getElementById('start-resume-modal');
  if (startModal && typeof startModal.close === 'function') startModal.close();

  // Open the delete confirm modal
  const deleteModal = document.getElementById(deleteSessionModalId);
  if (deleteModal && typeof deleteModal.showModal === 'function') {
    deleteModal.showModal();
  }
};

const confirmDeleteSession = async () => {
  if (!selectedSession.value) return;

  try {
    await sessionRepository.delete(selectedSession.value.id);
    selectedSession.value = null;
    await fetchSessions();
  } catch (err) {
    console.error('Failed to delete session', err);
  }
};

const cancelDeleteSession = () => {
  // Re-open start/resume modal if user cancels?
  // Probably better to just return to list (do nothing special, just close this modal)
  // But if the user cancels DELETION, maybe they still want to Resume?
  // Let's just return to list for simplicity, or re-open the first modal.
  // Re-opening might be intuitive.
  const dialog = document.getElementById('start-resume-modal');
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
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

    <!-- Modal voor Starten/Hervatten -->
    <Modal
      :modal-id="'start-resume-modal'"
      :title="modalContent.title"
      :text="modalContent.text"
    >
      <template #buttons>
        <Button
          variant="secondary"
          button-tekst="Verwijderen"
          @click="requestDeleteSessionFromModal"
          :clickable="false"
        >
          <template #c-btn_icon-left>
            <Trash2 :size="18" />
          </template>
        </Button>
        <Button
          @click="confirmStartResume"
          :button-tekst="modalContent.btn"
          :clickable="false"
          variant="primary"
        />
      </template>
    </Modal>

    <!-- Modal voor Verwijderen -->
    <Modal
      :modal-id="deleteSessionModalId"
      title="Sessie verwijderen?"
      text="Ben je zeker dat je deze sessie wilt verwijderen? Dit kan niet ongedaan gemaakt worden."
      cancel-btn-text="Annuleren"
      accept-btn-text="Verwijderen"
      @cancel="cancelDeleteSession"
      @accept="confirmDeleteSession"
    />
  </div>
</template>

<style scoped></style>
