<script setup>
import { Dices } from 'lucide-vue-next';
</script>

<template>
  <div class="c-input-radio-cards">
    <div class="c-input-radio-cards__wrapper">
      <input
        class="c-input-radio-cards__input u-hide"
        type="radio"
        name="radio-cards"
        id="radio-card-1"
      />
      <label class="c-input-radio-cards__label" for="radio-card-1">
        <div class="c-input-radio-cards__label__icon">
          <Dices />
        </div>

        <div class="c-input-radio-cards__label__tekst">
          <p class="u-bold">Speltype</p>
          <span>Beschrijving</span>
        </div>
      </label>
    </div>

    <div class="c-input-radio-cards__wrapper">
      <input
        class="c-input-radio-cards__input u-hide"
        type="radio"
        name="radio-cards"
        id="radio-card-2"
      />
      <label class="c-input-radio-cards__label" for="radio-card-2">
        <div class="c-input-radio-cards__label__icon">
          <Dices />
        </div>

        <div class="c-input-radio-cards__label__tekst">
          <p class="u-bold">Speltype</p>
          <span>Beschrijving</span>
        </div>
      </label>
    </div>

    <div class="c-input-radio-cards__wrapper">
      <input
        class="c-input-radio-cards__input u-hide"
        type="radio"
        name="radio-cards"
        id="radio-card-3"
      />
      <label class="c-input-radio-cards__label" for="radio-card-3">
        <div class="c-input-radio-cards__label__icon">
          <Dices />
        </div>

        <div class="c-input-radio-cards__label__tekst">
          <p class="u-bold">Speltype</p>
          <span>Beschrijving</span>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
