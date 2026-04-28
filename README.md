# tempo

En moderne, AI-first app for automatisk og fleksibel tidslogging.

## Tech Stack

- **Next.js 16** (App Router) med **React 19**
- **TypeScript 5**
- **Tailwind CSS 4** med custom glass-card design system
- **TanStack React Query 5** for data fetching
- **Recharts** for grafer
- **NextAuth v5** (Google OAuth) med email-allowlist
- **Google Sheets** som database (via service account)
- **Groq** (Llama) for AI-funksjoner

## Funksjoner

### Kjernefunksjoner
- **Dashboard** — Dagens status, ukeoversikt, avspaserings-saldo, månedsoppsummering
- **Timelogg** — Full liste over registreringer, gruppert per dag, med inline-redigering
- **Innsikt** — Statistikk og mønster-analyse (snitt start/slutt, sted-fordeling, timer per type)
- **Innstillinger** — Konfigurerbare arbeidstidsregler med perioder (f.eks. sommertid)

### Avspaserings-system
- Automatisk beregning av flex-saldo basert på arbeidstidsregler
- Støtte for ulike perioder (f.eks. 7t sommertid mai-aug, 7.5t resten av året)
- Startsaldo for migrering fra andre systemer
- Typer: Arbeid, Avspasering, Ferie, Syk, Permisjon

### Auto-logging (Shortcuts)
- API-endepunkt for iOS Shortcuts / eksterne triggere
- Støtte for manuell logging via API (`action: "log"`)
- Planlagt: Geofence-basert arrive/depart, AI-parsing av naturlig språk

### PWA-varsler
- Installer appen på hjemskjermen og aktiver varsler under Innstillinger
- Generer VAPID-nøkler med `npx web-push generate-vapid-keys`
- Kjør morgen-nudge fra cron/Shortcuts med `POST /api/push/nudge` og header `x-api-key: <API_KEY>`

### Design
- Dark/light theme med glass-morphism design
- Responsivt: sidebar på desktop, floating bottom nav på mobil
- Staggered entrance-animasjoner
- Norsk UI

## Kom i gang

Se [SETUP.md](./docs/SETUP.md) for detaljert oppsettguide.

```bash
# Installer avhengigheter
npm install

# Sett opp miljøvariabler
cp .env.example .env
# Fyll inn verdiene i .env

# Start utviklingsserver
npm run dev
```

## Prosjektstruktur

```
src/
├── app/
│   ├── (tabs)/              # Hovedapp med tab-layout
│   │   ├── page.tsx          # Dashboard
│   │   ├── timelogg/         # Timelogg-side
│   │   ├── innsikt/          # Innsikt-side
│   │   └── innstillinger/    # Innstillinger
│   ├── api/
│   │   ├── entries/          # CRUD for tidsregistreringer
│   │   ├── entries/auto/     # Auto-logging API
│   │   ├── config/           # Config CRUD
│   │   └── auth/             # NextAuth
│   └── login/                # Login-side
├── components/
│   ├── dashboard/            # Dashboard-komponenter
│   ├── timelogg/             # Timelogg-komponenter
│   └── layout/               # Sidebar, MobileNav
├── hooks/                    # React Query hooks
├── context/                  # Theme context
└── lib/                      # Utils, types, API, Google Sheets
```
