<script setup>
import { ref, computed } from 'vue';
import { Plus, Users } from 'lucide-vue-next';
import Button from './Button.vue';
import InputField from './InputField.vue';

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

</script>

<template>
    <div class="c-players-setting">
        <div class="c-players-setting__header">
            <div class="c-players-setting__intro">
                <p class="h6">Deelnemers</p>
                <p>Beheer de deelnemers voor de geselecteerde modus.</p>
            </div>

            <!-- Input voor spelers/teams toevoegen -->
            <div v-if="playerMode !== 'teams-with-players' || selectedTeamId" class="c-players-setting__input">
                <InputField v-model="inputValue" id="player-add" name="player-add" :label="false"
                    :placeholder="placeholder" @keyup.enter="addPlayer" />
                <Button :button-tekst="buttonText" @click="addPlayer">
                    <template #c-btn_icon-left>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>

            <!-- Teams tabs (alleen bij teams-with-players mode) -->
            <div v-if="playerMode === 'teams-with-players'" class="c-players-setting__tabs-wrapper">
                <div class="c-players-setting__tabs">
                    <button v-for="team in participants" :key="team.id" class="c-players-setting__tab"
                        :class="{ 'c-players-setting__tab--active': selectedTeamId === team.id }"
                        @click="selectedTeamId = team.id">
                        {{ team.name }} ({{ team.players?.length || 0 }})
                    </button>
                    <button class="c-players-setting__tab c-players-setting__tab--add" @click="addTeam">
                        <Plus :size="18" />
                    </button>
                </div>

                <!-- Spelers lijst van geselecteerd team -->
                <div v-if="selectedTeamId" class="c-players-setting__players-list">
                    <div v-for="player in selectedTeam?.players || []" :key="player.id"
                        class="c-players-setting__player-item">
                        {{ player.name }}
                    </div>
                    <p v-if="!selectedTeam?.players?.length" class="c-players-setting__empty">
                        Nog geen spelers in dit team
                    </p>
                </div>
            </div>

            <!-- Spelers lijst (bij players mode) -->
            <div v-if="playerMode === 'players' && participants.length > 0" class="c-players-setting__players-list">
                <div v-for="player in participants" :key="player.id" class="c-players-setting__player-item">
                    {{ player.name }}
                </div>
            </div>

            <!-- Teams lijst (bij teams mode) -->
            <div v-if="playerMode === 'teams' && participants.length > 0" class="c-players-setting__players-list">
                <div v-for="team in participants" :key="team.id" class="c-players-setting__player-item">
                    {{ team.name }}
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="participants.length === 0" class="c-players-setting__emptylist">
                <Users :size="22" />
                <p>Er zijn nog geen {{ playerMode === 'players' ? 'spelers' : 'teams' }} toegevoegd</p>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
