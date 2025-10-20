import { useEffect, useRef } from 'react';

interface YandexMapsVisualizationProps {
  apiKey: string;
  coordinates: Array<{
    id: number;
    lat: number;
    lon: number;
    label?: string;
  }>;
  classicalRoute?: number[];
  quantumRoute?: number[];
}

// Declare global ymaps type
declare global {
  interface Window {
    ymaps: any;
  }
}

export function YandexMapsVisualization({
  apiKey,
  coordinates,
  classicalRoute = [],
  quantumRoute = []
}: YandexMapsVisualizationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // Load Yandex Maps API
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    
    script.onload = () => {
      window.ymaps.ready(() => {
        initMap();
      });
    };

    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
      document.head.removeChild(script);
    };
  }, [apiKey]);

  useEffect(() => {
    if (mapInstance.current && coordinates.length > 0) {
      updateMapContent();
    }
  }, [coordinates, classicalRoute, quantumRoute]);

  const initMap = () => {
    if (!mapRef.current || !window.ymaps) return;

    // Calculate center of all coordinates
    const centerLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
    const centerLon = coordinates.reduce((sum, c) => sum + c.lon, 0) / coordinates.length;

    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: [centerLat, centerLon],
      zoom: 12,
      controls: ['zoomControl', 'fullscreenControl', 'typeSelector']
    });

    updateMapContent();
  };

  const updateMapContent = () => {
    if (!mapInstance.current || !window.ymaps) return;

    // Clear existing objects
    mapInstance.current.geoObjects.removeAll();

    // Add placemarks for each coordinate
    coordinates.forEach(coord => {
      const placemark = new window.ymaps.Placemark(
        [coord.lat, coord.lon],
        {
          balloonContent: coord.label || `Node ${coord.id}`,
          hintContent: `Node ${coord.id}`
        },
        {
          preset: 'islands#violetDotIcon',
          iconColor: '#8b5cf6'
        }
      );
      mapInstance.current.geoObjects.add(placemark);
    });

    // Draw classical route
    if (classicalRoute.length > 1) {
      const classicalCoords = classicalRoute
        .map(nodeId => coordinates.find(c => c.id === nodeId))
        .filter(c => c !== undefined)
        .map(c => [c!.lat, c!.lon]);

      if (classicalCoords.length > 1) {
        const classicalPolyline = new window.ymaps.Polyline(
          classicalCoords,
          { hintContent: 'Classical Route' },
          {
            strokeColor: '#3b82f6',
            strokeWidth: 4,
            strokeOpacity: 0.7
          }
        );
        mapInstance.current.geoObjects.add(classicalPolyline);
      }
    }

    // Draw quantum route
    if (quantumRoute.length > 1) {
      const quantumCoords = quantumRoute
        .map(nodeId => coordinates.find(c => c.id === nodeId))
        .filter(c => c !== undefined)
        .map(c => [c!.lat, c!.lon]);

      if (quantumCoords.length > 1) {
        const quantumPolyline = new window.ymaps.Polyline(
          quantumCoords,
          { hintContent: 'Quantum Route' },
          {
            strokeColor: '#8b5cf6',
            strokeWidth: 4,
            strokeOpacity: 0.7,
            strokeStyle: '5 5' // Dashed line
          }
        );
        mapInstance.current.geoObjects.add(quantumPolyline);
      }
    }

    // Fit bounds to show all objects
    mapInstance.current.setBounds(mapInstance.current.geoObjects.getBounds(), {
      checkZoomRange: true,
      zoomMargin: 50
    });
  };

  if (!coordinates || coordinates.length === 0) {
    return (
      <div className="glass-effect rounded-xl p-12 text-center">
        <div className="text-6xl mb-6">🗺️</div>
        <h3 className="text-2xl font-semibold mb-4">Geographic Visualization</h3>
        <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          No coordinate data available. Add latitude and longitude columns to your CSV file.
        </p>
        <div className="text-left max-w-md mx-auto rounded-lg p-4 text-sm"
          style={{ background: 'var(--color-bg-elevated)' }}>
          <p className="mb-2 font-medium">Example CSV format:</p>
          <pre className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
{`node_id,latitude,longitude
0,55.7558,37.6173
1,55.7522,37.6156
2,55.7489,37.6201`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Route Map Visualization</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded" style={{ background: '#3b82f6' }}></div>
            <span style={{ color: 'var(--color-text-secondary)' }}>Classical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded" style={{ background: '#8b5cf6', backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 5px, transparent 5px, transparent 10px)' }}></div>
            <span style={{ color: 'var(--color-text-secondary)' }}>Quantum</span>
          </div>
        </div>
      </div>
      <div 
        ref={mapRef}
        className="w-full rounded-lg"
        style={{ 
          height: '500px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      />
      <div className="mt-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        📍 {coordinates.length} nodes • Routes displayed on Yandex Maps
      </div>
    </div>
  );
}
