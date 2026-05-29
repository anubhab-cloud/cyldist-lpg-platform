import { useEffect, useRef, useState } from 'react';
import { OlaMaps } from 'olamaps-web-sdk';

/**
 * Normalizes any coordinate format ([lat, lng], [lng, lat], or {lat, lng})
 * into standard Ola Maps / Maplibre GL format: [longitude, latitude].
 */
const normalizeLngLat = (coords) => {
  if (!coords) return null;
  
  // Object format: { lat, lng } or { latitude, longitude }
  if (typeof coords === 'object' && !Array.isArray(coords)) {
    const lat = coords.lat ?? coords.latitude;
    const lng = coords.lng ?? coords.longitude;
    if (lat !== undefined && lng !== undefined) {
      return [Number(lng), Number(lat)];
    }
  }
  
  // Array format
  if (Array.isArray(coords) && coords.length === 2) {
    const [first, second] = coords.map(Number);
    // Bengaluru/India bounds: Latitudes are generally in [5, 40], Longitudes in [65, 100]
    // If the first coordinate looks like a latitude, swap them to [lng, lat]
    if (first > 5 && first < 40 && second > 65 && second < 100) {
      return [second, first];
    }
    return [first, second];
  }
  
  return null;
};

export default function OlaDeliveryMap({
  center = [77.5946, 12.9716], // Default Bengaluru [lng, lat]
  zoom = 13,
  orders = [],
  agentLocation = null,
  destLocation = null,
  routeGeometry = null, // GeoJSON LineString geometry
  height = '100%',
  width = '100%',
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [sdkError, setSdkError] = useState(null);
  
  // Pre-evaluate simulator mode: if API key is missing or is placeholder, start in Simulator Mode to avoid WebGL crash
  const [useSimulator, setUseSimulator] = useState(() => {
    const apiKey = import.meta.env.VITE_OLAMAPS_API_KEY || '';
    return !apiKey || apiKey.trim() === '' || apiKey.includes('your_actual') || apiKey.includes('MOCK');
  });

  const normalizedCenter = normalizeLngLat(center) || [77.5946, 12.9716];
  const normalizedAgent = normalizeLngLat(agentLocation);
  const normalizedDest = normalizeLngLat(destLocation);

  // Translate coordinates to SVG percentage for the high-tech fallback simulator
  const getSvgCoords = (coords) => {
    const norm = normalizeLngLat(coords);
    if (!norm) return { x: 50, y: 50 };
    const [lng, lat] = norm;
    
    // Focus bounds centered around Bengaluru Trinity/MG Road area
    const minLng = 77.55;
    const maxLng = 77.64;
    const minLat = 12.93;
    const maxLat = 13.01;
    
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    
    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y))
    };
  };

  const agentSvg = getSvgCoords(normalizedAgent);
  const destSvg = getSvgCoords(normalizedDest);

  // Initialize Map
  useEffect(() => {
    if (useSimulator) {
      // Clear live map ref if active
      if (mapRef.current) {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current) return;

    const apiKey = import.meta.env.VITE_OLAMAPS_API_KEY || '';
    let cancelled = false;

    try {
      // 1. Initialize SDK Instance
      const olaMaps = new OlaMaps({
        apiKey: apiKey,
      });

      // 2. Initialize the Map Canvas (returns a Promise)
      const mapPromise = olaMaps.init({
        container: mapContainerRef.current,
        style: `https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json?api_key=${apiKey}`,
        center: normalizedCenter,
        zoom: zoom,
      });

      mapPromise.then((mapInstance) => {
        if (cancelled) {
          try { mapInstance.remove(); } catch (e) {}
          return;
        }

        mapRef.current = mapInstance;
        setSdkError(null);
        updateRouteLine();

        mapInstance.on('error', (e) => {
          console.error('Ola Maps WebGL / Instance error:', e);
          setSdkError('Ola Maps map canvas failed to load tiles. Falling back to GIS Simulator.');
          setUseSimulator(true);
        });
      }).catch((err) => {
        console.error('Ola Maps Async Init failed:', err);
        setUseSimulator(true);
      });

    } catch (err) {
      console.error('Failed to initialize Ola Maps SDK:', err);
      setSdkError(err.message || 'Ola Maps failed to initialize.');
      setUseSimulator(true);
    }

    // Cleanup
    return () => {
      cancelled = true;
      if (mapRef.current) {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Map cleanup warning:', e);
        }
        mapRef.current = null;
      }
    };
  }, [useSimulator]);

  // Update center reactively
  useEffect(() => {
    const map = mapRef.current;
    if (!map || useSimulator) return;
    
    map.flyTo({
      center: normalizedCenter,
      zoom: zoom,
      essential: true,
      duration: 1200,
    });
  }, [center, zoom, useSimulator]);

  // Update Route Polyline
  const updateRouteLine = () => {
    const map = mapRef.current;
    if (!map || useSimulator) return;

    let geojsonGeometry = null;

    if (routeGeometry) {
      geojsonGeometry = routeGeometry;
    } else if (normalizedAgent && normalizedDest) {
      geojsonGeometry = {
        type: 'LineString',
        coordinates: [normalizedAgent, normalizedDest],
      };
    }

    if (!geojsonGeometry) {
      if (map.getSource('route')) {
        map.setLayoutProperty('route-layer', 'visibility', 'none');
      }
      return;
    }

    const routeSourceData = {
      type: 'Feature',
      properties: {},
      geometry: geojsonGeometry,
    };

    if (map.getSource('route')) {
      map.getSource('route').setData(routeSourceData);
      map.setLayoutProperty('route-layer', 'visibility', 'visible');
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: routeSourceData,
      });

      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#6366f1',
          'line-width': 4.5,
          'line-opacity': 0.85,
        },
      });
    }
  };

  // Watch route updates
  useEffect(() => {
    if (mapRef.current && !useSimulator) {
      if (mapRef.current.isStyleLoaded()) {
        updateRouteLine();
      } else {
        mapRef.current.once('load', updateRouteLine);
      }
    }
  }, [routeGeometry, agentLocation, destLocation, useSimulator]);

  // Update Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || useSimulator) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const newMarkers = [];

    // 1. Agent Marker
    if (normalizedAgent) {
      const agentEl = document.createElement('div');
      agentEl.style.width = '36px';
      agentEl.style.height = '36px';
      agentEl.style.borderRadius = '50%';
      agentEl.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
      agentEl.style.border = '3px solid #ffffff';
      agentEl.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.45), 0 4px 14px rgba(0, 0, 0, 0.5)';
      agentEl.style.display = 'flex';
      agentEl.style.alignItems = 'center';
      agentEl.style.justifyContent = 'center';
      agentEl.style.fontSize = '1.1rem';
      agentEl.style.cursor = 'pointer';
      agentEl.innerHTML = '🚴';

      const agentPopup = new OlaMaps.Popup({ offset: [0, -10] })
        .setHTML(`<div style="color:#0f172a; font-family:sans-serif; font-size:12px; font-weight:600;">🚚 Delivery Agent (En Route)</div>`);

      const agentMarker = new OlaMaps.Marker({
        element: agentEl,
        anchor: 'center',
      })
        .setLngLat(normalizedAgent)
        .setPopup(agentPopup)
        .addTo(map);

      newMarkers.push(agentMarker);
    }

    // 2. Destination Marker
    if (normalizedDest) {
      const destEl = document.createElement('div');
      destEl.style.width = '34px';
      destEl.style.height = '34px';
      destEl.style.borderRadius = '50%';
      destEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      destEl.style.border = '3px solid #ffffff';
      destEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.4), 0 4px 14px rgba(0, 0, 0, 0.5)';
      destEl.style.display = 'flex';
      destEl.style.alignItems = 'center';
      destEl.style.justifyContent = 'center';
      destEl.style.fontSize = '1.1rem';
      destEl.style.cursor = 'pointer';
      destEl.innerHTML = '🏠';

      const destPopup = new OlaMaps.Popup({ offset: [0, -10] })
        .setHTML(`<div style="color:#0f172a; font-family:sans-serif; font-size:12px; font-weight:600;">📍 Delivery Destination</div>`);

      const destMarker = new OlaMaps.Marker({
        element: destEl,
        anchor: 'bottom',
      })
        .setLngLat(normalizedDest)
        .setPopup(destPopup)
        .addTo(map);

      newMarkers.push(destMarker);
    }

    // 3. Bulk Delivery Orders
    orders.forEach((order) => {
      const orderCoords = normalizeLngLat(order.location?.coordinates);
      if (!orderCoords) return;

      const priorityColors = {
        HIGH: '#ef4444',
        MEDIUM: '#f97316',
        LOW: '#22c55e',
      };

      const markerColor = priorityColors[String(order.priority).toUpperCase()] || '#6366f1';

      const orderEl = document.createElement('div');
      orderEl.style.width = '30px';
      orderEl.style.height = '30px';
      orderEl.style.borderRadius = '50%';
      orderEl.style.background = markerColor;
      orderEl.style.border = '2.5px solid #ffffff';
      orderEl.style.boxShadow = `0 0 10px ${markerColor}cc, 0 3px 8px rgba(0,0,0,0.4)`;
      orderEl.style.display = 'flex';
      orderEl.style.alignItems = 'center';
      orderEl.style.justifyContent = 'center';
      orderEl.style.color = '#ffffff';
      orderEl.style.fontWeight = 'bold';
      orderEl.style.fontSize = '0.75rem';
      orderEl.style.cursor = 'pointer';
      orderEl.innerText = order.deliverySequence ? `#${order.deliverySequence}` : '📍';

      const orderPopup = new OlaMaps.Popup({ offset: [0, -10] })
        .setHTML(`
          <div style="color:#0f172a; font-family:sans-serif; padding:4px; max-width:200px;">
            <div style="font-weight:700; font-size:13px; margin-bottom:4px;">👤 ${order.customerName || 'Customer'}</div>
            <div style="font-size:11px; color:#475569; display:flex; flex-direction:column; gap:2px;">
              <div>Priority: <span style="font-weight:600; color:${markerColor};">${order.priority || 'Normal'}</span></div>
              ${order.deliverySequence ? `<div>Stop Sequence: <b>#${order.deliverySequence}</b></div>` : ''}
              <div>ID: <span style="font-family:monospace; font-size:9px;">${order._id}</span></div>
            </div>
          </div>
        `);

      const marker = new OlaMaps.Marker({
        element: orderEl,
        anchor: 'center',
      })
        .setLngLat(orderCoords)
        .setPopup(orderPopup)
        .addTo(map);

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
  }, [orders, agentLocation, destLocation, useSimulator]);

  return (
    <div style={{ height, width, position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      
      {/* ── Floating View Mode Controller Toggle ── */}
      <div style={{
        position: 'absolute',
        bottom: '15px',
        right: '15px',
        zIndex: 50,
        display: 'flex',
        gap: '0.5rem',
      }}>
        <button
          onClick={() => setUseSimulator(true)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '20px',
            background: useSimulator ? 'var(--primary)' : 'var(--bg-elevated)',
            border: `1px solid ${useSimulator ? 'var(--primary)' : 'var(--border)'}`,
            color: useSimulator ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.68rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
            transition: 'all 0.2s',
            backdropFilter: 'blur(4px)',
          }}
        >
          🛰️ Simulator Mode
        </button>
        <button
          onClick={() => {
            const apiKey = import.meta.env.VITE_OLAMAPS_API_KEY || '';
            if (!apiKey) {
              alert('⚠️ Cannot switch to live map: VITE_OLAMAPS_API_KEY is missing from client/.env file.');
              return;
            }
            setUseSimulator(false);
          }}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '20px',
            background: !useSimulator ? 'var(--primary)' : 'var(--bg-elevated)',
            border: `1px solid ${!useSimulator ? 'var(--primary)' : 'var(--border)'}`,
            color: !useSimulator ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.68rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
            transition: 'all 0.2s',
            backdropFilter: 'blur(4px)',
          }}
        >
          🗺️ Live Ola Maps
        </button>
      </div>

      {/* ── High-Tech Fallback GIS Simulator ── */}
      {useSimulator ? (
        <div style={{
          height: '100%',
          width: '100%',
          background: '#09090b',
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {/* Simulator Header Info */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(180deg, rgba(9,9,11,0.95), rgba(9,9,11,0))',
            zIndex: 5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="live-dot" style={{ background: 'var(--accent)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
                  ACTIVE GIS SIMULATOR MODE
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Synced with real-time socket tracking
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              maxWidth: '180px',
              textAlign: 'right',
            }}>
              💡 Simulator tracks live agent movement reactively!
            </div>
          </div>

          {/* SVG Vector Street Network Grid Simulator */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Street Grid lines */}
            <line x1="10%" y1="0%" x2="10%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="30%" y1="0%" x2="30%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="70%" y1="0%" x2="70%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="90%" y1="0%" x2="90%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            
            <line x1="0%" y1="20%" x2="100%" y2="20%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="0%" y1="40%" x2="100%" y2="40%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="0%" y1="60%" x2="100%" y2="60%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <line x1="0%" y1="80%" x2="100%" y2="80%" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />

            {/* MG Road & Trinity Main Highways */}
            <line x1="40%" y1="0%" x2="40%" y2="100%" stroke="rgba(99,102,241,0.08)" strokeWidth="6" />
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(99,102,241,0.08)" strokeWidth="6" />

            {/* Active Direct Path Polyline connection with smooth pulse */}
            {normalizedAgent && normalizedDest && (
              <>
                <line
                  x1={`${agentSvg.x}%`}
                  y1={`${agentSvg.y}%`}
                  x2={`${destSvg.x}%`}
                  y2={`${destSvg.y}%`}
                  stroke="var(--accent)"
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                  strokeOpacity="0.8"
                  style={{ transition: 'all 0.8s ease-in-out' }}
                />
                <circle
                  cx={`${agentSvg.x}%`}
                  cy={`${agentSvg.y}%`}
                  r="12"
                  fill="rgba(99,102,241,0.15)"
                  style={{ transition: 'all 0.8s ease-in-out' }}
                >
                  <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </svg>

          {/* Simulator Coordinates & Floating Pins */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* 🏠 Destination Pin */}
            {normalizedDest && (
              <div style={{
                position: 'absolute',
                left: `${destSvg.x}%`,
                top: `${destSvg.y}%`,
                transform: 'translate(-50%, -100%)',
                transition: 'all 0.8s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 4,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', pointerEvents: 'auto', cursor: 'help',
                }} title="Delivery Destination">
                  🏠
                </div>
              </div>
            )}

            {/* 🚴 Agent Bike Pin */}
            {normalizedAgent ? (
              <div style={{
                position: 'absolute',
                left: `${agentSvg.x}%`,
                top: `${agentSvg.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'all 0.8s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 5,
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.05rem', pointerEvents: 'auto', cursor: 'help',
                }} title="Delivery Agent Location">
                  🚴
                </div>
              </div>
            ) : (
              /* Center Indicator when agent is off */
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
              }}>
                Simulator Center focus
              </div>
            )}

            {/* Bulk Order Pins if present */}
            {orders.map((order, idx) => {
              const orderSvg = getSvgCoords(order.location?.coordinates);
              return (
                <div key={order._id || idx} style={{
                  position: 'absolute',
                  left: `${orderSvg.x}%`,
                  top: `${orderSvg.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: '#f97316',
                    border: '2px solid #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', color: '#ffffff', fontWeight: 'bold',
                  }}>
                    #{order.deliverySequence || idx + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulator Footer Coordinates Strip */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(0deg, rgba(9,9,11,0.95), rgba(9,9,11,0))',
            zIndex: 5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.65rem',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            borderTop: '1px solid rgba(255,255,255,0.02)',
          }}>
            <div>
              LNG: <span style={{ color: 'var(--accent)' }}>{normalizedAgent ? normalizedAgent[0].toFixed(5) : normalizedCenter[0].toFixed(5)}</span>
            </div>
            <div>
              LAT: <span style={{ color: 'var(--accent)' }}>{normalizedAgent ? normalizedAgent[1].toFixed(5) : normalizedCenter[1].toFixed(5)}</span>
            </div>
            <div>
              ZOOM: <span style={{ color: 'var(--text-muted)' }}>{zoom}x</span>
            </div>
          </div>
        </div>
      ) : (
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%', background: '#09090b' }} />
      )}
    </div>
  );
}
