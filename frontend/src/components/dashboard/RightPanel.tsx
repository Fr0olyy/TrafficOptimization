import { GraphVisualization } from "../visualization/GraphVisualization";
import { YandexMapsVisualization } from "../visualization/YandexMapsVisualization";
import type { ProcessResponse, TabType } from "../../types";

interface RightPanelProps {
  results: ProcessResponse;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedGraph: number | null;
}

export function RightPanel({
  results,
  activeTab,
  onTabChange,
  selectedGraph,
}: RightPanelProps) {
  const tabs: { id: TabType; label: string }[] = [
    { id: "metrics", label: "Metrics" },
    { id: "visualization", label: "Visualization" },
    { id: "maps", label: "Maps" },
  ];

  // Mock graph data - replace with actual data from your backend
  const graphData = {
    nodes: Array.from({ length: 10 }, (_, i) => ({ id: i, label: `${i}` })),
    edges: [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 2, weight: 15 },
      { from: 1, to: 3, weight: 12 },
      { from: 2, to: 3, weight: 10 },
      { from: 3, to: 4, weight: 8 },
      // Add more edges based on your actual graph structure
    ],
  };

  // Mock coordinates - replace with actual data from your CSV
  const coordinates = [
    { id: 0, lat: 55.7558, lon: 37.6173, label: "Node 0" },
    { id: 1, lat: 55.7522, lon: 37.6156, label: "Node 1" },
    { id: 2, lat: 55.7489, lon: 37.6201, label: "Node 2" },
    // Add more coordinates from your data
  ];

  const classicalPath = [0, 1, 3, 4]; // Replace with actual path
  const quantumPath = [0, 2, 3, 4]; // Replace with actual path

  return (
    <div className="p-6">
      {/* Tabs */}
      <div
        className="flex gap-2 mb-6 border-b pb-2"
        style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === tab.id ? "" : "opacity-50 hover:opacity-75"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--color-primary)" }}
              ></div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "metrics" && (
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Detailed Metrics</h3>
          {/* Metrics table here */}
        </div>
      )}

      {activeTab === "visualization" && (
        <GraphVisualization
          graphData={graphData}
          classicalPath={classicalPath}
          quantumPath={quantumPath}
        />
      )}

      {activeTab === "maps" && (
        <YandexMapsVisualization
          apiKey="bbbcfa5a-fe28-4f09-aa62-dece34cbc32d"
          coordinates={coordinates}
          classicalRoute={classicalPath}
          quantumRoute={quantumPath}
        />
      )}
    </div>
  );
}
