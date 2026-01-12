<script setup>
import InputField from '../components/InputField.vue';
</script>

<template>
  <div class="container mt-5">
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
  </div>
</template>

<style scoped></style>
