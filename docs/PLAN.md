# Utviklingsplan — horavo

## Fase 1: Kjernefunksjonalitet (Ferdig)

- [x] Prosjektoppsett (Next.js 16, Tailwind 4, TypeScript)
- [x] Autentisering (Google OAuth, email-allowlist)
- [x] Google Sheets-integrasjon (CRUD for tidsregistreringer + config)
- [x] Middleware (auth, rate limiting, security headers)
- [x] Datamodell og types
- [x] Avspaserings-beregning med konfigurerbare arbeidstidsregler
- [x] Dashboard (dagens status, ukeoversikt, flex-saldo, månedsoppsummering)
- [x] Timelogg (feed gruppert per dag, inline-redigering, legg til/slett)
- [x] Innsikt (statistikk, mønster-analyse, sted-fordeling)
- [x] Innstillinger (arbeidstidsregler, perioder, flex-startsaldo, konto)
- [x] Auto-logging API for Shortcuts
- [x] Dark/light theme
- [x] Responsivt design (desktop + mobil)

## Fase 2: AI og Automasjon (Neste)

- [ ] **AI-parsing av naturlig språk**
  - "Jobbet hjemmefra 8-16" → strukturert entry
  - Bruk Groq/Llama for parsing
  - Endpoint: POST /api/entries/auto med action: "parse"

- [ ] **Arrive/depart auto-logging**
  - iOS Shortcut sender GPS-koordinater ved ankomst/avreise
  - Appen matcher mot konfigurerte lokasjonsregler
  - Automatisk oppretter start/stopp-registreringer
  - State tracking (vet om bruker er "på jobb" eller ikke)

- [ ] **Anomali-deteksjon**
  - Varsler om uvanlig lange/korte dager
  - "Du logget 12 timer i går, stemmer det?"
  - Manglende registreringer (hverdager uten entries)

- [ ] **Smart forslag**
  - Auto-fyller start/slutt basert på mønster
  - Foreslår type basert på tid/sted
  - Lærer brukerens vanlige rutiner

## Fase 3: Utvidelser

- [ ] **Widget API** (/api/widget)
  - Kompakt status for iOS-widgets
  - Viser: flex-saldo, timer i dag, status

- [ ] **Eksport**
  - CSV/Excel-eksport av timelogg
  - Månedsrapporter for arbeidsgiverdokumentasjon

- [ ] **Kalender-integrasjon**
  - Synk med Google Calendar
  - Auto-logg basert på kalenderhendelser

- [ ] **Team-funksjonalitet**
  - Flere brukere i samme sheet
  - Oversikt over teamets tilgjengelighet
  - Felles kalender

- [ ] **Varsler/påminnelser**
  - Push-varsler om manglende registreringer
  - Daglig påminnelse om å logge tid
  - Ukentlig oppsummering

- [ ] **PWA-forbedringer**
  - Service worker for offline-støtte
  - Install-prompt
  - Background sync

## Arkitektur-notater

### Google Sheets som database
- Enkel, gratis, fungerer for én bruker
- ~250 rader/år ved daglig logging
- Alle beregninger gjøres client-side
- Config lagres i eget ark (key-value)
- Begrensning: Ingen concurrent writes, ingen relasjoner
- Kan migreres til Supabase/PostgreSQL ved behov

### Avspaserings-beregning
- Flex = sum(faktisk arbeid) - sum(forventet arbeid) + startsaldo
- Forventet arbeid varierer per periode (sommertid/normaltid)
- Ferie/syk teller som "forventet" (ingen flex-effekt)
- Avspasering trekker fra flex-saldoen
- Helger ignoreres automatisk

### Auto-logging flow
```
iOS Shortcut (geofence trigger)
  → POST /api/entries/auto
    → Match GPS mot lokasjonsregler
    → Bestem action (arrive/depart)
    → Opprett/oppdater entry i Sheet
    → Returner bekreftelse
```
