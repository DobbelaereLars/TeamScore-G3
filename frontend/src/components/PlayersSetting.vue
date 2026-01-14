<script setup>
import { ref, computed } from 'vue';
import { Plus, Users } from 'lucide-vue-next';
import Button from './Button.vue';
import InputField from './InputField.vue';
import TeamTabButton from './TeamTabButton.vue';
import PlayersSettingParticipant from './PlayersSettingParticipant.vue';

const props = defineProps({
    playerMode: {
        type: String,
        default: 'players',
        validator: (value) => ['players', 'teams', 'teams-with-players'].includes(value),
    },
});

const participants = ref([]);
const inputValue = ref('');
const selectedTeamId = ref(null);
let nextId = 1;

const selectedTeam = computed(() =>
    participants.value.find(t => t.id === selectedTeamId.value)
);

const placeholder = computed(() => {
    if (props.playerMode === 'teams-with-players') return `Speler toevoegen aan ${selectedTeam.value?.name}...`;
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
        if (!selectedTeamId.value) return; // Kan niet zonder geselecteerd team
        const team = selectedTeam.value;
        if (team) {
            if (!team.players) team.players = [];
            team.players.push({ id: nextId++, name: inputValue.value.trim() });
        }
    } else {
        participants.value.push({ id: nextId++, name: inputValue.value.trim() });
    }

    inputValue.value = '';
};

const addTeam = () => {
    const teamNumber = participants.value.length + 1;
    const newTeam = {
        id: nextId++,
        name: `Team ${teamNumber}`,
        players: []
    };
    participants.value.push(newTeam);
    selectedTeamId.value = newTeam.id;
};

const deleteParticipant = (playerId) => {
    participants.value = participants.value.filter(p => p.id !== playerId);
};

const deletePlayerFromTeam = (playerId) => {
    if (selectedTeam.value) {
        selectedTeam.value.players = selectedTeam.value.players.filter(p => p.id !== playerId);
    }
};

const TeamRadioButtons = [];

</script>

<template>
    <div class="c-players-setting">
        <div class="c-players-setting__header">
            <div class="c-players-setting__intro">
                <p class="h6">Deelnemers</p>

                <p>Beheer de deelnemers voor de geselecteerde modus.</p>

                <!-- Input voor spelers/teams toevoegen -->
                <div v-if="playerMode !== 'teams-with-players' || selectedTeamId" class="c-players-setting__input">
                    <InputField v-model="inputValue" id="player-add" name="player-add" :label="false"
                        :placeholder="placeholder" @keyup.enter="addPlayer" />
                    <Button :button-tekst="buttonText" :clickable="false" @click="addPlayer">
                        <template #c-btn_icon-left>
                            <Plus :size="18" />
                        </template>
                    </Button>
                </div>
            </div>

            <!-- Teams tabs (alleen bij teams-with-players mode) -->
            <div v-if="playerMode === 'teams-with-players'" class="c-players-setting__tabs-wrapper">
                <div class="c-players-setting__tabs">
                    <TeamTabButton v-for="team in participants" :key="team.id" :label="team.name"
                        :count="team.players?.length || 0" :is-active="selectedTeamId === team.id"
                        @click="selectedTeamId = team.id" />
                    <button class="c-players-setting__tab c-players-setting__tab--add" @click="addTeam">
                        <Plus :size="18" />
                        Team toevoegen
                    </button>
                </div>

                <!-- Spelers lijst van geselecteerd team -->
                <div v-if="selectedTeamId" class="c-players-setting__players-list">
                    <PlayersSettingParticipant v-for="player in selectedTeam?.players || []" :key="player.id"
                        :name="player.name" @delete="deletePlayerFromTeam(player.id)" />
                    <div v-if="!selectedTeam?.players?.length" class="c-players-setting__emptylist">
                        <p>Er zijn nog geen spelers toegevoegd aan {{ selectedTeam?.name }}</p>
                    </div>
                </div>
            </div>

            <!-- Spelers lijst (bij players mode) -->
            <div v-if="playerMode === 'players' && participants.length > 0" class="c-players-setting__players-list">
                <PlayersSettingParticipant v-for="player in participants" :key="player.id" :name="player.name"
                    @delete="deleteParticipant(player.id)" />
            </div>

            <!-- Teams lijst (bij teams mode) -->
            <div v-if="playerMode === 'teams' && participants.length > 0" class="c-players-setting__players-list">
                <PlayersSettingParticipant v-for="team in participants" :key="team.id" :name="team.name"
                    @delete="deleteParticipant(team.id)" />
            </div>

            <!-- Empty state -->
            <div v-if="participants.length === 0" class="c-players-setting__emptylist">
                <Users :size="22" />
                <p v-if="playerMode === 'teams-with-players'">Voeg eerst een team toe</p>
                <div class="c-players-setting__emptycontainer" v-else>
                    <p>Er zijn nog geen {{ playerMode === 'players' ? 'spelers' : 'teams' }} toegevoegd</p>
                    <p v-if="playerMode === 'players'" class="c-players-setting__csv-upload">+ Voeg een CSV bestand toe
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
