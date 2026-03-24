# Beer Tracker App — Product Specification

## Overview

A mobile-first PWA for logging, reviewing, and analyzing personal beer consumption. No authentication required — all data is stored locally on device. Optionally bootstrapped from a curated local beer list file.

---

## Platform

- **Type:** Progressive Web App (PWA)
- **Target:** Mobile browsers (iOS Safari, Android Chrome)
- **Offline support:** Yes — service worker caching for full offline use
- **Storage:** `localStorage` / IndexedDB (client-side only, no backend)

---

## Core Features

### 1. Beer Logging

Each check-in records:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Beer name |
| `brewery` | string | Brewery name |
| `style` | string | e.g. IPA, Stout, Lager |
| `rating` | number | 1–5 stars (0.5 increments) |
| `notes` | string | Free-text tasting notes |
| `photo` | image | Optional, captured or uploaded |
| `date` | datetime | Auto-populated, editable |

### 2. Beer Catalog / Entry

- **Manual entry:** Form-based input for all fields
- **Local file import:** Load a curated `.json` (or `.csv`) beer list on first launch or via settings; beers from this list are selectable via search/autocomplete to pre-fill name, brewery, and style
- Pre-filled entries are still fully editable before saving

### 3. Beer Journal (Feed View)

- Reverse-chronological list of all check-ins
- Card per entry showing: photo thumbnail, name, brewery, style, rating, date
- Tap to expand / edit / delete
- Search and filter by name, brewery, style, date range

### 4. Stats & Analytics

Focus: **style and brewery breakdowns**

| Chart / Stat | Description |
|---|---|
| Beers by Style | Donut or bar chart of check-in counts per style |
| Beers by Brewery | Bar chart ranked by check-in frequency |
| Top Rated by Style | Average rating per style |
| Top Rated by Brewery | Average rating per brewery |
| Total check-ins | Running count with date of first log |
| Unique beers | Count of distinct name+brewery combos |

---

## Local Beer List File Format

Curated list loaded from a user-supplied file (JSON preferred):

```json
[
  {
    "name": "Heady Topper",
    "brewery": "The Alchemist",
    "style": "Double IPA"
  }
]
```

- Loaded via a file picker in Settings
- Stored in IndexedDB after first import
- Used to power autocomplete in the entry form

---

## Navigation

Four-tab bottom nav:

| Tab | Icon | Description |
|---|---|---|
| Log | ➕ | New check-in form |
| Journal | 📋 | Feed of past entries |
| Stats | 📊 | Analytics dashboard |
| Settings | ⚙️ | Import beer list, export data, clear data |

---

## Settings

- **Import beer list:** Load curated `.json` file
- **Export data:** Download all check-ins as `.json`
- **Clear all data:** Destructive action with confirmation

---

## Data Model

### `CheckIn`

```json
{
  "id": "uuid",
  "name": "string",
  "brewery": "string",
  "style": "string",
  "rating": 3.5,
  "notes": "string",
  "photoDataUrl": "base64 string or null",
  "date": "ISO 8601 string"
}
```

### `CatalogBeer`

```json
{
  "name": "string",
  "brewery": "string",
  "style": "string",
  "photo": "relative image path or null",
  "retailPrice": 12.00
}
```

---

## Tech Stack (Suggested)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Vanilla JS or React | Vanilla keeps bundle small; React if component complexity grows |
| Storage | IndexedDB via `idb` library | Better than localStorage for photos |
| Charts | Chart.js or Recharts | Lightweight, mobile-friendly |
| PWA | Workbox | Service worker + caching |
| Styling | CSS custom properties | Mobile-first, no heavy framework needed |

---

## Startup Experience

On every app open, before showing the main UI, display a **daily check-in prompt**:

### "Did you have a beer today?"

**Yes →**
1. Show a dropdown/searchable list of beers from the local catalog file
   - Each option displays the beer's **photo** (from the catalog) alongside name and brewery
   - User selects a beer to pre-fill the log form (name, brewery, style, photo)
   - User adds rating and notes, then saves
2. After saving, proceed to the main app (default to Stats tab)

**No →**
Present two options:
- **Log a past beer** — open the log form with date picker defaulting to yesterday (or user-chosen date)
- **View my stats** — go straight to the Stats dashboard

### Notes
- Prompt appears once per app session, not once per calendar day — so reopening the app re-triggers it
- If today's date already has a check-in logged, the prompt should acknowledge it: *"Looks like you already logged one today — have another?"*
- The catalog file must include a `photoUrl` or bundled image reference per beer (see updated file format below)

### Updated Local Catalog File Format

```json
[
  {
    "name": "Heady Topper",
    "brewery": "The Alchemist",
    "style": "Double IPA",
    "photo": "heady-topper.jpg",
    "retailPrice": 12.00
  }
]
```

- Photos are bundled alongside the catalog file (e.g. in an `images/` subfolder)
- The `photo` field is a relative path or filename resolved against a known base path
- Falls back to a generic beer placeholder image if photo is missing

---

## Membership Pace Tracking

### Setup

User configures once in Settings:

| Field | Type | Notes |
|---|---|---|
| `membershipCost` | number | Total amount paid upfront (e.g. $2,000) |
| `startDate` | date | Date membership began |
| `entitlement` | string | Fixed label: "1 free drink per day for life" |

### Per Check-In

- When a beer is selected from the catalog, its `retailPrice` is inherited and stored on the `CheckIn` record at the time of logging (snapshot, in case catalog prices change later)
- If a beer is entered manually without a catalog match, `retailPrice` may be left null — that check-in contributes $0 to redeemed value

### Pace Dashboard (new Stats section)

| Metric | Calculation |
|---|---|
| **Total redeemed value** | Sum of `retailPrice` across all check-ins |
| **Break-even progress** | `totalRedeemed / membershipCost` as a progress bar (0–100%+) |
| **Break-even date (projected)** | `startDate + (membershipCost / dailyAvgValue)` days |
| **Daily avg redeemed** | `totalRedeemed / daysSinceStart` |
| **Pace indicator** | Compare daily avg to required daily rate; show ahead/behind |
| **Days since start** | `today - startDate` |
| **Redemptions used** | Count of check-ins with a `retailPrice` logged |
| **Missed days** | `daysSinceStart - redemptionsUsed` (days with no logged redemption) |
| **Cost per drink** | `membershipCost / totalCheckIns` — updates with every logged drink |

### Pace Indicator Logic

- **Required daily rate** = `membershipCost / daysSinceStart` (recalculates daily — no fixed end date)
- **Ahead of pace:** `dailyAvgValue >= requiredDailyRate` → green indicator
- **Behind pace:** `dailyAvgValue < requiredDailyRate` → yellow/red indicator
- Since the membership is "for life," pace is relative to elapsed time only — the goal is to minimize time-to-break-even

### Membership Config (stored in IndexedDB)

```json
{
  "membershipCost": 2000,
  "startDate": "ISO 8601 string"
}
```

---

## Development & Testing

- **Local dev:** Use Vite as the dev server (`npm run dev`) — hot reload works in desktop browser without reinstalling anything
- **Mobile testing:** Access the local Vite server from a phone on the same WiFi network via `http://<local-ip>:5173` — no install needed
- **PWA install:** Only install to home screen for final testing; service worker caching can interfere with dev iteration so disable it in dev mode
- **Device emulation:** Chrome DevTools mobile emulator covers most layout testing without touching a phone

---

## Out of Scope (v1)

- User accounts or sync
- Social features / sharing
- External API lookup (e.g. Untappd, Open Beer DB)
- ABV / IBU tracking
- Geolocation / venue tagging
