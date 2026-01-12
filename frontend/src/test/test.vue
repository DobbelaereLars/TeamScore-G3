<script setup>
// import Button from '../components/Button.vue'
import Button from '../components/Button_manual.vue';
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

    <Button button-tekst="" :is-icon-button="true">
      <template #c-icon-left>
        <Calendar :size="18" />
      </template>
    </Button>
  </div>
</template>

<style scoped>
.tablet-home {
  padding: 2rem;
}
</style>
