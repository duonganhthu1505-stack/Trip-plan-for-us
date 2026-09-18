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
      if (direct) return Response.json({ ...direct, resolvedUrl: current });

      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'user-agent': 'Mozilla/5.0 TripPlanForUs/1.0' }
      });
      const location = response.headers.get('location');
      if (!location) {
        const finalCoords = extractCoords(response.url || current);
        return Response.json(finalCoords ? { ...finalCoords, resolvedUrl: response.url || current } : { resolvedUrl: response.url || current });
      }
      const next = new URL(location, current);
      if (!ALLOWED_HOSTS.has(next.hostname)) return Response.json({ error: 'Unexpected redirect host' }, { status: 400 });
      current = next.toString();
    }
    const coords = extractCoords(current);
    return Response.json(coords ? { ...coords, resolvedUrl: current } : { resolvedUrl: current });
  } catch {
    return Response.json({ error: 'Could not resolve Google Maps link' }, { status: 422 });
  }
};
