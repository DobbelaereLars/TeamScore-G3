<script setup>
import InputNumber from "../components/InputNumber.vue";
import ToggleWithDropdown from "../components/ToggleWithDropdown.vue";
</script>

<template>
  <div class="tablet-home">
    <h1>Tablet Home View</h1>
    <!-- <ToggleWithDropdown inputId="toggle1" /> -->
    <InputNumber min="2" max="10" label="Number" id="numberInput" name="numberInput" type="number" />
  </div>
</template>

<style scoped></style>
