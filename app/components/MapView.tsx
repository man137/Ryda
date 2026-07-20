'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapViewProps = {
  pickupCoords: [number, number] | null;
  destinationCoords: [number, number] | null;
  pickupCoords: [number, number] | null;
  destinationCoords: [number, number] | null;
  routeGeometry: {
    coordinates: [number, number][];
    distance: number;
    duration: number;
  } | null;
  currentCoords: [number, number] | null;
  driver: {
    id: string;
    coords: [number, number];
    status: 'available' | 'on-way' | 'arrived';
  } | null;
};

// --- ICON DEFINITIONS ---

const currentLocationIcon = L.divIcon({
  className: '',
  html: `<div style="background-color:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="background-color:#10b981;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="background-color:#ef4444;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const carIcon = L.divIcon({
  className: '',
  html: `<div style="background-color:#3b82f6;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;transition:transform 0.3s ease;">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// --- MAIN COMPONENT ---
export default function MapView({
  pickupCoords,
  destinationCoords,
  routeGeometry,
  currentCoords,
  driver,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{
    currentLocation?: L.Marker;
    pickup?: L.Marker;
    destination?: L.Marker;
    driver?: L.Marker;
    route?: L.Polyline;
  }>({});

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default coordinates (India center, removed from dependencies)
    const defaultCenter: [number, number] = [20.5937, 78.9629]; 

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(currentCoords || defaultCenter, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);
    
    // NOTE: Removed manual L.Map pane z-index overrides here, relying on the
    // embedded <style> tag below to handle global CSS conflicts.

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [currentCoords]);

  // Handle pickup, destination, route, driver, and current location
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Update Current Location Marker
    if (currentCoords) {
      if (markersRef.current.currentLocation) {
        markersRef.current.currentLocation.setLatLng(currentCoords);
      } else {
        markersRef.current.currentLocation = L.marker(currentCoords, { icon: currentLocationIcon, zIndexOffset: 1000 }).addTo(map);
      }
    }

    // Update Pickup Marker
    if (pickupCoords) {
      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng(pickupCoords);
      } else {
        markersRef.current.pickup = L.marker(pickupCoords, { icon: pickupIcon }).addTo(map);
      }
    }

    // Update Destination Marker
    if (destinationCoords) {
      if (markersRef.current.destination) {
        markersRef.current.destination.setLatLng(destinationCoords);
      } else {
        markersRef.current.destination = L.marker(destinationCoords, { icon: destinationIcon }).addTo(map);
      }
    }

    // Update Route
    if (routeGeometry?.coordinates?.length) {
      // Leaflet coordinates are [lat, lng], which matches the routeGeometry type
      const leafletCoords: L.LatLngExpression[] = routeGeometry.coordinates as L.LatLngExpression[];

      if (markersRef.current.route) {
        markersRef.current.route.setLatLngs(leafletCoords);
      } else {
        markersRef.current.route = L.polyline(leafletCoords, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.7,
        }).addTo(map);

        const bounds = markersRef.current.route.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80] });
      }
    }

    // Update Driver Marker
    if (driver) {
      if (!markersRef.current.driver) {
        markersRef.current.driver = L.marker(driver.coords, { icon: carIcon }).addTo(map);
      } else {
        const old = markersRef.current.driver.getLatLng();
        animateMarkerTo(markersRef.current.driver, driver.coords, [old.lat, old.lng]);
      }
    }
  }, [pickupCoords, destinationCoords, routeGeometry, driver, currentCoords]);

  return (
    <div className="relative w-full h-full">
        {/* 1. EMBEDDED GLOBAL CSS FIX: Corrects z-index conflicts with Next.js/Tailwind UI panels */}
        <style dangerouslySetInnerHTML={{ __html: `
            .leaflet-container {
                z-index: 0 !important; 
            }
            .leaflet-pane {
                z-index: 0 !important;
            }
            .leaflet-marker-pane,
            .leaflet-popup-pane {
                z-index: 2 !important; 
            }
        ` }} />
        
        {/* 2. Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
      />
    </div>
  );
}

// --- HELPER FUNCTION ---
// Smooth animation logic (using the same logic from the original file)
function animateMarkerTo(marker: L.Marker, newCoords: [number, number], oldCoords: [number, number]) {
  const duration = 1000;
  const steps = 30;
  const delay = duration / steps;
  let i = 0;
  const [startLat, startLng] = oldCoords;
  const [endLat, endLng] = newCoords;

  const interval = setInterval(() => {
    i++;
    const progress = i / steps;
    const lat = startLat + (endLat - startLat) * progress;
    const lng = startLng + (endLng - startLng) * progress;
    marker.setLatLng([lat, lng]);
    if (i === steps) clearInterval(interval);
  }, delay);
}
