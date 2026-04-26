# Oppsett

## Forutsetninger

- Node.js 18+
- Google Cloud-prosjekt med OAuth og Sheets API aktivert
- Google-konto som er listet i ALLOWED_EMAILS

## 1. Google Cloud oppsett

### OAuth (for innlogging)
1. Gå til [Google Cloud Console](https://console.cloud.google.com)
2. Opprett et nytt prosjekt (eller bruk eksisterende)
3. Aktiver "Google Sheets API"
4. Gå til **APIs & Services > Credentials**
5. Opprett **OAuth 2.0 Client ID** (Web application)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Kopier Client ID og Client Secret

### Service Account (for Sheets-tilgang)
1. Gå til **APIs & Services > Credentials**
2. Opprett **Service Account**
3. Last ned JSON-nøkkelfilen
4. Kopier `client_email` og `private_key` fra filen

### Google Sheet
1. Opprett et nytt Google Spreadsheet
2. Navngi det første arket "Timelogg"
3. Legg til headers i rad 1: `Timestamp | Date | Start | End | Duration | Type | Location | Note | Auto`
4. Opprett et nytt ark kalt "Config" (ingen headers nødvendig)
5. Del spreadsheet med service account-emailen (Viewer eller Editor)
6. Kopier spreadsheet-ID fra URL-en

## 2. Miljøvariabler

Kopier `.env.example` til `.env` og fyll inn:

```env
# Google OAuth (fra steg 1)
AUTH_GOOGLE_ID=din-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=din-client-secret

# NextAuth secret (generer med: openssl rand -base64 32)
AUTH_SECRET=en-tilfeldig-streng

# Tillatte e-poster (kommaseparert)
ALLOWED_EMAILS=din@email.com,kollega@email.com

# Google Sheets Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=sa@prosjekt.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=din-spreadsheet-id
GOOGLE_SHEET_NAME=Timelogg

# AI (Groq - for fremtidige AI-funksjoner)
GROQ_API_KEY=din-groq-api-key

# API-nøkkel for Shortcuts/widgets
API_KEY=en-tilfeldig-api-nøkkel
```

## 3. Installer og kjør

```bash
npm install
npm run dev
```

Åpne http://localhost:3000 i nettleseren.

## 4. Google Sheet-struktur

### Timelogg-arket (kolonner A-I)

| Kolonne | Header    | Type    | Eksempel            |
|---------|-----------|---------|---------------------|
| A       | Timestamp | string  | 2025-04-28T08:00:00Z |
| B       | Date      | string  | 28.04.2025          |
| C       | Start     | string  | 08:00               |
| D       | End       | string  | 16:00               |
| E       | Duration  | number  | 7.5                 |
| F       | Type      | string  | work                |
| G       | Location  | string  | office              |
| H       | Note      | string  | Møte med teamet     |
| I       | Auto      | string  | false               |

### Config-arket (kolonner A-B)

| Key           | Value (JSON-streng)                                    |
|---------------|--------------------------------------------------------|
| work-rules    | `{"defaultHoursPerDay":7.5,"periods":[...]}`          |
| flex-balance  | `{"startBalance":0,"startDate":"01.01.2025"}`         |
| locations     | `{"rules":[...]}`                                      |

## 5. iOS Shortcuts-integrasjon

For å auto-logge timer via iOS Shortcuts, bruk endepunktet:

```
POST /api/entries/auto
Headers: x-api-key: din-api-nøkkel
Content-Type: application/json

Body:
{
  "action": "log",
  "start": "08:00",
  "end": "16:00",
  "type": "work",
  "location": "office",
  "note": "Via Shortcut"
}
```

## Deployment

Appen kan deployes på Vercel:

1. Push til GitHub
2. Importer prosjektet i Vercel
3. Legg til alle miljøvariabler
4. Oppdater OAuth redirect URI til produksjons-URL
