// src/geocode.js
//
// Turns free-text location entities (KYC addresses, mobile-tower
// locations, etc.) into { lat, lng } coordinates so the frontend's
// Geographic Intelligence panel can plot real pins on a map.
//
// Uses OpenStreetMap's Nominatim geocoding API -- it's free and needs
// no API key, which matters here since this repo has no Google Maps
// billing account wired up. If a GOOGLE_MAPS_API_KEY is present in the
// environment, this switches to the Google Geocoding API instead (same
// output shape), so the accuracy improves automatically once a key is
// added -- no code changes needed on either the caller or frontend side.
//
// Ground rules, mirroring the rest of this codebase:
//   1. Never invents coordinates -- a location that fails to geocode
//      (bad address, offline, rate-limited) simply comes back `null`
//      and is left out of the map; it is NOT guessed.
//   2. Every result is cached in-process by its exact input string, so
//      re-investigating a case (which re-extracts the same address
//      text) never re-hits the network for an address we've already
//      resolved, and we stay well inside Nominatim's 1 req/sec usage
//      policy.
//   3. Geocoding failures never throw -- a bad network call must not
//      break the investigation pipeline that called it.

const cache = new Map(); // raw address text -> { lat, lng, displayName } | null

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// Nominatim's usage policy caps unauthenticated use at ~1 request/sec.
// This tiny queue serializes our calls so a burst of new addresses
// (e.g. several legal-request responses recorded back to back) doesn't
// fire concurrent requests and get the service rate-limited or blocked.
let queue = Promise.resolve();
function throttle(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => new Promise((resolve) => setTimeout(resolve, 1100)),
    () => new Promise((resolve) => setTimeout(resolve, 1100))
  );
  return run;
}

async function geocodeWithGoogle(address, apiKey) {
  const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google geocoding HTTP ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    displayName: result.formatted_address,
  };
}

async function geocodeWithNominatim(address) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: {
      // Nominatim's usage policy requires a real identifying User-Agent.
      "User-Agent": "CrimeOS-Investigation-Platform/1.0 (cybercrime case geolocation)",
    },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.[0];
  if (!result) return null;
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
  };
}

/**
 * Resolve a free-text location string to coordinates.
 * @param {string} address
 * @returns {Promise<{lat:number, lng:number, displayName:string}|null>}
 */
export async function geocodeAddress(address) {
  const text = (address || "").trim();
  if (!text) return null;

  if (cache.has(text)) return cache.get(text);

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const result = await throttle(() =>
      apiKey ? geocodeWithGoogle(text, apiKey) : geocodeWithNominatim(text)
    );
    cache.set(text, result);
    return result;
  } catch (err) {
    console.error(`[geocode] Failed to geocode "${text}":`, err.message);
    // Cache the miss too -- a temporarily-unresolvable/garbage address
    // shouldn't be re-tried (and re-throttled) on every reinvestigation.
    cache.set(text, null);
    return null;
  }
}

/**
 * Geocode every entity of the given types in place, attaching
 * `lat`/`lng`/`geocodedDisplayName` to entities that resolve. Entities
 * that fail to geocode are left untouched (no lat/lng) rather than
 * dropped, so they still show up in text-based views.
 *
 * @param {Array<{type:string, value:string}>} entities
 * @param {string[]} locationTypes e.g. ["KYC_ADDRESS", "TOWER_LOCATION"]
 */
export async function attachGeocoding(entities, locationTypes) {
  const targets = entities.filter((e) => locationTypes.includes(e.type) && e.value);

  // Sequential (not Promise.all) so the throttle queue above is the only
  // thing pacing requests -- avoids firing N concurrent fetches that all
  // then queue up anyway.
  for (const entity of targets) {
    const geo = await geocodeAddress(entity.value);
    if (geo) {
      entity.lat = geo.lat;
      entity.lng = geo.lng;
      entity.geocodedDisplayName = geo.displayName;
    }
  }

  return entities;
}
