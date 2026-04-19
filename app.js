// WMO Weather interpretation codes → { label, emoji }
const WMO = {
  0:  { label: "Clear sky",        emoji: "☀️" },
  1:  { label: "Mainly clear",     emoji: "🌤️" },
  2:  { label: "Partly cloudy",    emoji: "⛅" },
  3:  { label: "Overcast",         emoji: "☁️" },
  45: { label: "Fog",              emoji: "🌫️" },
  48: { label: "Icy fog",          emoji: "🌫️" },
  51: { label: "Light drizzle",    emoji: "🌦️" },
  53: { label: "Drizzle",          emoji: "🌦️" },
  55: { label: "Heavy drizzle",    emoji: "🌧️" },
  61: { label: "Light rain",       emoji: "🌧️" },
  63: { label: "Rain",             emoji: "🌧️" },
  65: { label: "Heavy rain",       emoji: "🌧️" },
  71: { label: "Light snow",       emoji: "🌨️" },
  73: { label: "Snow",             emoji: "❄️" },
  75: { label: "Heavy snow",       emoji: "❄️" },
  77: { label: "Snow grains",      emoji: "🌨️" },
  80: { label: "Light showers",    emoji: "🌦️" },
  81: { label: "Showers",          emoji: "🌧️" },
  82: { label: "Violent showers",  emoji: "⛈️" },
  85: { label: "Snow showers",     emoji: "🌨️" },
  86: { label: "Heavy snow shower",emoji: "❄️" },
  95: { label: "Thunderstorm",     emoji: "⛈️" },
  96: { label: "Thunderstorm+hail",emoji: "⛈️" },
  99: { label: "Thunderstorm+hail",emoji: "⛈️" },
};

function wmo(code) {
  return WMO[code] ?? { label: "Unknown", emoji: "🌡️" };
}

const $ = id => document.getElementById(id);

function show(id)  { $(id).classList.remove("hidden"); }
function hide(id)  { $(id).classList.add("hidden"); }
function setError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  msg ? el.classList.remove("hidden") : el.classList.add("hidden");
}

// ── API calls ──────────────────────────────────────────────────────────────

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();
  if (!data.results?.length) throw new Error(`No results for "${city}"`);
  const { latitude, longitude, name, country } = data.results[0];
  return { lat: latitude, lon: longitude, name: `${name}, ${country}` };
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Your location";
  const country = data.address?.country_code?.toUpperCase() ?? "";
  return country ? `${city}, ${country}` : city;
}

async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather request failed");
  return res.json();
}

// ── Rendering ──────────────────────────────────────────────────────────────

function formatDay(dateStr, index) {
  if (index === 0) return "Today";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function renderForecast(data, locationName) {
  const { time, weathercode, temperature_2m_max, temperature_2m_min } = data.daily;
  const cards = time.map((date, i) => {
    const { label, emoji } = wmo(weathercode[i]);
    const hi = Math.round(temperature_2m_max[i]);
    const lo = Math.round(temperature_2m_min[i]);
    return `
      <div class="card">
        <div class="day">${formatDay(date, i)}</div>
        <div class="icon">${emoji}</div>
        <div class="desc">${label}</div>
        <div class="temps">${hi}°<span class="low">${lo}°</span></div>
      </div>`;
  }).join("");

  $("location-name").textContent = locationName;
  $("cards").innerHTML = cards;
  hide("loading");
  show("forecast");
}

// ── Flow ───────────────────────────────────────────────────────────────────

async function loadWeather(lat, lon, name) {
  hide("location-form");
  hide("forecast");
  setError("global-error", "");
  show("loading");
  try {
    const [forecast, locationName] = await Promise.all([
      fetchForecast(lat, lon),
      name ? Promise.resolve(name) : reverseGeocode(lat, lon),
    ]);
    renderForecast(forecast, locationName);
  } catch (err) {
    hide("loading");
    setError("global-error", err.message);
    show("location-form");
  }
}

function tryGeolocation() {
  if (!navigator.geolocation) {
    show("location-form");
    return;
  }
  show("loading");
  navigator.geolocation.getCurrentPosition(
    pos => loadWeather(pos.coords.latitude, pos.coords.longitude),
    ()  => { hide("loading"); show("location-form"); },
    { timeout: 8000 }
  );
}

// ── Event listeners ────────────────────────────────────────────────────────

$("search-form").addEventListener("submit", async e => {
  e.preventDefault();
  const city = $("city-input").value.trim();
  if (!city) return;
  setError("form-error", "");
  $("search-form").querySelector("button").disabled = true;
  try {
    const { lat, lon, name } = await geocode(city);
    await loadWeather(lat, lon, name);
    $("city-input").value = "";
  } catch (err) {
    setError("form-error", err.message);
  } finally {
    $("search-form").querySelector("button").disabled = false;
  }
});

$("change-location").addEventListener("click", () => {
  hide("forecast");
  setError("global-error", "");
  show("location-form");
  $("city-input").focus();
});

// ── Init ───────────────────────────────────────────────────────────────────

tryGeolocation();
