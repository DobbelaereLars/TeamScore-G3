Het project richt zich op het ontwikkelen van een offline webapplicatie die gebruikt kan worden als scorebord voor teambuildings. De applicatie moet gebruiksvriendelijk zijn, real-time scores kunnen tonen en volledig functioneel zijn zonder internetverbinding.

## Vereiste Node- en npm-versies

- **Node.js**: v24.12.0 (minimaal)
- **npm**: v11.7.0 (minimaal)

### Stap 0: Controleer je huidige Node en npm versies

Controleer eerst of je al de juiste versies hebt met het volgende commando in de terminal:

```bash
node -v  # Moet v24.12.0 of hoger tonen
npm -v   # Moet 11.7.0 of hoger tonen
```

**Als je al de juiste versies hebt, ga direct naar Stap 4.**

**Als je niet de juiste versies hebt, ga verder met Stap 1.**

### Stap 1: Controleer of je nvm hebt geïnstalleerd

Controleer of je nvm hebt met het volgende commando in de terminal:

```bash
nvm --version
```

**Als je een versienummer ziet (bijv. 0.40.0), ga dan naar Stap 3.**

**Als je een foutmelding krijgt (`command not found`), volg dan Stap 2.**

### Stap 2: nvm installeren

Installeer nvm met het volgende commando in de terminal voor mac/linux:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Of voor Windows:

```bash
Download het installatiebestand van https://github.com/coreybutler/nvm-windows/releases:
- Zoek de nieuwste release en download `nvm-setup.exe`
- Voer het installatiebestand uit en volg de installatie-wizard
- Herstart je computer na de installatie
```

Na installatie, herstart je terminal.

Verifieer de installatie met het volgende commando in de terminal:

```bash
nvm --version
```

### Stap 3: Node en npm versies instellen

**Node-versie instellen:**

Installeer de juiste node versie met de volgende commando's in de root van deze repository in de terminal:

```bash
nvm install
nvm use
```

**npm-versie instellen:**

Installeer de juiste npm versie met het volgende commando in de terminal:

```bash
npm install -g npm@11.7.0
```

**Verifieer de versies:**

Controleer of je de juiste npm en node versie hebt met de volgende commando's in de terminal:

```bash
node -v  # Moet v24.12.0 of hoger tonen
npm -v   # Moet 11.7.0 of hoger tonen
```

### Stap 4: Dependencies installeren

Installeer alle dependencies met het volgende commando in de root van deze repository in de terminal:

```bash
npm run install:all
```

### Stap 5: Start de development server

Start de applicatie in development modus met het volgende commando in de root van deze repository in de terminal:

```bash
npm run dev
```

De applicatie zal nu starten en je kunt beginnen met ontwikkelen. Open je browser en navigeer naar de URL die in de terminal wordt getoond.