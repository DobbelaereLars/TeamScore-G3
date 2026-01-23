<script setup>
import { ref, computed, watch } from 'vue';
import { Plus, Users, Upload } from 'lucide-vue-next';
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

const errorModalId = 'error-modal';
const uploadErrorMessage = ref('');

const nextId = computed(() => {
  if (!participants.value || participants.value.length === 0) return 1;

  // Robust ID calculation: parsInt + filter NaN
  const ids = participants.value
    .map((p) => parseInt(p.id, 10))
    .filter((id) => !isNaN(id));

  if (ids.length === 0) return 1;

  // Use a fallback for Math.max on empty set just in case, though checked above
  const maxId = Math.max(...ids);
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

const getNextDefaultName = (prefix, list) => {
  let maxIndex = 0;
  const regex = new RegExp(`^${prefix} (\\d+)$`);

  for (const item of list) {
    const match = item.name.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIndex) {
        maxIndex = num;
      }
    }
  }

  // Als er nog geen genummerde namen zijn, kijken we naar de lengte voor een logische start
  // Bijv: heb je al 3 spelers met custom namen, dan is "Speler 4" logischer dan "Speler 1"
  if (maxIndex === 0 && list.length > 0) {
    return `${prefix} ${list.length + 1}`;
  }

  return `${prefix} ${maxIndex + 1}`;
};

const addPlayer = () => {
  let nameToAdd = inputValue.value.trim();

  if (props.playerMode === 'teams-with-players') {
    if (!selectedTeamId.value) return;

    const teamIndex = participants.value.findIndex(
      (t) => t.id === selectedTeamId.value,
    );

    if (teamIndex !== -1) {
      const team = participants.value[teamIndex];
      const currentPlayers = team.players || [];

      if (!nameToAdd) {
        nameToAdd = getNextDefaultName('Speler', currentPlayers);
      }

      const newPlayerId =
        currentPlayers.length > 0
          ? Math.max(...currentPlayers.map((p) => parseInt(p.id, 10) || 0)) + 1
          : 1;

      const updatedTeam = {
        ...team,
        players: [
          ...currentPlayers,
          {
            id: newPlayerId,
            name: nameToAdd,
            isNew: true,
          },
        ],
      };

      const newParticipants = [...participants.value];
      newParticipants[teamIndex] = updatedTeam;
      participants.value = newParticipants;
    }
  } else {
    if (!nameToAdd) {
      if (props.playerMode === 'teams') {
        nameToAdd = getNextDefaultName('Team', participants.value);
      } else {
        nameToAdd = getNextDefaultName('Speler', participants.value);
      }
    }

    participants.value = [
      ...participants.value,
      {
        id: nextId.value,
        name: nameToAdd,
        isNew: true,
        players: [], // Initialize for potential team-with-players usage
      },
    ];
  }

  inputValue.value = '';
};

const addTeam = () => {
  const newRefName = getNextDefaultName('Team', participants.value);
  const newTeam = {
    id: nextId.value,
    name: newRefName,
    players: [],
    isNew: true,
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
  deleteTeamModalTitle.value = team
    ? `${team.name} verwijderen?`
    : 'Team verwijderen?';

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

const renameParticipant = (id, newName) => {
  // Same logic as renameTeam, applicable for Players or Teams mode
  const index = participants.value.findIndex((p) => p.id === id);
  if (index !== -1) {
    const updated = { ...participants.value[index], name: newName };
    const newParticipants = [...participants.value];
    newParticipants[index] = updated;
    participants.value = newParticipants;
  }
};

const renamePlayerInTeam = (playerId, newName) => {
  if (!selectedTeamId.value) return;

  const teamIndex = participants.value.findIndex(
    (t) => t.id === selectedTeamId.value,
  );

  if (teamIndex !== -1) {
    const team = participants.value[teamIndex];
    if (team.players) {
      const playerIndex = team.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1) {
        const updatedPlayers = [...team.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          name: newName,
        };
        const updatedTeam = { ...team, players: updatedPlayers };
        const newParticipants = [...participants.value];
        newParticipants[teamIndex] = updatedTeam;
        participants.value = newParticipants;
      }
    }
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

// Watch participants to auto-select first team if needed
watch(
  () => participants.value,
  (newParticipants) => {
    if (
      props.playerMode === 'teams-with-players' &&
      newParticipants.length > 0 &&
      !selectedTeamId.value
    ) {
      selectedTeamId.value = newParticipants[0].id;
    }
  },
  { deep: true, immediate: true },
);

const fileInput = ref(null);

const triggerFileUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    // Filter empty lines
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      event.target.value = '';
      return;
    }

    // Seperator en header bekijken
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine
      .split(separator)
      .map((h) => h.trim().toLowerCase().replace(/\s/g, ''));

    const allowedHeaders = [
      'name',
      'naam',
      'spelersnaam',
      'speler',
      'spelernaam',
      'playername',
      'player',
      'fullname',
      'volledigenaam',
    ];

    const nameIndex = headers.findIndex((h) => allowedHeaders.includes(h));

    if (nameIndex === -1) {
      uploadErrorMessage.value =
        'Geen geldige header gevonden in het CSV-bestand. Zorg ervoor dat het bestand een kolom bevat met een titel zoals "Naam", "Speler" of "Name".';
      const dialog = document.getElementById(errorModalId);
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
      event.target.value = '';
      return;
    }

    const newItems = [];
    let currentId = nextId.value;

    // Skip header row
    lines.slice(1).forEach((line) => {
      const parts = line.split(separator);
      if (parts.length > nameIndex) {
        const trimmed = parts[nameIndex].trim();
        if (trimmed) {
          newItems.push({
            id: currentId++,
            name: trimmed,
          });
        }
      }
    });

    if (newItems.length > 0) {
      participants.value = [...participants.value, ...newItems];
    }

    event.target.value = '';
  };
  reader.readAsText(file);
};
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
            @rename="(newName) => renamePlayerInTeam(player.id, newName)"
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
          @rename="(newName) => renameParticipant(player.id, newName)"
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
          @rename="(newName) => renameParticipant(team.id, newName)"
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
          <button
            v-if="playerMode === 'players'"
            type="button"
            class="c-players-setting__csv-upload"
            @click="triggerFileUpload"
          >
            <Upload :size="18" />
            Voeg een CSV bestand toe
            <input
              type="file"
              ref="fileInput"
              accept=".csv"
              style="display: none"
              @change="handleFileUpload"
            />
          </button>
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

    <Modal
      :modal-id="errorModalId"
      title="Fout bij importeren"
      :text="uploadErrorMessage"
      accept-btn-text="Oké"
      :show-cancel-btn="false"
    />
  </div>
</template>

<style scoped></style>
