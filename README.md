# Ora Decimale

Una piccola web app Astro che mostra due orologi affiancati e un convertitore tra i due sistemi:

- ora normale, nel formato `HH:MM:SS`
- ora decimale, dove il giorno e' diviso in 10 ore, ogni ora in 100 minuti e ogni minuto in 100 secondi
- conversione da orario classico a orario decimale
- conversione da orario decimale a orario classico
- input compatto `HH:MM:SS`, campi separati, scorciatoie rapide ed esempi cliccabili
- indicatore live della percentuale di giornata trascorsa
- quadrante analogico decimale
- preferenze salvate per tema, formato digitale/frazione e decimi di secondo
- pulsanti per copiare un risultato o riusarlo nell'altro convertitore
- scelta della precisione di conversione: al piu vicino, per difetto o per eccesso
- equivalenze rapide tra unita decimali e durata classica
- PWA installabile con cache offline di base

Il sito viene compilato come static site Astro e servito da Nginx dentro un container Docker esposto sulla porta `8888`.
Il container include anche un healthcheck HTTP sulla stessa porta e header HTTP di sicurezza configurati in Nginx.

## Come funziona l'ora decimale

Un giorno normale ha `86.400` secondi. Nel sistema decimale usato qui, un giorno ha invece `100.000` secondi decimali.

La conversione e':

```text
secondi_decimali = secondi_da_mezzanotte / 86.400 * 100.000
```

Esempi:

```text
00:00 normale = 0:00:00 decimale
06:00 normale = 2:50:00 decimale
12:00 normale = 5:00:00 decimale
18:00 normale = 7:50:00 decimale
24:00 normale = 10:00:00 decimale
```

## Sviluppo locale

Installa le dipendenze:

```bash
npm install
```

Avvia Astro in sviluppo:

```bash
npm run dev
```

Genera la build statica:

```bash
npm run build
```

## Avvio con Docker Compose

Costruisci e avvia il container:

```bash
docker compose up --build
```

Poi apri:

```text
http://localhost:8888
```

Per avviarlo in background:

```bash
docker compose up -d --build
```

Per fermarlo:

```bash
docker compose down
```

## Struttura

- `src/pages/index.astro`: pagina Astro principale
- `src/components/`: sezioni dell'interfaccia
- `src/styles/global.css`: stile responsive e temi
- `src/scripts/time.ts`: funzioni di conversione e formattazione
- `src/scripts/app.ts`: interazione client, preferenze, storico e PWA
- `public/`: icona, manifest e service worker
- `Dockerfile`: build Astro multi-stage e runtime Nginx
- `nginx.conf`: configurazione Nginx sulla porta `8888`
- `compose.yaml`: servizio Docker Compose con porta `8888:8888`
