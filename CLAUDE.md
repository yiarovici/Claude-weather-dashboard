# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A minimal single-page weather dashboard built with vanilla HTML/CSS/JS (no build step, no dependencies).

- `index.html` — markup and app shell
- `style.css` — all styles
- `app.js` — all logic

Open `index.html` directly in a browser to run it. No server or build required.

## APIs used

- **Open-Meteo** (`api.open-meteo.com`) — 5-day forecast, no API key needed
- **Open-Meteo Geocoding** (`geocoding-api.open-meteo.com`) — city name → coordinates
- **Nominatim / OpenStreetMap** (`nominatim.openstreetmap.org`) — coordinates → city name (reverse geocode)

## Architecture

The app follows a simple linear flow:

1. On load, `tryGeolocation()` requests the browser's location.
2. If denied or unavailable, the city search form is shown.
3. Once coordinates are known, `loadWeather(lat, lon, name)` fetches forecast + reverse-geocodes in parallel.
4. `renderForecast()` builds day cards from the Open-Meteo `daily` response.

WMO weather codes are mapped to labels and emoji in the `WMO` constant at the top of `app.js`.

## Conventions

- Temperatures come from Open-Meteo in °C; `Math.round()` is applied before display.
- `forecast_days=5` is hardcoded in the API call — the daily arrays always have exactly 5 entries.
- DOM helpers `show(id)` / `hide(id)` / `setError(id, msg)` are used throughout instead of direct class manipulation.
