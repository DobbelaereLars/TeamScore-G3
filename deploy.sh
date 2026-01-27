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

  # 1) Repo clonen of updaten (altijd main-branch)
  if [ ! -d "${PI_APP_DIR}/.git" ]; then
    echo ">> Cloning repository (main branch)..."
    git clone --branch main --single-branch "${REPO_URL}" "${PI_APP_DIR}"
  else
    echo ">> Repository exists, resetting and pulling latest changes for main..."
    cd "${PI_APP_DIR}"
    git fetch origin
    # Gooi lokale wijzigingen weg op de Pi (deploy target)
    git reset --hard HEAD
    git checkout main || git checkout -b main origin/main
    git reset --hard origin/main
  fi

  cd "${PI_APP_DIR}"

  # 2) Backend deps + migrations + HTTPS certs
  echo ">> Backend deps..."
  cd backend
  npm install --production

  echo ">> Ensure data dir..."
  mkdir -p data

  # Backup database before migrations (if exists)
  if [ -f "data/scoreboard.db" ]; then
    echo ">> Creating database backup..."
    BACKUP_FILE="data/scoreboard.db.backup.\$(date +%Y%m%d_%H%M%S)"
    cp "data/scoreboard.db" "\$BACKUP_FILE"
    echo ">> Backup created: \$BACKUP_FILE"
    # Keep only last 5 backups to save space
    ls -t data/scoreboard.db.backup.* 2>/dev/null | tail -n +6 | xargs -r rm --
  fi

  echo ">> Ensure HTTPS certs (backend/certs)..."
  # We zitten al in de backend-map; gebruik een vaste relatieve certs-map
  mkdir -p certs

  if [ ! -f "certs/key.pem" ] || [ ! -f "certs/cert.pem" ]; then
    echo ">> Generating self-signed certificate for ${PI_HOST}..."
    if command -v openssl >/dev/null 2>&1; then
      openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "certs/key.pem" -out "certs/cert.pem" -days 365 \
        -subj "/CN=${PI_HOST}"
    else
      echo "⚠️  openssl is not installed on the Pi; skipping HTTPS cert generation (server zal HTTP draaien)."
    fi
  else
    echo ">> Existing HTTPS certs found, skipping generation."
  fi

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

  # 4) Start applicatie met PM2
  echo ">> Starting/Reloading app with PM2..."
  
  # Check of PM2 geinstalleerd is
  if ! command -v pm2 &> /dev/null; then
    echo ">> PM2 not found, installing global..."
    npm install -g pm2
  fi

  # Zorg dat we in root zitten voor ecosystem file
  if pm2 describe teamscore-app > /dev/null; then
    pm2 reload ecosystem.config.js
  else
    pm2 start ecosystem.config.js
  fi
  pm2 save

  echo "== Deploy finished =="
EOF