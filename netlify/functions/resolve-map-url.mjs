const ALLOWED_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com', 'maps.google.com']);

const extractCoords = (url) => {
  if (!url) return null;
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch {}
  const patterns = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:query|q|destination)=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/i,
    /[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/i
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        return { latitude, longitude };
      }
    }
  }
  return null;
};

// Documented Google Maps URL parameters that carry a real Places API Place ID.
const PLACE_ID_PARAMS = ['query_place_id', 'destination_place_id', 'origin_place_id', 'place_id'];

// Places API IDs are opaque URL-safe tokens. Google's own share URLs also embed
// them inside the `data=` payload as `!1sChIJ...`. Hexadecimal CID/feature ids
// (`0x31752f...:0x...`) are NOT Place IDs and must never be treated as such.
const isLikelyPlaceId = (value) =>
  typeof value === 'string' && /^(ChIJ|GhIJ|EicR|Ei[A-Za-z0-9])[A-Za-z0-9_-]{10,}$/.test(value);

const extractPlaceId = (url) => {
  if (!url) return null;
  let parsed = null;
  try { parsed = new URL(url); } catch { parsed = null; }
  if (parsed) {
    for (const key of PLACE_ID_PARAMS) {
      const value = parsed.searchParams.get(key);
      if (isLikelyPlaceId(value)) return value;
    }
  }
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch {}
  const embedded = decoded.match(/!1s(ChIJ[A-Za-z0-9_-]{10,})/);
  if (embedded && isLikelyPlaceId(embedded[1])) return embedded[1];
  return null;
};

// The exact place name Google itself put in the /maps/place/<name>/ path segment.
// This is Google's own label for the place, never the user's itinerary title.
const extractPlaceName = (url) => {
  if (!url) return null;
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!match) return null;
  let name = match[1];
  try { name = decodeURIComponent(name); } catch {}
  name = name.replace(/\+/g, ' ').trim();
  if (!name || /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(name)) return null;
  return name.slice(0, 200);
};

// One place identity payload per resolved URL. Fields are null when the saved
// link genuinely does not contain them; callers must not invent replacements.
const buildResult = (resolvedUrl, coords) => ({
  resolvedUrl,
  latitude: coords ? coords.latitude : null,
  longitude: coords ? coords.longitude : null,
  placeId: extractPlaceId(resolvedUrl),
  placeName: extractPlaceName(resolvedUrl)
});

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { url } = await request.json();
    if (typeof url !== 'string' || url.length > 2000) return Response.json({ error: 'Invalid URL' }, { status: 400 });
    const input = new URL(url);
    if (input.protocol !== 'https:' || !ALLOWED_HOSTS.has(input.hostname)) {
      return Response.json({ error: 'Only Google Maps links are supported' }, { status: 400 });
    }

    let current = input.toString();
    for (let i = 0; i < 6; i += 1) {
      const direct = extractCoords(current);
      const identity = buildResult(current, direct);
      // Keep following redirects while the place identity is still incomplete.
      if (direct && (identity.placeId || identity.placeName)) return Response.json(identity);

      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'user-agent': 'Mozilla/5.0 TripPlanForUs/1.0' }
      });
      const location = response.headers.get('location');
      if (!location) {
        const finalUrl = response.url || current;
        return Response.json(buildResult(finalUrl, extractCoords(finalUrl)));
      }
      const next = new URL(location, current);
      if (!ALLOWED_HOSTS.has(next.hostname)) return Response.json({ error: 'Unexpected redirect host' }, { status: 400 });
      current = next.toString();
    }
    return Response.json(buildResult(current, extractCoords(current)));
  } catch {
    return Response.json({ error: 'Could not resolve Google Maps link' }, { status: 422 });
  }
};
