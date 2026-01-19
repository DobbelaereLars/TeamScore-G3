<script setup>
import { computed } from "vue";
const props = defineProps({
  playerName: {
    type: String,
    default: "Naam",
  },
  variant: {
    type: String,
    default: "default",
    validator: (value) =>
      ["default", "scoreboard-P1", "scoreboard-P2", "scoreboard-P3"].includes(
        value
      ),
  },
  size: {
    type: String,
    default: "default",
    validator: (value) => ["default", "large", "extra-large"].includes(value),
  },
  color: {
    type: String,
    default: null,
  },
  textColor: {
    type: String,
    default: null,
  },
});

const profileInitials = computed(() => {
  const nameParts = props.playerName
    .trim()
    .split(" ")
    .filter((part) => part.length > 0);
  if (nameParts.length === 0) return "S";
  if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
});

const computedStyles = computed(() => {
  const styles = {};
  if (props.textColor) {
    styles.color = props.textColor; // Override with specific text color if provided
  }
  return styles;
});
</script>

<template>
  <div
    class="c-profile__icon"
    :class="[
      `c-profile__icon--${variant}`,
      $attrs.class,
      props.size ? `c-profile__icon--${size}` : '',
    ]"
    :style="computedStyles"
  >
    <p>{{ profileInitials }}</p>
  </div>
</template>

<style scoped></style>
