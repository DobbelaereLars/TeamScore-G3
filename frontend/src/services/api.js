import axios from 'axios';

// Gebruik localhost in development (Vite), maar relatieve paden in productie (zodat Tablet naar Pi wijst, niet naar zichzelf)
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// SESSION ENDPOINTS
// ============================================
export const sessionRepository = {
  getAll: () => api.get('/sessions'),
  getById: (id) => api.get(`/sessions/${id}`),
  getGames: (id) => api.get(`/sessions/${id}/games`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  getParticipants: (id) => api.get(`/sessions/${id}/participants`),
  addParticipants: (id, data) => api.post(`/sessions/${id}/participants`, data),
  updateAssignments: (id, moves) =>
    api.put(`/sessions/${id}/participants/assignment`, { moves }),
  getGames: (id) => api.get(`/sessions/${id}/games`),
  getFinalScores: (id) => api.get(`/sessions/${id}/final-scores`),
};

// ============================================
// GAME ENDPOINTS
// ============================================
export const gameRepository = {
  getAll: () => api.get('/games'),
  getById: (id) => api.get(`/games/${id}`),
  create: (data) => api.post('/games', data),
  update: (id, data) => api.put(`/games/${id}`, data),
  delete: (id) => api.delete(`/games/${id}`),
  finish: (id) => api.patch(`/games/${id}/finish`),
  getScores: (id) => api.get(`/games/${id}/scores`),
};

// ============================================
// PLAYER ENDPOINTS
// ============================================
export const playerRepository = {
  getAll: () => api.get('/players'),
  getById: (id) => api.get(`/players/${id}`),
  create: (data) => api.post('/players', data),
  update: (id, data) => api.put(`/players/${id}`, data),
  delete: (id) => api.delete(`/players/${id}`),
};

// ============================================
// TEAM ENDPOINTS
// ============================================
export const teamRepository = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getPlayers: (id) => api.get(`/teams/${id}/players`),
  addPlayer: (teamId, playerId) =>
    api.post(`/teams/${teamId}/players/${playerId}`),
  removePlayer: (teamId, playerId) =>
    api.delete(`/teams/${teamId}/players/${playerId}`),
};

// ============================================
// PARTICIPANT ENDPOINTS
// ============================================
export const participantRepository = {
  getAll: () => api.get('/participants'),
  getById: (id) => api.get(`/participants/${id}`),
  create: (data) => api.post('/participants', data),
  delete: (id) => api.delete(`/participants/${id}`),
};

// ============================================
// SCORE ENDPOINTS
// ============================================
export const scoreRepository = {
  getAll: () => api.get('/scores'),
  getById: (id) => api.get(`/scores/${id}`),
  create: (data) => api.post('/scores', data),
  updatePoints: (gameId, participantId, points) =>
    api.put(`/scores/${gameId}/participant/${participantId}/points`, {
      points,
    }),
  updateScore: (gameId, participantId, value, type) =>
    api.put(`/scores/${gameId}/participant/${participantId}/score`, {
      value,
      type,
    }),
  update: (id, data) => api.put(`/scores/${id}`, data),
  delete: (id) => api.delete(`/scores/${id}`),
  bulkUpdate: (scores) => api.post('/scores/bulk', scores),
};

// ============================================
// SCOREMODEL ENDPOINTS
// ============================================
export const scoreModelRepository = {
  getAll: () => api.get('/score-models'),
  getById: (id) => api.get(`/score-models/${id}`),
  create: (data) => api.post('/score-models', data),
  update: (id, data) => api.put(`/score-models/${id}`, data),
  delete: (id) => api.delete(`/score-models/${id}`),
};

// ============================================
// FINALSCORE ENDPOINTS
// ============================================
export const finalScoreRepository = {
  getAll: () => api.get('/final-scores'),
  getBySession: (sessionId) => api.get(`/sessions/${sessionId}/final-scores`),
  calculate: (sessionId) => api.post(`/final-scores/calculate/${sessionId}`),
};

// Export axios instance voor custom requests
export default api;
