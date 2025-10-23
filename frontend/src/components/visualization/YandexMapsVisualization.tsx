import { useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

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
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
        >
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-3" style={{ color: '#003274' }}>Geographic Visualization</h3>
        <p className="text-gray-600 mb-6">
          No coordinate data available. Add latitude and longitude columns to your CSV file.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto text-left">
          <p className="font-medium text-blue-800 mb-2">Example CSV format:</p>
          <pre className="text-xs text-blue-700 bg-white p-3 rounded border">
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
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
          >
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Route Map Visualization</h3>
            <p className="text-sm text-gray-600">{coordinates.length} nodes mapped</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded bg-blue-500"></div>
            <span className="text-gray-600">Classical</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-1 rounded" 
              style={{ 
                background: '#8b5cf6', 
                backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 5px, transparent 5px, transparent 10px)' 
              }}
            ></div>
            <span className="text-gray-600">Quantum</span>
          </div>
        </div>
      </div>
      <div 
        ref={mapRef}
        className="w-full rounded-lg bg-white border border-gray-300 shadow-inner"
        style={{ height: '500px' }}
      />
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>Routes displayed on Yandex Maps</span>
        </div>
        <span>{coordinates.length} nodes total</span>
      </div>
    </div>
  );
}