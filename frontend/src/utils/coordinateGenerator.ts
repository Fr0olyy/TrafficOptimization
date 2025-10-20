/**
 * Генерирует детерминированные координаты для узлов графа
 * Координаты генерируются вокруг центральной точки (по умолчанию Москва)
 * и используют алгоритм force-directed layout для красивого расположения
 */

interface Node {
  id: number;
  label?: string;
}

interface Edge {
  from: number;
  to: number;
  weight: number;
}

export interface Coordinate {
  id: number;
  lat: number;
  lon: number;
  label: string;
}

interface GenerateCoordinatesOptions {
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  seed?: number;
}

/**
 * Простой детерминированный генератор случайных чисел (seeded random)
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * Конвертирует километры в градусы широты/долготы
 */
function kmToLatLon(km: number, lat: number): { latDelta: number; lonDelta: number } {
  const latDelta = km / 111.32; // 1 градус широты ≈ 111.32 км
  const lonDelta = km / (111.32 * Math.cos(lat * Math.PI / 180)); // зависит от широты
  return { latDelta, lonDelta };
}

/**
 * Генерирует координаты для узлов графа используя force-directed layout
 */
export function generateGraphCoordinates(
  nodes: Node[],
  edges: Edge[],
  options: GenerateCoordinatesOptions = {}
): Coordinate[] {
  const {
    centerLat = 55.7558, // Москва
    centerLon = 37.6173,
    radiusKm = 10,
    seed = 42
  } = options;

  if (nodes.length === 0) return [];

  const rng = new SeededRandom(seed);
  const { latDelta, lonDelta } = kmToLatLon(radiusKm, centerLat);

  // Инициализация позиций узлов (случайное расположение)
  const positions: Array<{ lat: number; lon: number }> = nodes.map(() => ({
    lat: centerLat + (rng.next() - 0.5) * 2 * latDelta,
    lon: centerLon + (rng.next() - 0.5) * 2 * lonDelta
  }));

  // Создаём карту связей для быстрого доступа
  const adjacency = new Map<number, Set<number>>();
  nodes.forEach(node => adjacency.set(node.id, new Set()));
  edges.forEach(edge => {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  });

  // Force-directed layout алгоритм (упрощённый)
  const iterations = 50;
  const repulsionStrength = 0.1;
  const attractionStrength = 0.05;
  const damping = 0.9;

  const velocities = nodes.map(() => ({ lat: 0, lon: 0 }));

  for (let iter = 0; iter < iterations; iter++) {
    const forces = nodes.map(() => ({ lat: 0, lon: 0 }));

    // Repulsion: все узлы отталкиваются друг от друга
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dLat = positions[j].lat - positions[i].lat;
        const dLon = positions[j].lon - positions[i].lon;
        const distSq = dLat * dLat + dLon * dLon + 0.0001; // избегаем деления на 0
        const dist = Math.sqrt(distSq);
        const force = repulsionStrength / distSq;

        forces[i].lat -= force * dLat / dist;
        forces[i].lon -= force * dLon / dist;
        forces[j].lat += force * dLat / dist;
        forces[j].lon += force * dLon / dist;
      }
    }

    // Attraction: связанные узлы притягиваются
    edges.forEach(edge => {
      const i = nodes.findIndex(n => n.id === edge.from);
      const j = nodes.findIndex(n => n.id === edge.to);
      if (i === -1 || j === -1) return;

      const dLat = positions[j].lat - positions[i].lat;
      const dLon = positions[j].lon - positions[i].lon;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon + 0.0001);
      const force = attractionStrength * dist;

      forces[i].lat += force * dLat / dist;
      forces[i].lon += force * dLon / dist;
      forces[j].lat -= force * dLat / dist;
      forces[j].lon -= force * dLon / dist;
    });

    // Применяем силы с затуханием
    for (let i = 0; i < nodes.length; i++) {
      velocities[i].lat = (velocities[i].lat + forces[i].lat) * damping;
      velocities[i].lon = (velocities[i].lon + forces[i].lon) * damping;
      positions[i].lat += velocities[i].lat;
      positions[i].lon += velocities[i].lon;

      // Ограничиваем границами
      positions[i].lat = Math.max(centerLat - latDelta, Math.min(centerLat + latDelta, positions[i].lat));
      positions[i].lon = Math.max(centerLon - lonDelta, Math.min(centerLon + lonDelta, positions[i].lon));
    }
  }

  // Возвращаем координаты
  return nodes.map((node, idx) => ({
    id: node.id,
    lat: positions[idx].lat,
    lon: positions[idx].lon,
    label: node.label || `Node ${node.id}`
  }));
}

/**
 * Упрощённая версия: генерирует координаты в форме круга
 * Используется если нет информации о рёбрах
 */
export function generateCircularCoordinates(
  nodes: Node[],
  options: GenerateCoordinatesOptions = {}
): Coordinate[] {
  const {
    centerLat = 55.7558,
    centerLon = 37.6173,
    radiusKm = 5
  } = options;

  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{
      id: nodes[0].id,
      lat: centerLat,
      lon: centerLon,
      label: nodes[0].label || `Node ${nodes[0].id}`
    }];
  }

  const { latDelta, lonDelta } = kmToLatLon(radiusKm, centerLat);

  return nodes.map((node, idx) => {
    const angle = (2 * Math.PI * idx) / nodes.length;
    return {
      id: node.id,
      lat: centerLat + latDelta * Math.cos(angle),
      lon: centerLon + lonDelta * Math.sin(angle),
      label: node.label || `Node ${node.id}`
    };
  });
}

/**
 * Генерирует координаты на основе матрицы смежности (если есть)
 */
export function generateCoordinatesFromAdjacencyMatrix(
  matrix: number[][],
  options: GenerateCoordinatesOptions = {}
): Coordinate[] {
  const numNodes = matrix.length;
  const nodes: Node[] = Array.from({ length: numNodes }, (_, i) => ({ id: i, label: `${i}` }));
  
  const edges: Edge[] = [];
  for (let i = 0; i < numNodes; i++) {
    for (let j = i + 1; j < numNodes; j++) {
      if (matrix[i][j] > 0) {
        edges.push({ from: i, to: j, weight: matrix[i][j] });
      }
    }
  }

  if (edges.length > 0) {
    return generateGraphCoordinates(nodes, edges, options);
  } else {
    return generateCircularCoordinates(nodes, options);
  }
}
