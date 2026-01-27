<script setup>
import { ref, watch } from 'vue';
import SessionPreviewGenerator from './components/SessionPreviewGenerator.vue';
import { previewStore } from './store/previewStore';

const previewGen = ref(null);

watch(
  () => previewStore.request,
  async (req) => {
    if (req && previewGen.value) {
      try {
        await previewGen.value.generateAndUpload(
          req.sessionId,
          req.gameIdOrList,
        );
        if (req.resolve) req.resolve();
      } catch (e) {
        console.error('Preview generation failed in watcher', e);
        if (req.resolve) req.resolve(); // Resolve anyway so we don't block
      }
      previewStore.clear();
    }
  },
);
</script>

<template>
  <div>
    <router-view />
    <SessionPreviewGenerator ref="previewGen" />
  </div>
</template>

<style scoped></style>
