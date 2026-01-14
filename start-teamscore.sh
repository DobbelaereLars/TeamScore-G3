#!/bin/bash

# Vanaf de repo-root naar backend gaan
cd "$(dirname "$0")/backend"

# Backend starten via systemd (alleen op de Pi bruikbaar)
if ! systemctl is-active --quiet teamscore.service 2>/dev/null; then
  sudo systemctl start teamscore.service
fi

sleep 3

# Chromium openen op de Pi
# --ignore-certificate-errors is nodig omdat we een self-signed certificaat gebruiken
chromium-browser --kiosk --ignore-certificate-errors --app=https://localhost:3000/display/splash