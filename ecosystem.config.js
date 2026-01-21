module.exports = {
  apps: [
    {
      name: 'teamscore-app',
      script: './backend/src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Zorgt ervoor dat we alleen dit proces hoeven te starten,
      // omdat de backend ook de frontend dist files serveert.
    },
  ],
};
