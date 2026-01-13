<script setup>
import InputField from '../components/InputField.vue';
import Button from '../components/Button.vue';
import Playercard from '../components/ScoreboardPlayercard.vue';
import Progressbar from '../components/Progressbar.vue';
import PlayerIcon from '../components/ProfileIcon.vue';
import {
  Gamepad2,
  Calendar,
  Plus,
  Settings,
  Trash2,
  Minus,
  MinusCircle,
} from 'lucide-vue-next';
</script>

<template>
  <div class="container d-flex gap-4 flex-column">
    <Button button-tekst="Test Button met Icons">
      <template #c-icon-left>
        <Gamepad2 :size="18" />
      </template>
      <template #c-icon-right>
        <Plus :size="18" />
      </template>
    </Button>

    <Button :is-icon-button="true">
      <template #c-icon-left>
        <Calendar :size="18" />
      </template>
    </Button>

    <InputField
      id="session-name"
      name="sessionName"
      label="Sessienaam"
      placeholder="Bv. Sportdag 05/01/2026"
    />
    <br />
    <InputField
      id="no-label"
      name="noLabel"
      :label="false"
      placeholder="Geen label"
    />
    <br />
    <InputField
      id="default-input"
      name="defaultInput"
      placeholder="Default label placeholder"
    />
    <br />
    <Playercard variant="P1" spelersnaam="Lars Dehe" :score="5" :maxValue="100" :position="2" />
   
  </div>
</template>

<style scoped></style>
