<script setup>
import InputField from '../components/InputField.vue';
</script>

<template>
  <div class="container mt-5">
    <InputField label="Sessienaam" placeholder="Bv. Sportdag 05/01/2026" />
    <br />
    <InputField :label="false" placeholder="Geen label" />
    <br />
    <InputField placeholder="Default label placeholder" />
  </div>
</template>

<style scoped></style>
