<script setup>
import { Gamepad2 } from 'lucide-vue-next';
</script>

<template>
  <div class="c-tablist">
    <div class="c-tablist__wrapper">
      <input
        class="c-tablist__input u-hide"
        type="radio"
        name="tablist"
        id="tablist"
      />
      <label class="c-tablist__label" for="tablist">
        <div class="c-tablist__label__icon">
          <Gamepad2 />
        </div>

        <div class="c-tablist__label__tekst">
          <p>Tab</p>
        </div>
      </label>
    </div>

    <div class="c-tablist__wrapper">
      <input
        class="c-tablist__input u-hide"
        type="radio"
        name="tablist"
        id="tablist"
      />
      <label class="c-tablist__label" for="tablist">
        <div class="c-tablist__label__icon">
          <Gamepad2 />
        </div>

        <div class="c-tablist__label__tekst">
          <p>Tab</p>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped></style>
