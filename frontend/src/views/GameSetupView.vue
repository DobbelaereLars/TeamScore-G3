<script setup>
import { ref } from 'vue';
import Button from '../components/Button.vue';
import TabList from '../components/TabList.vue';
import InputField from '../components/InputField.vue';
import TabBar from '../components/TabBar.vue';
import { ArrowLeft, Gamepad2, Settings2, Users } from 'lucide-vue-next';

const gameSetupTabList = ref([
  {
    id: 'session',
    value: 'session',
    label: 'Sessie',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'rules',
    value: 'rules',
    label: 'Spelregels',
    icon: Settings2,
  },
  {
    id: 'participants',
    value: 'participants',
    label: 'Deelnemers',
    icon: Users,
  },
]);

const participantModusTabList = ref([
  {
    id: 'individuals',
    value: 'individuals',
    label: 'Individuele spelers',
    checked: true,
  },
  {
    id: 'teams',
    value: 'teams',
    label: 'Teams',
  },
  {
    id: 'teams-with-players',
    value: 'teams-with-players',
    label: 'Teams met spelers',
  },
]);
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

          <div class="p-game-setup-view__settings__body">
            <TabList
              :items="gameSetupTabList"
              name="game-setup-tablist"
              :hideIcon="false"
            ></TabList>

            <div class="p-game-setup-view__settings__body__content">
              <div class="p-game-setup-view__settings__body__content__session">
                <h2 class="h6">Sessienaam</h2>
                <InputField
                  id="session-name"
                  name="sessionName"
                  :label="false"
                  placeholder="Bv. Sportdag 05/01/2026"
                />
              </div>

              <div
                class="p-game-setup-view__settings__body__content__participantmodus"
              >
                <div
                  class="p-game-setup-view__settings__body__content__participantmodus__subtitle"
                >
                  <h2 class="h6">Deelnemersmodus</h2>
                  <p>
                    Kies of je met individuele spelers of in teams zal spelen.
                  </p>
                </div>

                <div
                  class="p-game-setup-view__settings__body__content__participantmodus__content"
                >
                  <TabBar
                    :items="participantModusTabList"
                    name="test-tabbar"
                    :hideIcon="true"
                  ></TabBar>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
