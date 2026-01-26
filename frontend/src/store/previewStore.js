import { reactive } from 'vue';

export const previewStore = reactive({
  request: null, // { sessionId, gameIdOrList, resolve, reject }

  generate(sessionId, gameIdOrList) {
    return new Promise((resolve, reject) => {
      this.request = { sessionId, gameIdOrList, resolve, reject };
    });
  },

  clear() {
    this.request = null;
  },
});
