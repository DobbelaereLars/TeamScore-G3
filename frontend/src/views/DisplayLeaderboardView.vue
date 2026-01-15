<script setup>
import LeaderboardPodiumIcon from "../components/LeaderboardPodiumIcon.vue";
import LeaderboardPlayerCard from "../components/LeaderboardPlayerCard.vue";

import logo from "../assets/logo.webp";

import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const players = ref([
  {
    id: 1,
    spelersnaam: "John Doe",
    score: 121,
  },
  {
    id: 2,
    spelersnaam: "Jane Smith",
    score: 72,
  },
  {
    id: 3,
    spelersnaam: "Bob Johfdsdnson",
    score: 78,
  },
  {
    id: 6,
    spelersnaam: "Bob Johnson",
    score: 85,
  },
  {
    id: 7,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 8,
    spelersnaam: "Bob Johnson",
    score: 65,
  },
  {
    id: 4,
    spelersnaam: "Alice Williams",
    score: 78,
  },
  {
    id: 5,
    spelersnaam: "Charlie Brown",
    score: 84,
  },
  {
    id: 9,
    spelersnaam: "Yarne Diopere",
    score: 124,
  },
  {
    id: 10,
    spelersnaam: "Lars Dobbelaere",
    score: 114,
  },
  {
    id: 11,
    spelersnaam: "Renz Deheegher",
    score: 118,
  },
]);

// Sort players by score (highest first)
const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary sort by ID to ensure stable order
    return a.id - b.id;
  });
});

// Get the maximum score for progress bars
const maxScore = computed(() => {
  if (sortedPlayers.value.length === 0) return 100;
  return sortedPlayers.value[0].score;
});

// Get top 3 players for podium
const topThreePlayers = computed(() => {
  return sortedPlayers.value.slice(0, 3);
});

// Get remaining players (from position 4 onwards)
const remainingPlayers = computed(() => {
  return sortedPlayers.value.slice(3);
});

// Screen height and scroll animation
const screenHeight = ref(window.innerHeight);
const scrollContainer = ref(null); // Direct DOM Ref
let currentScrollPos = 0; // Using plain let for performance loop

// Handle window resize
const handleResize = () => {
  screenHeight.value = window.innerHeight;
  updateCardHeight(); // Update card height on resize
};

// Continuous smooth scroll animation (no pauses)
let scrollAnimationFrame = null;
const scrollSpeed = 0.2; // Constant smooth speed

const cardHeight = ref(115); // Will be measured dynamically

const animateScroll = () => {
  if (remainingPlayers.value.length === 0 || !scrollContainer.value) return;

  // Calculate total scrollable height: list height + gap
  const listHeight = remainingPlayers.value.length * cardHeight.value;
  const totalLoopHeight = listHeight;

  // Increment scroll position
  currentScrollPos += scrollSpeed;

  // Reset when we've scrolled past the first list AND the gap
  // At this point, the duplicate list's top aligns with where the original list started
  if (currentScrollPos >= totalLoopHeight) {
    currentScrollPos = 0;
  }

  // Direct DOM update for performance (bypassing Vue reactivity)
  scrollContainer.value.style.transform = `translateY(-${currentScrollPos}px)`;

  // Continuous loop
  scrollAnimationFrame = requestAnimationFrame(animateScroll);
};

// Measure accurate card height for seamless looping
const updateCardHeight = () => {
  // Assuming LeaderboardPlayerCard's root element has the class 'c-leaderboard-playercard'
  const card = document.querySelector(".c-leaderboard-playercard");
  if (card) {
    // Height + Gap (assuming 15px gap from SCSS)
    // We can also measure the gap by checking distance between two cards
    const cards = document.querySelectorAll(".c-leaderboard-playercard");
    if (cards.length >= 2) {
      const first = cards[0].getBoundingClientRect();
      const second = cards[1].getBoundingClientRect();
      cardHeight.value = second.top - first.top;
    } else {
      // Fallback
      cardHeight.value = card.offsetHeight + 15;
    }
  }
};

// Watch for changes in the list to maintain scroll position (Anchor Scrolling)
watch(remainingPlayers, (newVal, oldPlayers) => {
  console.log(
    "WATCHER DEBUG: Fired. Old:",
    oldPlayers ? oldPlayers.length : "null",
    "New:",
    newVal ? newVal.length : "null"
  );
  if (!oldPlayers || oldPlayers.length === 0 || !cardHeight.value) {
    console.log("WATCHER DEBUG: Skipped (initial/empty)");
    return;
  }

  const listCount = oldPlayers.length;
  // Calculate which item is visually at the top, handling the loop (duplicates)
  const rawIndex = Math.floor(currentScrollPos / cardHeight.value);
  const effectiveIndex = rawIndex % listCount;
  const offset = currentScrollPos % cardHeight.value;
  const loopIteration = Math.floor(rawIndex / listCount);

  const topItem = oldPlayers[effectiveIndex];

  if (!topItem) return;

  // Find where this item moved to in the new list
  const newIndex = newVal.findIndex((p) => p.id === topItem.id);

  if (newIndex !== -1) {
    const newTotalHeight = newVal.length * cardHeight.value;

    // Calculate candidate new position
    // We want to keep the same loop iteration if possible
    let newPos =
      loopIteration * newTotalHeight + newIndex * cardHeight.value + offset;

    currentScrollPos = newPos;
  }
});

const startAutoScroll = () => {
  if (remainingPlayers.value.length === 0) return;
  animateScroll();
};

const stopAutoScroll = () => {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
  }
};

onMounted(() => {
  window.addEventListener("resize", handleResize);

  // Wait for next tick to ensure DOM is rendered before measuring
  setTimeout(() => {
    updateCardHeight();
    startAutoScroll();
  }, 100);

  // Disable body scrolling
  document.body.style.overflow = "hidden";

  // TEST: Randomly change scores every 3 seconds
  setInterval(() => {
    // Only change score of someone in the remainingPlayers list (ranks 4+)
    // to avoid podium switching confusion for now
    if (players.value.length > 5) {
      const target = players.value[players.value.length - 1]; // modify last player
      target.score += 1;
      // trigger reactivity
      players.value = [...players.value];
    }
  }, 3000);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  stopAutoScroll();

  // Re-enable body scrolling
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="c-display-leaderboard-view">
    <div class="c-display-leaderboard-view__header">
      <div class="c-display-leaderboard-view__logo">
        <img :src="logo" alt="TeamScore Logo" style="height: 8rem" />
      </div>
      <div class="c-display-leaderboard-view__podium">
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[1]"
          color="red"
          :spelersnaam="topThreePlayers[1].spelersnaam"
          :score="topThreePlayers[1].score"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[0]"
          color="blue"
          :spelersnaam="topThreePlayers[0].spelersnaam"
          :score="topThreePlayers[0].score"
        />
        <LeaderboardPodiumIcon
          v-if="topThreePlayers[2]"
          color="orange"
          :spelersnaam="topThreePlayers[2].spelersnaam"
          :score="topThreePlayers[2].score"
        />
      </div>
    </div>
    <div class="c-display-leaderboard-view__players">
      <div
        ref="scrollContainer"
        class="c-display-leaderboard-view__players-container"
      >
        <LeaderboardPlayerCard
          v-for="(player, index) in remainingPlayers"
          :key="player.id"
          :position="index + 4"
          :playerName="player.spelersnaam"
          :maxValue="maxScore"
          :score="player.score"
        />

        <!-- Duplicate cards for seamless loop -->
        <LeaderboardPlayerCard
          v-for="(player, index) in remainingPlayers"
          :key="'loop-' + player.id"
          :position="index + 4"
          :playerName="player.spelersnaam"
          :maxValue="maxScore"
          :score="player.score"
        />

        <!-- Second Duplicate set for safety on large screens -->
        <LeaderboardPlayerCard
          v-for="(player, index) in remainingPlayers"
          :key="'loop2-' + player.id"
          :position="index + 4"
          :playerName="player.spelersnaam"
          :maxValue="maxScore"
          :score="player.score"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
