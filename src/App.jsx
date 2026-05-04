import React, { useCallback, useRef, useState, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

const problems = [
  { id: "url", title: "📎 URL Shortener", required: ["client", "lb", "api", "db"] },
  { id: "chat", title: "💬 WhatsApp", required: ["client", "api", "db", "queue"] },
  { id: "insta", title: "📸 Instagram", required: ["client", "lb", "api", "db", "cache"] },
  { id: "uber", title: "🚗 Uber", required: ["client", "api", "db", "queue", "cache"] },
];

const components = [
  { id: "client", icon: "🌐", full: "Client" },
  { id: "lb", icon: "⚖️", full: "Load Balancer" },
  { id: "dns", icon: "🌍", full: "DNS" },
  { id: "cdn", icon: "🚀", full: "CDN" },
  { id: "api", icon: "🖥️", full: "API Server" },
  { id: "db", icon: "🗄️", full: "Database" },
  { id: "cache", icon: "⚡", full: "Cache" },
  { id: "queue", icon: "📩", full: "Queue" },
];

function FlowCanvas() {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(problems[0]);
  const [collapsed, setCollapsed] = useState(false);
  const [showProblems, setShowProblems] = useState(true);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const sourceType = params.source.split("-")[0];

      const edgeColorMap = {
        client: "#22c55e",
        lb: "#3b82f6",
        api: "#a855f7",
        db: "#f97316",
        cache: "#eab308",
        queue: "#14b8a6",
      };

      return addEdge(
        {
          ...params,
          animated: true,
          style: {
            strokeWidth: 2,
            stroke: edgeColorMap[sourceType] || "#3b82f6",
            strokeDasharray: "5,5",
            strokeLinecap: "round",
            filter: "drop-shadow(0 0 6px rgba(59,130,246,0.8))",
          },
        },
        eds
      );
    });
  }, []);

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event) => {
    event.preventDefault();

    const comp = JSON.parse(
      event.dataTransfer.getData("application/reactflow")
    );

    if (!comp) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: `${comp.id}-${Date.now()}`,
      position,
      data: { label: comp.full },
      style: {
        padding: "12px 16px",
        borderRadius: "16px",
        border: "1px solid #374151",
        background: "#1f2937",
        color: "#e5e7eb",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        fontWeight: "500",
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const validateConnections = (fb) => {
    const nodeMap = {};

    nodes.forEach((n) => {
      nodeMap[n.id] = n.id.split("-")[0];
    });

    const connections = edges.map((e) => ({
      from: nodeMap[e.source],
      to: nodeMap[e.target],
    }));

    const checks = [
      {
        from: "client",
        to: "lb",
        success: "✅ Traffic enters through Load Balancer",
        fail: "❌ Client not connected to Load Balancer → Requests cannot be distributed efficiently.",
      },
      {
        from: "lb",
        to: "api",
        success: "✅ Load Balancer distributes traffic to API layer",
        fail: "❌ Load Balancer not connected to API → Requests have nowhere to go.",
      },
      {
        from: "api",
        to: "db",
        success: "✅ API connected to Database",
        fail: "❌ API not connected to Database → Data cannot be stored or fetched.",
      },
    ];

    let valid = 0;

    checks.forEach((item) => {
      const exists = connections.some(
        (c) => c.from === item.from && c.to === item.to
      );

      if (exists) {
        valid += 1;
        fb.push(item.success);
      } else {
        fb.push(item.fail);
      }
    });

    return valid * 20;
  };

  const handleSubmit = () => {
    const nodeTypes = nodes.map((n) => n.id.split("-")[0]);

    let currentScore = 0;
    let fb = [];

    selectedProblem.required.forEach((req) => {
      if (nodeTypes.includes(req)) {
        currentScore += 40 / selectedProblem.required.length;
      } else {
        const suggestions = {
          url: {
            lb: "❌ Load Balancer missing → Traffic cannot scale efficiently.",
            api: "❌ API layer missing → URL creation and redirects cannot work.",
            db: "❌ Database missing → URLs cannot be stored.",
            client: "❌ Client missing → No user entry point.",
          },
          chat: {
            queue: "❌ Queue missing → Messages may be delayed or lost during spikes.",
            api: "❌ API missing → Messaging service cannot process requests.",
            db: "❌ Database missing → Chats cannot be stored.",
            client: "❌ Client missing → No users can send messages.",
          },
          insta: {
            cache: "❌ Cache missing → Feed reads may overload DB.",
            lb: "❌ Load Balancer missing → Viral traffic may crash servers.",
            api: "❌ API missing → Uploads and feeds cannot function.",
            db: "❌ Database missing → Posts/users cannot be stored.",
            client: "❌ Client missing → No users can access platform.",
          },
          uber: {
            queue: "❌ Queue missing → Ride requests may fail during surge traffic.",
            cache: "❌ Cache missing → Nearby driver lookup may be slow.",
            api: "❌ API missing → Booking system cannot function.",
            db: "❌ Database missing → Trips and users cannot be stored.",
            client: "❌ Client missing → No rider or driver apps.",
          },
        };

        fb.push(
          suggestions[selectedProblem.id]?.[req] || `❌ Missing ${req}`
        );
      }
    });

    currentScore += validateConnections(fb);

    setScore(Math.floor(currentScore));
    setFeedback(fb);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 left-4 z-50 bg-gray-800/80 border border-gray-700 px-3 py-1 rounded shadow"
      >
        {collapsed ? "☰" : "✕"}
      </button>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          collapsed ? "w-16" : "w-80"
        }`}
      >
        <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col p-3 pt-14 gap-4">
          <div>
            <div
              onClick={() => setShowProblems(!showProblems)}
              className="cursor-pointer font-semibold flex justify-between"
            >
              🎯 {!collapsed && "Problems"} {showProblems ? "▲" : "▼"}
            </div>

            {showProblems && (
              <div className="mt-2 space-y-2">
                {problems.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProblem(p);
                      setNodes([]);
                      setEdges([]);
                      setScore(null);
                      setFeedback([]);
                    }}
                    className={`p-2 rounded cursor-pointer ${
                      selectedProblem.id === p.id
                        ? "bg-blue-600 text-white font-semibold"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    {collapsed ? "🎯" : p.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {!collapsed && (
              <h2 className="font-semibold mb-2">🧩 Components</h2>
            )}

            <div className="space-y-2">
              {components.map((comp) => (
                <div
                  key={comp.id}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      "application/reactflow",
                      JSON.stringify(comp)
                    )
                  }
                  className="p-2 border border-gray-700 rounded cursor-grab hover:bg-gray-700 flex items-center gap-2"
                >
                  <span>{comp.icon}</span>
                  {!collapsed && <span>{comp.full}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h1 className="flex items-center gap-2">
            Design:
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
              {selectedProblem.title}
            </span>
          </h1>

          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Submit
          </button>
        </div>

        <div
          className="flex-1"
          ref={reactFlowWrapper}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background gap={20} color="#374151" />
          </ReactFlow>
        </div>

        {score !== null && (
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <h2 className="font-semibold mb-2">
              Score: {score}/100 • Feedback
            </h2>

            <ul className="space-y-1 text-sm max-h-40 overflow-y-auto pr-2">
              {feedback.map((f, i) => (
                <li key={i} className="leading-relaxed">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}