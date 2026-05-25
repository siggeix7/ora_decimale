# Ora Decimale

Una piccola web app che mostra due orologi affiancati:

- ora normale, nel formato `HH:MM:SS`
- ora decimale, dove il giorno e' diviso in 10 ore, ogni ora in 100 minuti e ogni minuto in 100 secondi

Il sito viene servito da Nginx dentro un container Docker ed e' esposto sulla porta `8888`.

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

- `index.html`: struttura della pagina
- `styles.css`: stile responsive dell'interfaccia
- `app.js`: calcolo e aggiornamento degli orologi
- `Dockerfile`: immagine Nginx per servire i file statici
- `nginx.conf`: configurazione Nginx sulla porta `8888`
- `compose.yaml`: servizio Docker Compose con porta `8888:8888`
