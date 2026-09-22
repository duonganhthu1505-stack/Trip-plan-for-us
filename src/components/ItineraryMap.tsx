import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Activity } from '../types';

interface ItineraryMapProps {
  activities: Activity[];
  selectedDay: string;
  dayIndex: number;
  destination?: string;
  /** Emits driving distance/duration per consecutive stop pair, or null when no route. */
  onRouteLegsChange?: (legs: RouteLegInfo[] | null) => void;
}

export interface RouteLegInfo {
  fromActivityId: string;
  toActivityId: string;
  distanceKm: number;
  durationMin: number;
}

type LatLng = [number, number];

interface PlaceIdentity {
  coords: LatLng | null;
  resolvedUrl?: string;
  placeId?: string;
  placeName?: string;
}

interface ResolvedStop extends PlaceIdentity {
  activity: Activity;
}

interface RouteSegment {
  label: string;
  url: string;
  stops: ResolvedStop[];
}

// Google Maps Directions URLs accept a limited number of waypoints, and the
// mobile apps accept fewer than the desktop site. Four stops per segment
// (origin + 2 waypoints + destination) is safely inside every documented
// limit, so a long itinerary is split instead of having stops dropped.
const MAX_STOPS_PER_SEGMENT = 4;

const parseCoordsFromUrl = (url?: string): LatLng | null => {
  if (!url) return null;
  const decoded = decodeURIComponent(url);
  const patterns = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:query|q|destination)=(-?\d{1,3}\.\d+)%?2C(-?\d{1,3}\.\d+)/i,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) return [Number(match[1]), Number(match[2])];
  }
  return null;
};

const parsePlaceNameFromUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const match = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!match) return undefined;
  let name = match[1];
  try { name = decodeURIComponent(name); } catch { /* keep raw */ }
  name = name.replace(/\+/g, ' ').trim();
  if (!name || /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(name)) return undefined;
  return name;
};

const resolveMapUrl = async (activity: Activity): Promise<PlaceIdentity> => {
  const savedUrl = activity.resolvedMapUrl || activity.mapUrl;
  const local: PlaceIdentity = {
    coords: Number.isFinite(activity.latitude) && Number.isFinite(activity.longitude)
      ? [Number(activity.latitude), Number(activity.longitude)]
      : parseCoordsFromUrl(savedUrl),
    resolvedUrl: activity.resolvedMapUrl || undefined,
    placeId: activity.googlePlaceId || undefined,
    placeName: activity.resolvedPlaceName || parsePlaceNameFromUrl(savedUrl)
  };

  // Already exact enough: a Place ID or Google's own place name pins the identity.
  if (local.coords && (local.placeId || local.placeName)) return local;

  // Short maps.app.goo.gl links cannot be expanded in the browser (opaque/CORS
  // restricted redirects). Resolve them on our own Netlify function instead.
  // Never geocode title/location text: a wrong place is worse than none.
  if (!activity.mapUrl) return local;
  try {
    const response = await fetch('/.netlify/functions/resolve-map-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: activity.mapUrl })
    });
    if (!response.ok) return local;
    const data = await response.json();
    const coords: LatLng | null = Number.isFinite(data?.latitude) && Number.isFinite(data?.longitude)
      ? [Number(data.latitude), Number(data.longitude)]
      : local.coords;
    return {
      coords,
      resolvedUrl: data?.resolvedUrl || local.resolvedUrl,
      placeId: local.placeId || data?.placeId || undefined,
      placeName: local.placeName || data?.placeName || undefined
    };
  } catch {
    // Explicitly unresolved. Do not invent a place from the activity name.
  }
  return local;
};

// A stop can only enter a Directions URL when we know the exact Google place.
// A bare coordinate is rejected on purpose: Google reverse-geocodes it and can
// show an unrelated neighbouring business instead of the saved place.
const isRoutable = (stop: ResolvedStop) => Boolean(stop.placeId || stop.placeName);

const stopQueryText = (stop: ResolvedStop) => {
  if (stop.placeName) return stop.placeName;
  // With a Place ID the query text is only a label; the ID decides the place.
  if (stop.coords) return `${stop.coords[0]},${stop.coords[1]}`;
  return '';
};

const buildSegmentUrl = (segment: ResolvedStop[]) => {
  const origin = segment[0];
  const destination = segment[segment.length - 1];
  const waypoints = segment.slice(1, -1);
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('origin', stopQueryText(origin));
  if (origin.placeId) params.set('origin_place_id', origin.placeId);
  params.set('destination', stopQueryText(destination));
  if (destination.placeId) params.set('destination_place_id', destination.placeId);
  if (waypoints.length) {
    params.set('waypoints', waypoints.map(stopQueryText).join('|'));
    // Only send the paired ID list when every waypoint has one, otherwise the
    // index alignment Google requires would break.
    if (waypoints.every((w) => w.placeId)) {
      params.set('waypoint_place_ids', waypoints.map((w) => w.placeId as string).join('|'));
    }
  }
  params.set('travelmode', 'driving');
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

// Itinerary order is preserved exactly; segments overlap on their boundary stop
// so the whole day stays continuous and no stop is ever discarded.
const buildRouteSegments = (stops: ResolvedStop[]): RouteSegment[] => {
  const routable = stops.filter(isRoutable);
  if (routable.length === 0) return [];
  if (routable.length === 1) {
    const only = routable[0];
    const url = only.activity.mapUrl?.trim() || only.resolvedUrl
      || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopQueryText(only))}`;
    return [{ label: 'Mở App Google Maps', url, stops: [only] }];
  }

  const chunks: ResolvedStop[][] = [];
  let index = 0;
  while (index < routable.length - 1) {
    const chunk = routable.slice(index, index + MAX_STOPS_PER_SEGMENT);
    chunks.push(chunk);
    index += MAX_STOPS_PER_SEGMENT - 1;
  }

  return chunks.map((chunk, i) => ({
    label: chunks.length === 1 ? 'Mở App Google Maps' : `Chặng ${i + 1}`,
    url: buildSegmentUrl(chunk),
    stops: chunk
  }));
};

export const ItineraryMap: React.FC<ItineraryMapProps> = ({
  activities,
  selectedDay,
  destination = '',
  onRouteLegsChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [resolvedStops, setResolvedStops] = useState<ResolvedStop[]>([]);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const totalDayCost = activities.reduce((sum, a) => sum + (a.actualCost || a.plannedCost || 0), 0);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      setIsResolving(true);
      // Drop stale per-leg numbers from the previously rendered day/order
      // while the new route is being resolved.
      onRouteLegsChange?.(null);
      const stops: ResolvedStop[] = [];
      for (const activity of activities) {
        const identity = await resolveMapUrl(activity);
        if (cancelled) return;
        stops.push({ activity, ...identity });
        // Resolve sequentially so short-link redirects remain predictable.
      }
      if (cancelled) return;
      setResolvedStops(stops);

      // Route through whatever stops resolved — one missing stop no longer
      // kills the whole day. Legs are only emitted for pairs that are direct
      // neighbours in the day list, so a number never skips an unknown stop.
      const coordStops = stops
        .map((stop, index) => ({ stop, index }))
        .filter(({ stop }) => Boolean(stop.coords));
      if (coordStops.length >= 2) {
        try {
          const osrmCoords = coordStops.map(({ stop }) => `${stop.coords![1]},${stop.coords![0]}`).join(';');
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`);
          const data = response.ok ? await response.json() : null;
          const route = data?.routes?.[0];
          if (route) {
            setRouteCoords(route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
            setDistanceKm(route.distance / 1000);
            setDurationMin(route.duration / 60);
            // OSRM returns one leg per consecutive input pair — keep only the
            // legs whose two stops are adjacent activities in the day list.
            const legs = Array.isArray(route.legs) ? route.legs : [];
            onRouteLegsChange?.(legs
              .map((leg: any, i: number) => ({
                fromActivityId: coordStops[i]?.stop.activity.id,
                toActivityId: coordStops[i + 1]?.stop.activity.id,
                adjacent: coordStops[i + 1]?.index - coordStops[i]?.index === 1,
                distanceKm: (leg?.distance ?? 0) / 1000,
                durationMin: (leg?.duration ?? 0) / 60
              }))
              .filter((leg: RouteLegInfo & { adjacent: boolean }) =>
                Boolean(leg.adjacent && leg.fromActivityId && leg.toActivityId))
              .map((leg: RouteLegInfo & { adjacent: boolean }) => ({
                fromActivityId: leg.fromActivityId,
                toActivityId: leg.toActivityId,
                distanceKm: leg.distanceKm,
                durationMin: leg.durationMin
              })));
          } else {
            setRouteCoords([]);
            setDistanceKm(null);
            setDurationMin(null);
            onRouteLegsChange?.(null);
          }
        } catch {
          setRouteCoords([]);
          setDistanceKm(null);
          setDurationMin(null);
          onRouteLegsChange?.(null);
        }
      } else {
        setRouteCoords([]);
        setDistanceKm(null);
        setDurationMin(null);
        onRouteLegsChange?.(null);
      }
      setIsResolving(false);
    };
    resolve();
    return () => {
      cancelled = true;
      // Map gone (hidden/day switch): clear legs so the day list never shows
      // stale numbers for an order we can no longer verify.
      onRouteLegsChange?.(null);
    };
  }, [activities, selectedDay, destination, onRouteLegsChange]);

  const stopsForRoute = useMemo<ResolvedStop[]>(
    () => (resolvedStops.length
      ? resolvedStops
      : activities.map((activity) => ({
          activity,
          coords: parseCoordsFromUrl(activity.resolvedMapUrl || activity.mapUrl),
          resolvedUrl: activity.resolvedMapUrl,
          placeId: activity.googlePlaceId,
          placeName: activity.resolvedPlaceName || parsePlaceNameFromUrl(activity.resolvedMapUrl || activity.mapUrl)
        }))),
    [resolvedStops, activities]
  );
  const routeSegments = useMemo(() => buildRouteSegments(stopsForRoute), [stopsForRoute]);
  const unroutableStops = useMemo(() => stopsForRoute.filter((s) => !isRoutable(s)), [stopsForRoute]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let mounted = true;

    import('leaflet').then((L) => {
      if (!mounted || !mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const validStops = resolvedStops.filter((s) => s.coords) as Array<ResolvedStop & { coords: LatLng }>;
      const center: LatLng = validStops[0]?.coords || [10.7769, 106.7009];
      const map = L.map(mapContainerRef.current, { center, zoom: 13, zoomControl: true, attributionControl: true });

      // Use a standards-compliant tile source. The old Google tile hotlink was blocked
      // on some Android browsers, which produced the grey map seen on mobile.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      validStops.forEach((point, idx) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${idx === 0 ? '#C64B3C' : '#1A73E8'};color:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:700 11px sans-serif">${idx + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        L.marker(point.coords, { icon }).addTo(map).bindPopup(
          `<b>#${idx + 1} ${point.activity.title}</b><br/>${point.activity.time || ''} ${point.activity.location || ''}`
        );
      });

      const line = routeCoords.length >= 2
        ? L.polyline(routeCoords, { color: '#1A73E8', weight: 5, opacity: 0.95 }).addTo(map)
        : validStops.length >= 2
          ? L.polyline(validStops.map((s) => s.coords), { color: '#8C9AA8', weight: 3, opacity: 0.65, dashArray: '7 7' }).addTo(map)
          : null;

      if (line) map.fitBounds(line.getBounds(), { padding: [28, 28] });
      else if (validStops.length === 1) map.setView(validStops[0].coords, 15);

      mapInstanceRef.current = map;
      // Leaflet can initialize before the mobile card has its final size.
      setTimeout(() => map.invalidateSize(), 120);
    });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [resolvedStops, routeCoords]);

  const unresolvedCount = resolvedStops.filter((s) => !s.coords).length;

  return (
    <div className="relative z-10 isolate bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl overflow-hidden shadow-xs">
      <div className="p-3.5 sm:p-4 bg-[#FAF7F2] border-b border-[#E8DEC8] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg">🗺️</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-serif text-xs sm:text-sm font-bold text-[#382D24]">Bản đồ hành trình</h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-pulse" />
                {isResolving ? 'Đang xác định...' : 'Vị trí từ Google Maps'}
              </span>
            </div>
            <p className="text-[10px] text-[#735D4E] hidden sm:block">Chỉ dùng tọa độ xác định từ link Google Maps đã lưu; không tự đoán địa điểm.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          {routeSegments.length === 0 && (
            <span className="text-[10px] text-[#735D4E] max-w-[160px] text-right">Chưa có điểm nào xác định chính xác trên Google Maps.</span>
          )}
          {routeSegments.length > 1 && (
            <span className="text-[10px] font-bold text-[#735D4E]">Mở App Google Maps:</span>
          )}
          {routeSegments.map((segment) => (
            <a
              key={segment.label}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              title={segment.stops.map((s) => s.activity.title).join(' → ')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold transition shadow-xs"
            >
              <span>{segment.label}</span><ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>

      <div className="itinerary-map-shell relative w-full h-[240px] sm:h-[300px] bg-[#E5E3DF] overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full itinerary-map-canvas" />
        {!isResolving && resolvedStops.length > 0 && unresolvedCount > 0 && (
          <div className="absolute bottom-2 left-2 right-2 z-[15] bg-white/95 text-[10px] text-[#735D4E] px-2.5 py-1.5 rounded-lg shadow border border-[#E2D4C3]">
            {unresolvedCount} điểm chưa xác định được tọa độ chính xác. Hãy mở Chỉnh sửa và kiểm tra link Google Maps của các điểm này.
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 bg-white border-t border-[#E8DEC8] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E2D4C3]">
          <div className="text-[10px] text-[#8C6D58] font-bold uppercase">Quãng đường</div>
          <div className="font-bold text-[#1A73E8] text-xs sm:text-sm mt-0.5">{distanceKm != null ? `${distanceKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km` : '—'}</div>
        </div>
        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E2D4C3]">
          <div className="text-[10px] text-[#8C6D58] font-bold uppercase">Thời gian lái xe</div>
          <div className="font-bold text-[#188038] text-xs sm:text-sm mt-0.5">{durationMin != null ? `~${Math.round(durationMin)} phút` : '—'}</div>
        </div>
        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E2D4C3]">
          <div className="text-[10px] text-[#8C6D58] font-bold uppercase">Điểm dừng trong ngày</div>
          <div className="font-bold text-[#382D24] text-xs sm:text-sm mt-0.5">{activities.length} địa điểm</div>
        </div>
        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E2D4C3]">
          <div className="text-[10px] text-[#8C6D58] font-bold uppercase">Chi phí cả ngày</div>
          <div className="font-bold text-[#B45309] text-xs sm:text-sm mt-0.5 font-mono">{totalDayCost > 0 ? `${totalDayCost.toLocaleString('vi-VN')} ₫` : '0 ₫'}</div>
        </div>
      </div>
    </div>
  );
};
