<script setup>
import { ref, computed, watch } from 'vue';
import { Plus, Users } from 'lucide-vue-next';
import Button from './Button.vue';
import InputField from './InputField.vue';
import TeamTabButton from './TeamTabButton.vue';
import PlayersSettingParticipant from './PlayersSettingParticipant.vue';
import Modal from './Modal.vue';

const props = defineProps({
  playerMode: {
    type: String,
    default: 'players',
    validator: (value) =>
      ['players', 'teams', 'teams-with-players'].includes(value),
  },
});

const participants = defineModel('participants', { default: [] });
const inputValue = ref('');
const selectedTeamId = ref(null);
const teamToDeleteId = ref(null);
const deleteTeamModalId = 'delete-team-modal';
const deleteTeamModalTitle = ref('Team verwijderen?');

const nextId = computed(() => {
  if (participants.value.length === 0) return 1;
  const maxId = Math.max(...participants.value.map((p) => p.id));
  return maxId + 1;
});

const selectedTeam = computed(() =>
  participants.value.find((t) => t.id === selectedTeamId.value),
);

const placeholder = computed(() => {
  if (props.playerMode === 'teams-with-players')
    return `Speler toevoegen aan ${selectedTeam.value?.name}...`;
  if (props.playerMode === 'teams') return 'Team naam...';
  return 'Speler naam...';
});

const buttonText = computed(() => {
  if (props.playerMode === 'teams') return 'Team toevoegen';
  return 'Speler toevoegen';
});

const addPlayer = () => {
  if (!inputValue.value.trim()) return;

  if (props.playerMode === 'teams-with-players') {
    if (!selectedTeamId.value) return;

    const teamIndex = participants.value.findIndex(
      (t) => t.id === selectedTeamId.value,
    );

    if (teamIndex !== -1) {
      const team = participants.value[teamIndex];
      const currentPlayers = team.players || [];
      const newPlayerId =
        currentPlayers.length > 0
          ? Math.max(...currentPlayers.map((p) => p.id)) + 1
          : 1;

      const updatedTeam = {
        ...team,
        players: [
          ...currentPlayers,
          {
            id: newPlayerId,
            name: inputValue.value.trim(),
          },
        ],
      };

      const newParticipants = [...participants.value];
      newParticipants[teamIndex] = updatedTeam;
      participants.value = newParticipants;
    }
  } else {
    participants.value = [
      ...participants.value,
      {
        id: nextId.value,
        name: inputValue.value.trim(),
      },
    ];
  }

  inputValue.value = '';
};

const addTeam = () => {
  const teamNumber = participants.value.length + 1;
  const newTeam = {
    id: nextId.value,
    name: `Team ${teamNumber}`,
    players: [],
  };
  participants.value = [...participants.value, newTeam];
  selectedTeamId.value = newTeam.id;
};

const deleteParticipant = (playerId) => {
  participants.value = participants.value.filter((p) => p.id !== playerId);
};

const deletePlayerFromTeam = (playerId) => {
  if (selectedTeamId.value) {
    const teamIndex = participants.value.findIndex(
      (t) => t.id === selectedTeamId.value,
    );
    if (teamIndex !== -1) {
      const team = participants.value[teamIndex];
      if (team.players) {
        const updatedPlayers = team.players.filter((p) => p.id !== playerId);
        const updatedTeam = { ...team, players: updatedPlayers };
        const newParticipants = [...participants.value];
        newParticipants[teamIndex] = updatedTeam;
        participants.value = newParticipants;
      }
    }
  }
};

const requestDeleteTeam = (teamId) => {
  teamToDeleteId.value = teamId;
  const team = participants.value.find((t) => t.id === teamId);
  deleteTeamModalTitle.value = team ? `${team.name} verwijderen?` : 'Team verwijderen?';

  const dialog = document.getElementById(deleteTeamModalId);
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
};

const confirmDeleteTeam = () => {
  if (!teamToDeleteId.value) return;

  const index = participants.value.findIndex(
    (t) => t.id === teamToDeleteId.value,
  );

  if (index !== -1) {
    // Remove team
    const newParticipants = [...participants.value];
    newParticipants.splice(index, 1);
    participants.value = newParticipants;

    // Update selectedTeamId if we removed the selected one
    if (selectedTeamId.value === teamToDeleteId.value) {
      if (newParticipants.length > 0) {
        // Select previous or first
        const newIndex = Math.max(0, index - 1);
        const safeIndex = Math.min(newIndex, newParticipants.length - 1);
        selectedTeamId.value = newParticipants[safeIndex].id;
      } else {
        selectedTeamId.value = null;
      }
    }
  }

  teamToDeleteId.value = null;
};

const cancelDeleteTeam = () => {
  teamToDeleteId.value = null;
};

const renameTeam = (teamId, newName) => {
  const index = participants.value.findIndex((t) => t.id === teamId);
  if (index !== -1) {
    const updatedTeam = { ...participants.value[index], name: newName };
    const newParticipants = [...participants.value];
    newParticipants[index] = updatedTeam;
    participants.value = newParticipants;
  }
};

// Watch for mode changes to ensure a team is selected when switching to 'teams-with-players'
watch(
  () => props.playerMode,
  (newMode) => {
    if (newMode === 'teams-with-players') {
      if (!selectedTeamId.value && participants.value.length > 0) {
        selectedTeamId.value = participants.value[0].id;
      }
    }
  },
  { immediate: true },
);

const TeamRadioButtons = [];
</script>

<template>
  <div class="c-players-setting">
    <div class="c-players-setting__header">
      <div class="c-players-setting__intro">
        <div class="c-players-setting__intro__tekst">
          <h2 class="h6">Deelnemers</h2>

          <p>Beheer de deelnemers voor de geselecteerde modus.</p>
        </div>

        <!-- Input voor spelers/teams toevoegen -->
        <div
          v-if="playerMode !== 'teams-with-players' || selectedTeamId"
          class="c-players-setting__input"
        >
          <InputField
            v-model="inputValue"
            id="player-add"
            name="player-add"
            :label="false"
            :placeholder="placeholder"
            @keyup.enter="addPlayer"
          />
          <Button
            :button-tekst="buttonText"
            :clickable="false"
            @click="addPlayer"
          >
            <template #c-btn_icon-left>
              <Plus :size="18" />
            </template>
          </Button>
        </div>
      </div>

      <!-- Teams tabs (alleen bij teams-with-players mode) -->
      <div
        v-if="playerMode === 'teams-with-players'"
        class="c-players-setting__tabs-wrapper"
      >
        <div class="c-players-setting__tabs">
          <TeamTabButton
            v-for="team in participants"
            :key="team.id"
            :label="team.name"
            :count="team.players?.length || 0"
            :is-active="selectedTeamId === team.id"
            :closeable="true"
            :editable="playerMode === 'teams-with-players'"
            @click="selectedTeamId = team.id"
            @close="requestDeleteTeam(team.id)"
            @rename="(newName) => renameTeam(team.id, newName)"
          />
          <button
            type="button"
            class="c-players-setting__tab c-players-setting__tab--add"
            @click="addTeam"
          >
            <Plus :size="18" />
            Team toevoegen
          </button>
        </div>

        <!-- Spelers lijst van geselecteerd team -->
        <div v-if="selectedTeamId" class="c-players-setting__players-list">
          <PlayersSettingParticipant
            v-for="player in selectedTeam?.players || []"
            :key="player.id"
            :name="player.name"
            @delete="deletePlayerFromTeam(player.id)"
          />
          <div
            v-if="!selectedTeam?.players?.length"
            class="c-players-setting__emptylist"
          >
            <p>
              Er zijn nog geen spelers toegevoegd aan {{ selectedTeam?.name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Spelers lijst (bij players mode) -->
      <div
        v-if="playerMode === 'players' && participants.length > 0"
        class="c-players-setting__players-list"
      >
        <PlayersSettingParticipant
          v-for="player in participants"
          :key="player.id"
          :name="player.name"
          @delete="deleteParticipant(player.id)"
        />
      </div>

      <!-- Teams lijst (bij teams mode) -->
      <div
        v-if="playerMode === 'teams' && participants.length > 0"
        class="c-players-setting__players-list"
      >
        <PlayersSettingParticipant
          v-for="team in participants"
          :key="team.id"
          :name="team.name"
          @delete="deleteParticipant(team.id)"
        />
      </div>

      <!-- Empty state -->
      <div
        v-if="participants.length === 0"
        class="c-players-setting__emptylist"
      >
        <Users :size="22" />
        <p v-if="playerMode === 'teams-with-players'">
          Voeg eerst een team toe
        </p>
        <div class="c-players-setting__emptycontainer" v-else>
          <p>
            Er zijn nog geen
            {{ playerMode === 'players' ? 'spelers' : 'teams' }} toegevoegd
          </p>
          <p
            v-if="playerMode === 'players'"
            class="c-players-setting__csv-upload"
          >
            + Voeg een CSV bestand toe
          </p>
        </div>
      </div>
    </div>

    <Modal
      :modal-id="deleteTeamModalId"
      :title="deleteTeamModalTitle"
      text="Weet je zeker dat je dit team wil verwijderen? Alle spelers in dit team zullen ook verwijderd worden. Deze actie kan niet ongedaan worden gemaakt."
      cancel-btn-text="Annuleren"
      accept-btn-text="Verwijderen"
      @cancel="cancelDeleteTeam"
      @accept="confirmDeleteTeam"
    />
  </div>
</template>

<style scoped></style>
