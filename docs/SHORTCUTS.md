# iOS Shortcuts oppsett

Komplett guide for å sette opp arrive/depart-logging på iPhone, både manuell og automatisk via geofence eller NFC.

## 1. Forutsetninger

- iPhone med iOS 16+ (Shortcuts-appen)
- App er deployet og `API_KEY` satt i environment
- Du vet hvilken URL du skal POSTe til:
  ```
  https://<din-app>.vercel.app/api/entries/auto
  ```

## 2. Server-API for Shortcuts

### Headers

| Header | Påkrevd | Beskrivelse |
|---|---|---|
| `x-api-key` | Ja | Verdien av `API_KEY` env-var |
| `Content-Type` | Ja | `application/json` |
| `Idempotency-Key` | Anbefalt | Unik nøkkel per "hendelse". Server husker resultatet i 5 min og returnerer samme svar på retry. Forhindrer dobbeltlogging når geofence trigger to ganger. |

### Felles body-felter

| Felt | Type | Beskrivelse |
|---|---|---|
| `action` | string | `arrive`, `depart`, `log` eller `workday` |
| `deviceId` | string | Valgfri. Identifiserer enheten (max 32 tegn, `[A-Za-z0-9_-]`). Lar to telefoner kjøre arrive/depart parallelt uten å overskrive hverandre. Default: `"default"` |
| `lat`, `lon` | number | Valgfri. GPS-koordinater. Server matcher mot konfigurerte `LocationRule`-soner og setter location automatisk |
| `location` | string | Valgfri. `office` / `home` / `other`. Brukes som fallback hvis GPS ikke matcher noen sone |

### Action-spesifikke felter

#### `arrive`
```json
{
  "action": "arrive",
  "deviceId": "iphone",
  "lat": 59.913900,
  "lon": 10.752200,
  "time": "08:30"
}
```
`time` er valgfri (default = nå i Oslo-tid).

Respons:
```json
{
  "ok": true,
  "arrived": "08:30",
  "location": "office",
  "locationSource": "geo",
  "matchedRule": { "id": "kontor", "name": "Kontoret", "distanceMeters": 23 },
  "deviceId": "iphone"
}
```

#### `depart`
```json
{
  "action": "depart",
  "deviceId": "iphone",
  "lat": 59.913900,
  "lon": 10.752200
}
```

Respons:
```json
{
  "ok": true,
  "timestamp": "2026-05-03T14:32:11.000Z",
  "start": "08:30",
  "end": "16:00",
  "duration": 7,
  "location": "office",
  "deviceId": "iphone"
}
```

Ved feil (ingen aktiv arrive på `deviceId`): `{ "error": "No active arrival found", "deviceId": "iphone" }`.

#### `log` (logg en ferdig økt direkte)
```json
{
  "action": "log",
  "start": "08:00",
  "end": "16:00",
  "type": "work",
  "location": "home",
  "note": "Hjemmekontor"
}
```

#### `workday` (lag default workday hvis dagen er tom)
```json
{ "action": "workday" }
```
Bruker arbeidstidsregler fra Config (`work-rules`).

## 3. Konfigurere geofence-soner i appen

Server matcher GPS-koordinater mot regler lagret i Config-tabben under nøkkel `locations`. Format:

```json
{
  "rules": [
    {
      "id": "kontor",
      "name": "Kontoret",
      "latitude": 59.913900,
      "longitude": 10.752200,
      "radiusMeters": 150,
      "locationType": "office"
    },
    {
      "id": "hjemme",
      "name": "Hjemme",
      "latitude": 59.920000,
      "longitude": 10.700000,
      "radiusMeters": 100,
      "locationType": "home"
    }
  ]
}
```

Inntil et UI for redigering finnes: rediger `Config!A:B` direkte i Google Sheet, sett `key="locations"` og lim inn JSON-en over som `value`.

Tips for radius:
- 100-150 m for vanlig kontorbygg
- 50 m for liten leilighet
- 200-300 m for stort campus/fabrikk

## 4. Bygg en Shortcut

### Shortcut: "Logg ankomst"

1. Åpne **Shortcuts** → **+** (ny)
2. Gi den navnet `Logg ankomst`
3. Legg til actions:
   - **Get Current Location** (hvis du vil ha geofence)
   - **Get Contents of URL**
     - URL: `https://<din-app>.vercel.app/api/entries/auto`
     - Method: `POST`
     - Headers:
       - `x-api-key`: `<API_KEY>`
       - `Content-Type`: `application/json`
       - `Idempotency-Key`: bruk magic-variabel `Current Date` formatert som ISO + `arrive` (f.eks. `arrive-2026-05-03T08:30`)
     - Request Body: `JSON`
       ```json
       {
         "action": "arrive",
         "deviceId": "iphone",
         "lat": <Latitude fra Current Location>,
         "lon": <Longitude fra Current Location>
       }
       ```
   - **Show Notification** (valgfri): "Ankomst logget kl. <Dictionary Value `arrived` from Get Contents of URL>"

### Shortcut: "Logg avgang"

Samme oppsett, men `"action": "depart"` og `Idempotency-Key`: `depart-<dato>T<time>`.

## 5. Automatiser med geofence (anbefales)

Dette er det største løftet — null knappetrykk:

1. Åpne **Shortcuts** → **Automation** (nederst)
2. **+** → **Create Personal Automation**
3. Velg **Arrive** → tast inn kontoradresse + ankomstradius (f.eks. 150 m)
4. Velg tidspunkt-vindu (f.eks. 06:00-10:00 hverdager)
5. **Next** → **Add Action** → **Run Shortcut** → velg `Logg ankomst`
6. Skru av **Ask Before Running** (krever iOS 17+)
7. **Done**

Lag tilsvarende automation for **Leave** → `Logg avgang`.

### Tips
- Sett tidsvindu så automation ikke fyrer hvis du svipper innom kontoret en lørdag
- Bruk `Idempotency-Key` for å overleve at iOS noen ganger trigger Arrive 2-3 ganger på rad
- Test først med Ask Before Running PÅ for å bekrefte at den fyrer riktig

## 6. NFC-tag (alternativ / komplement)

For maks pålitelighet: kjøp en NFC-tag (NTAG215, ~2 kr/stk).

1. Klistr taggen på laptop-stativet eller dørkarmen
2. **Shortcuts** → **Automation** → **+** → **NFC**
3. **Scan** taggen → gi den et navn
4. **Add Action** → **Run Shortcut** → velg `Logg ankomst`
5. Skru av **Ask Before Running**

Tap = arrive. Lag en annen tag for depart (f.eks. ved garderoben).

## 7. Apple Watch

Shortcuts kjører også på Watch. Lag en complication eller Smart Stack-widget som viser dine arrive/depart-shortcuts → tap fra håndleddet.

## 8. Feilsøking

| Symptom | Sjekk |
|---|---|
| `401 Unauthorized` | `x-api-key`-header mangler eller stemmer ikke med `API_KEY` env-var |
| `400 No active arrival found` | Du kalte `depart` uten en `arrive` først (eller `deviceId` er forskjellig) |
| Location feil | Sjekk at `locations`-config har riktige koordinater og stor nok `radiusMeters` |
| Dobbel logging | Bruk `Idempotency-Key` med tidsstempel — server deduplikerer i 5 min |
| Automation fyrer ikke | iOS krever at du kjørte den manuelt minst én gang først; sjekk også at "Ask Before Running" er av |

## 9. Sikkerhet

- `API_KEY` er en delt hemmelighet. Roter ved mistanke om lekkasje.
- Ikke commit nøkkelen til git — den ligger i `.env` (ignored) og som env-var i Vercel.
- Per-device `deviceId` er **ikke** autentisering — det er bare en navngivning. Alle med `API_KEY` kan bruke alle device-ids.
