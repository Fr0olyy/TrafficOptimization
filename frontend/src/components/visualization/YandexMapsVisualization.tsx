import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Zap, Cpu, BarChart3, Play, Pause, RotateCcw } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [activeRoute, setActiveRoute] = useState<'classical' | 'quantum' | 'both'>('both');
  const [viewMode, setViewMode] = useState<'standard' | 'satellite' | 'heatmap'>('standard');

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
  }, [coordinates, classicalRoute, quantumRoute, activeRoute, viewMode]);

  useEffect(() => {
    let animationFrame: number;
    
    if (isPlaying && animationProgress < 100) {
      animationFrame = requestAnimationFrame(() => {
        setAnimationProgress(prev => Math.min(prev + 0.5, 100));
      });
    } else if (animationProgress >= 100) {
      setIsPlaying(false);
    }

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, animationProgress]);

  const initMap = () => {
    if (!mapRef.current || !window.ymaps) return;

    // Calculate center of all coordinates
    const centerLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
    const centerLon = coordinates.reduce((sum, c) => sum + c.lon, 0) / coordinates.length;

    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: [centerLat, centerLon],
      zoom: 12,
      controls: ['zoomControl', 'fullscreenControl', 'typeSelector', 'rulerControl']
    });

    updateMapContent();
  };

  const updateMapContent = () => {
    if (!mapInstance.current || !window.ymaps) return;

    // Clear existing objects
    mapInstance.current.geoObjects.removeAll();

    // Set map type based on view mode
    if (viewMode === 'satellite') {
      mapInstance.current.setType('yandex#satellite');
    } else if (viewMode === 'heatmap') {
      mapInstance.current.setType('yandex#map');
      // Add heatmap layer would go here
    } else {
      mapInstance.current.setType('yandex#map');
    }

    // Add placemarks for each coordinate with enhanced styling
    coordinates.forEach(coord => {
      const isInClassicalRoute = classicalRoute.includes(coord.id);
      const isInQuantumRoute = quantumRoute.includes(coord.id);
      
      let preset = 'islands#blueCircleDotIcon';
      let iconColor = '#667eea';
      
      if (isInClassicalRoute && isInQuantumRoute) {
        preset = 'islands#violetCircleDotIcon';
        iconColor = '#8b5cf6';
      } else if (isInClassicalRoute) {
        preset = 'islands#blueCircleDotIcon';
        iconColor = '#3b82f6';
      } else if (isInQuantumRoute) {
        preset = 'islands#violetCircleDotIcon';
        iconColor = '#8b5cf6';
      }

      const placemark = new window.ymaps.Placemark(
        [coord.lat, coord.lon],
        {
          balloonContent: `
            <div style="padding: 8px;">
              <strong style="color: #003274;">${coord.label || `Node ${coord.id}`}</strong><br/>
              <div style="margin-top: 4px; font-size: 12px; color: #666;">
                Lat: ${coord.lat.toFixed(6)}<br/>
                Lon: ${coord.lon.toFixed(6)}
              </div>
            </div>
          `,
          hintContent: coord.label || `Node ${coord.id}`
        },
        {
          preset: preset,
          iconColor: iconColor,
          iconCaptionMaxWidth: 150
        }
      );
      mapInstance.current.geoObjects.add(placemark);
    });

    // Draw animated routes
    if ((activeRoute === 'classical' || activeRoute === 'both') && classicalRoute.length > 1) {
      drawAnimatedRoute(classicalRoute, '#3b82f6', 'Classical Route', false);
    }

    if ((activeRoute === 'quantum' || activeRoute === 'both') && quantumRoute.length > 1) {
      drawAnimatedRoute(quantumRoute, '#8b5cf6', 'Quantum Route', true);
    }

    // Fit bounds to show all objects
    mapInstance.current.setBounds(mapInstance.current.geoObjects.getBounds(), {
      checkZoomRange: true,
      zoomMargin: 50
    });
  };

  const drawAnimatedRoute = (route: number[], color: string, hint: string, dashed: boolean) => {
    const routeCoords = route
      .map(nodeId => coordinates.find(c => c.id === nodeId))
      .filter(c => c !== undefined)
      .map(c => [c!.lat, c!.lon]);

    if (routeCoords.length > 1) {
      // Calculate partial route for animation
      const progressIndex = Math.floor((animationProgress / 100) * (routeCoords.length - 1));
      const animatedCoords = routeCoords.slice(0, progressIndex + 1);

      const polyline = new window.ymaps.Polyline(
        animatedCoords,
        { 
          hintContent: hint,
          balloonContent: `<strong style="color: ${color};">${hint}</strong><br/>Distance optimized`
        },
        {
          strokeColor: color,
          strokeWidth: 5,
          strokeOpacity: 0.8,
          strokeStyle: dashed ? '5 5' : 'solid'
        }
      );
      mapInstance.current.geoObjects.add(polyline);

      // Add moving marker for animation
      if (isPlaying && progressIndex < routeCoords.length - 1) {
        const marker = new window.ymaps.Placemark(
          routeCoords[progressIndex],
          {
            hintContent: 'Current position'
          },
          {
            preset: 'islands#circleIcon',
            iconColor: color,
            iconCaptionMaxWidth: 150
          }
        );
        mapInstance.current.geoObjects.add(marker);
      }
    }
  };

  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying && animationProgress >= 100) {
      setAnimationProgress(0);
    }
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setAnimationProgress(0);
  };

  const calculateRouteStats = () => {
    const classicalDistance = classicalRoute.length > 1 ? calculateRouteDistance(classicalRoute) : 0;
    const quantumDistance = quantumRoute.length > 1 ? calculateRouteDistance(quantumRoute) : 0;
    const improvement = classicalDistance > 0 ? ((classicalDistance - quantumDistance) / classicalDistance) * 100 : 0;

    return { classicalDistance, quantumDistance, improvement };
  };

  const calculateRouteDistance = (route: number[]) => {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const from = coordinates.find(c => c.id === route[i]);
      const to = coordinates.find(c => c.id === route[i + 1]);
      if (from && to) {
        distance += calculateHaversineDistance(from.lat, from.lon, to.lat, to.lon);
      }
    }
    return distance;
  };

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const routeStats = calculateRouteStats();

  if (!coordinates || coordinates.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" 
             style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}>
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-3" style={{ color: '#003274' }}>Geographic Visualization</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          No coordinate data available. Add latitude and longitude columns to your CSV file to see routes on the map.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto text-left">
          <p className="font-medium text-blue-800 mb-2">Example CSV format:</p>
          <pre className="text-xs text-blue-700 bg-white p-3 rounded border">
{`node_id,latitude,longitude,label
0,55.7558,37.6173,Moscow Center
1,55.7522,37.6156,Kremlin
2,55.7489,37.6201,Red Square`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* Enhanced Header with Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" 
                 style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}>
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Route Map</h3>
          </div>
          
          {/* Route Selection */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['both', 'classical', 'quantum'] as const).map((route) => (
              <button
                key={route}
                onClick={() => setActiveRoute(route)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeRoute === route
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {route === 'both' ? 'Both' : route === 'classical' ? 'Classical' : 'Quantum'}
              </button>
            ))}
          </div>
        </div>

        {/* Animation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(['standard', 'satellite'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={resetAnimation}
              className="p-1 rounded hover:bg-white transition-colors"
              title="Reset animation"
            >
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={toggleAnimation}
              className="p-1 rounded hover:bg-white transition-colors"
              title={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-blue-600" />
              ) : (
                <Play className="w-4 h-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Classical</span>
          </div>
          <div className="text-lg font-bold text-blue-800">
            {routeStats.classicalDistance > 0 ? routeStats.classicalDistance.toFixed(1) + 'km' : 'N/A'}
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Quantum</span>
          </div>
          <div className="text-lg font-bold text-purple-800">
            {routeStats.quantumDistance > 0 ? routeStats.quantumDistance.toFixed(1) + 'km' : 'N/A'}
          </div>
        </div>
        
        <div className={`border rounded-lg p-3 text-center ${
          routeStats.improvement > 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart3 className={`w-4 h-4 ${
              routeStats.improvement > 0 ? 'text-green-600' : 'text-gray-600'
            }`} />
            <span className={`text-sm font-medium ${
              routeStats.improvement > 0 ? 'text-green-700' : 'text-gray-700'
            }`}>
              Improvement
            </span>
          </div>
          <div className={`text-lg font-bold ${
            routeStats.improvement > 0 ? 'text-green-800' : 'text-gray-800'
          }`}>
            {routeStats.improvement > 0 ? '+' + routeStats.improvement.toFixed(1) + '%' : 'N/A'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isPlaying && (
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${animationProgress}%`,
                background: 'linear-gradient(90deg, #4495D1, #003274)'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Route animation</span>
            <span>{Math.round(animationProgress)}%</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapRef}
        className="w-full rounded-lg bg-white border border-gray-300 shadow-inner"
        style={{ height: '500px' }}
      />

      {/* Enhanced Footer */}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded bg-blue-500"></div>
            <span className="text-gray-600">Classical Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded bg-purple-500" style={{ 
              backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 3px, transparent 3px, transparent 6px)' 
            }}></div>
            <span className="text-gray-600">Quantum Route</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span>{coordinates.length} nodes • Yandex Maps</span>
        </div>
      </div>
    </div>
  );
}
