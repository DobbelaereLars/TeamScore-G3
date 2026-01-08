#!/usr/bin/env bash
set -e

# Load local env (niet gecommit)
if [ -f .env.local ]; then
  # simpele key=value loader
  export $(grep -v '^#' .env.local | xargs)
fi

# Verwacht dat deze variabelen nu gezet zijn
: "${PI_USER:?PI_USER is not set}"
: "${PI_HOST:?PI_HOST is not set}"
: "${PI_APP_DIR:?PI_APP_DIR is not set}"
: "${REPO_URL:?REPO_URL is not set}"

echo ">> (Optioneel) git push"
# git push origin main

echo ">> Deploy to Pi via SSH..."
ssh ${PI_USER}@${PI_HOST} /bin/bash << EOF
  set -e
  
  # Load nvm
  export NVM_DIR="\$HOME/.nvm"
  [ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"
  
  echo "== TeamScore deploy =="
  echo ">> Using Node: \$(node -v)"
  echo ">> Using npm: \$(npm -v)"

  # 1) Repo clonen of updaten
  if [ ! -d "${PI_APP_DIR}/.git" ]; then
    echo ">> Cloning repository..."
    git clone "${REPO_URL}" "${PI_APP_DIR}"
  else
    echo ">> Repository exists, pulling latest changes..."
    cd "${PI_APP_DIR}"
    git pull
  fi

  cd "${PI_APP_DIR}"

  # 2) Backend deps + migrations
  echo ">> Backend deps..."
  cd backend
  npm install --production

  echo ">> Ensure data dir..."
  mkdir -p data

  echo ">> Run migrations..."
  npm run migrate

  cd ..

  # 3) Frontend deps + build
  echo ">> Frontend deps..."
  cd frontend
  npm install

  echo ">> Build frontend..."
  npm run build

  cd ..

  # 4) Startscript uit repo uitvoerbaar maken
  echo ">> Ensure start script is executable..."
  chmod +x "${PI_APP_DIR}/start-teamscore.sh" || true

  # 5) Desktop snelkoppeling aanmaken indien nog niet bestaat
  DESKTOP_FILE="\$HOME/Desktop/TeamScore.desktop"

  if [ ! -f "\$DESKTOP_FILE" ]; then
    echo ">> Creating desktop shortcut..."
    mkdir -p "\$HOME/Desktop"

    cat > "\$DESKTOP_FILE" << DESKEOF
[Desktop Entry]
Type=Application
Name=TeamScore
Comment=Start TeamScore backend en open scoreboard
Exec=${PI_APP_DIR}/start-teamscore.sh
Icon=chromium
Terminal=false
DESKEOF

    chmod +x "\$DESKTOP_FILE"
  else
    echo ">> Desktop shortcut already exists, skipping."
  fi

  echo "== Deploy finished =="
EOF