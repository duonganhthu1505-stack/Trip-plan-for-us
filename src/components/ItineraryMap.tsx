import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Activity } from '../types';

interface ItineraryMapProps {
  activities: Activity[];
  selectedDay: string;
  dayIndex: number;
  destination?: string;
}

type LatLng = [number, number];

interface ResolvedStop {
  activity: Activity;
  coords: LatLng | null;
}

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

const resolveMapUrl = async (activity: Activity): Promise<LatLng | null> => {
  // Coordinates already saved on a newer activity are the source of truth.
  if (Number.isFinite(activity.latitude) && Number.isFinite(activity.longitude)) {
    return [Number(activity.latitude), Number(activity.longitude)];
  }

  // Full Google Maps URLs often contain coordinates directly.
  const direct = parseCoordsFromUrl(activity.resolvedMapUrl || activity.mapUrl);
  if (direct) return direct;

  // Short maps.app.goo.gl links cannot be reliably expanded in the browser because
  // Google redirects are opaque/CORS restricted. Resolve them on our own Netlify
  // function instead. Never geocode title/location text: a wrong pin is worse than no pin.
  if (!activity.mapUrl) return null;
  try {
    const response = await fetch('/.netlify/functions/resolve-map-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: activity.mapUrl })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Number.isFinite(data?.latitude) && Number.isFinite(data?.longitude)) {
      return [Number(data.latitude), Number(data.longitude)];
    }
  } catch {
    // Explicitly unresolved. Do not invent a coordinate from the activity name.
  }
  return null;
};

const buildGoogleMapsUrl = (stops: ResolvedStop[], destination: string) => {
  // A Google Maps share link is the only value that preserves the exact place
  // the user selected. Coordinates can be reverse-geocoded by Google to a
  // neighbouring POI, so do not rebuild a multi-stop route from coordinates.
  const exactLinks = stops
    .map((s) => s.activity.mapUrl?.trim())
    .filter((url): url is string => Boolean(url));

  if (exactLinks.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  }

  // For a single stop, opening the original share URL is exact.
  if (exactLinks.length === 1) return exactLinks[0];

  // Google Maps does not provide a supported URL format that combines several
  // independent share URLs while preserving every Place identity. Instead,
  // open the first exact saved place; the UI handles multi-stop navigation
  // separately so we never silently send the user to a different business.
  return exactLinks[0];
};

export const ItineraryMap: React.FC<ItineraryMapProps> = ({
  activities,
  selectedDay,
  destination = ''
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
      const stops: ResolvedStop[] = [];
      for (const activity of activities) {
        const coords = await resolveMapUrl(activity);
        if (cancelled) return;
        stops.push({ activity, coords });
        // Resolve sequentially so short-link redirects remain predictable.
      }
      if (cancelled) return;
      setResolvedStops(stops);

      const coords = stops.map((s) => s.coords).filter(Boolean) as LatLng[];
      if (coords.length >= 2 && coords.length === stops.length) {
        try {
          const osrmCoords = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`);
          const data = response.ok ? await response.json() : null;
          const route = data?.routes?.[0];
          if (route) {
            setRouteCoords(route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
            setDistanceKm(route.distance / 1000);
            setDurationMin(route.duration / 60);
          } else {
            setRouteCoords([]);
            setDistanceKm(null);
            setDurationMin(null);
          }
        } catch {
          setRouteCoords([]);
          setDistanceKm(null);
          setDurationMin(null);
        }
      } else {
        setRouteCoords([]);
        setDistanceKm(null);
        setDurationMin(null);
      }
      setIsResolving(false);
    };
    resolve();
    return () => { cancelled = true; };
  }, [activities, selectedDay, destination]);

  const googleMapsUrl = useMemo(
    () => buildGoogleMapsUrl(resolvedStops.length ? resolvedStops : activities.map((activity) => ({ activity, coords: parseCoordsFromUrl(activity.mapUrl) })), destination),
    [resolvedStops, activities, destination]
  );

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
    <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl overflow-hidden shadow-xs">
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
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold transition shadow-xs shrink-0">
          <span>Mở điểm đầu trên Google Maps</span><ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="relative w-full h-[240px] sm:h-[300px] bg-[#E5E3DF] overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!isResolving && resolvedStops.length > 0 && unresolvedCount > 0 && (
          <div className="absolute bottom-2 left-2 right-2 z-[500] bg-white/95 text-[10px] text-[#735D4E] px-2.5 py-1.5 rounded-lg shadow border border-[#E2D4C3]">
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
