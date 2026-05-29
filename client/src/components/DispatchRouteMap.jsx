import { useEffect, useRef, useState } from 'react';
import { OlaMaps } from 'olamaps-web-sdk';

/**
 * DISPATCH ROUTE MAP
 * Renders optimized delivery routes with numbered priority-colored markers.
 * Falls back to a visual SVG simulator if the map fails.
 */
export default function DispatchRouteMap({
  stops = [],
  routeGeometry = null,
  agentLocation = null,
  height = 500,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const apiKey = import.meta.env.VITE_OLAMAPS_API_KEY || '';

  const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' };

  // ── Initialize Map ──
  useEffect(() => {
    if (!containerRef.current || !apiKey) {
      setUseFallback(true);
      return;
    }

    let cancelled = false;

    async function initMap() {
      try {
        const olaMaps = new OlaMaps({ apiKey });
        const map = await olaMaps.init({
          container: containerRef.current,
          style: `https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json?api_key=${apiKey}`,
          center: [77.5946, 12.9716],
          zoom: 11,
        });

        if (cancelled) { try { map.remove(); } catch(e){} return; }

        mapRef.current = map;
        setMapReady(true);

        map.on('error', () => {
          setUseFallback(true);
        });
      } catch (err) {
        console.error('DispatchRouteMap init failed:', err);
        setUseFallback(true);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => { try { m.remove(); } catch(e){} });
      markersRef.current = [];
      if (mapRef.current) { try { mapRef.current.remove(); } catch(e){} mapRef.current = null; }
    };
  }, [apiKey]);

  // ── Render Markers using DOM elements (no OlaMaps.Marker needed) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || stops.length === 0) return;

    // Clear old markers
    markersRef.current.forEach(m => { try { m.remove(); } catch(e){} });
    markersRef.current = [];

    // We need maplibregl from the window (loaded by Ola Maps SDK)
    const maplibregl = window.maplibregl;
    if (!maplibregl) return;

    const bounds = new maplibregl.LngLatBounds();

    stops.forEach((stop) => {
      const coords = stop.location?.coordinates;
      if (!coords || coords.length !== 2) return;

      const color = PRIORITY_COLORS[stop.priority] || PRIORITY_COLORS.LOW;
      const seq = stop.sequence || '?';

      const el = document.createElement('div');
      el.style.cssText = `
        width: 34px; height: 34px; border-radius: 50%;
        background: ${color}; border: 3px solid #ffffff;
        box-shadow: 0 2px 10px ${color}99, 0 4px 14px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: #ffffff; font-weight: 800; font-size: 0.8rem;
        font-family: system-ui, sans-serif; cursor: pointer;
      `;
      el.innerText = `#${seq}`;
      el.title = `${stop.customerName || 'Stop'} [${stop.priority}]`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend(coords);
    });

    // Agent marker
    if (agentLocation) {
      const agentEl = document.createElement('div');
      agentEl.style.cssText = `
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 4px rgba(99,102,241,0.3), 0 4px 14px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
      `;
      agentEl.innerHTML = '🚚';

      const agentMarker = new maplibregl.Marker({ element: agentEl })
        .setLngLat(agentLocation)
        .addTo(map);

      markersRef.current.push(agentMarker);
      bounds.extend(agentLocation);
    }

    // Fit bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, duration: 1000, maxZoom: 15 });
    }
  }, [stops, agentLocation, mapReady]);

  // ── Route Polyline ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sourceId = 'dispatch-route';
    const layerId = 'dispatch-route-layer';

    // Build geometry — either from routeGeometry prop or connect stops as straight lines
    let geometry = routeGeometry;
    if (!geometry && stops.length >= 2) {
      geometry = {
        type: 'LineString',
        coordinates: stops
          .filter(s => s.location?.coordinates)
          .map(s => s.location.coordinates),
      };
    }

    if (!geometry || !geometry.coordinates || geometry.coordinates.length < 2) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
      return;
    }

    const data = { type: 'Feature', properties: {}, geometry };

    const addRoute = () => {
      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(data);
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      } else {
        map.addSource(sourceId, { type: 'geojson', data });
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.85 },
        });
      }
    };

    if (map.isStyleLoaded()) addRoute();
    else map.once('load', addRoute);
  }, [routeGeometry, stops, mapReady]);

  // ── SVG Fallback (when map can't load) ──
  if (useFallback) {
    const allCoords = stops.filter(s => s.location?.coordinates).map(s => s.location.coordinates);
    const minLng = allCoords.length ? Math.min(...allCoords.map(c => c[0])) - 0.01 : 77.5;
    const maxLng = allCoords.length ? Math.max(...allCoords.map(c => c[0])) + 0.01 : 77.7;
    const minLat = allCoords.length ? Math.min(...allCoords.map(c => c[1])) - 0.01 : 12.9;
    const maxLat = allCoords.length ? Math.max(...allCoords.map(c => c[1])) + 0.01 : 13.0;

    const toSvg = (coords) => ({
      x: ((coords[0] - minLng) / (maxLng - minLng)) * 100,
      y: 100 - ((coords[1] - minLat) / (maxLat - minLat)) * 100,
    });

    return (
      <div style={{ height, background: '#0f0f12', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '0.65rem', color: '#71717a', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 6 }}>
          📡 GIS Simulator (Map tiles unavailable)
        </div>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Grid */}
          {[20,40,60,80].map(v => <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />)}
          {[20,40,60,80].map(v => <line key={`v${v}`} x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />)}

          {/* Route line */}
          {stops.length >= 2 && (
            <polyline
              points={stops.filter(s => s.location?.coordinates).map(s => { const p = toSvg(s.location.coordinates); return `${p.x},${p.y}`; }).join(' ')}
              fill="none" stroke="#6366f1" strokeWidth="0.6" strokeDasharray="2 1" opacity="0.8"
            />
          )}

          {/* Stop markers */}
          {stops.filter(s => s.location?.coordinates).map((stop, i) => {
            const p = toSvg(stop.location.coordinates);
            const color = PRIORITY_COLORS[stop.priority] || '#22c55e';
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="2.5" fill={color} stroke="#fff" strokeWidth="0.5" />
                <text x={p.x} y={p.y - 3.5} textAnchor="middle" fontSize="2.2" fill="#fff" fontWeight="bold">#{stop.sequence}</text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: '0.75rem', fontSize: '0.6rem', color: '#a1a1aa' }}>
          {Object.entries(PRIORITY_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              {k}
            </div>
          ))}
        </div>
        {stops.length > 0 && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: '0.6rem', color: '#71717a' }}>
            {stops.length} stops
          </div>
        )}
      </div>
    );
  }

  // ── No API key state ──
  if (!apiKey) {
    return (
      <div style={{ height, background: '#09090b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: '0.85rem' }}>
        🗺️ Map API key not configured
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div ref={containerRef} style={{ height, width: '100%', background: '#09090b' }} />
      {/* Legend overlay */}
      {stops.length > 0 && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: '0.65rem', color: '#e4e4e7' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Priority</div>
          {Object.entries(PRIORITY_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              <span>{k}</span>
            </div>
          ))}
        </div>
      )}
      {stops.length > 0 && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', fontSize: '0.65rem', color: '#a1a1aa' }}>
          🛣️ {stops.length} stops · Route optimized
        </div>
      )}
    </div>
  );
}
