<script setup>
import InputField from '../components/InputField.vue';
import Button from '../components/Button.vue';
import InputRadioCards from '../components/InputRadioCards.vue';
import InputNumber from '../components/InputNumber.vue';
import ToggleWithDropdown from '../components/ToggleWithDropdown.vue';

import {
  Gamepad2,
  Calendar,
  Plus,
  Settings,
} from 'lucide-vue-next';
import PlayersSetting from '../components/PlayersSetting.vue';

const radioItems = [
  {
    id: 'game',
    value: 'game',
    label: 'Speltype',
    description: 'Beschrijving van Speltype',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'date',
    value: 'date',
    label: 'Datum',
    description: 'Beschrijving van Datum',
    icon: Calendar,
  },
  {
    id: 'settings',
    value: 'settings',
    label: 'Opties',
    description: 'Beschrijving van Opties',
    icon: Settings,
  },
];
</script>

<template>
  <div class="container d-flex gap-4 flex-column mt-5 mb-5">
    <Button button-tekst="Test Button met Icons">
      <template #c-btn_icon-left>
        <Gamepad2 :size="18" />
      </template>
      <template #c-btn_icon-right>
        <Plus :size="18" />
      </template>
    </Button>

    <Button button-tekst="Primary (normal)" variant="primary" />
    <Button button-tekst="Secondary (normal)" variant="secondary" />

    <Button :is-icon-button="true" variant="primary">
      <template #c-btn_icon-left>
        <Calendar :size="18" />
      </template>
    </Button>

    <Button :is-icon-button="true" variant="secondary">
      <template #c-btn_icon-left>
        <Calendar :size="18" />
      </template>
    </Button>

    <InputField id="session-name" name="sessionName" label="Sessienaam" placeholder="Bv. Sportdag 05/01/2026" />
    <br />
    <InputField id="no-label" name="noLabel" :label="false" placeholder="Geen label" />
    <br />
    <InputField id="default-input" name="defaultInput" placeholder="Default label placeholder" />

    <InputRadioCards :items="radioItems" name="test-radio" />

    <InputNumber min="2" max="10" label="Number" id="numberInput" name="numberInput" type="number" />

    <ToggleWithDropdown />

    <PlayersSetting player-mode="teams-with-players" />
  </div>
</template>

<style scoped></style>
