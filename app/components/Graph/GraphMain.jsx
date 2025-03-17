"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { graphviz } from "d3-graphviz";
import { Box } from "@mui/material";

// Import custom hooks
import { useZoom } from "./hooks/useZoom";
import { useNodeBlinking } from "./hooks/useNodeBlinking";
import { usePanels } from "./hooks/usePanels";
import { useNodeSelection } from "./hooks/useNodeSelection";

// Import components
import NodeSelector from "./components/NodeSelector";
import ZoomControls from "./components/ZoomControls";
import NodeDetailsPanel from "./components/NodeDetailsPanel";

/**
 * Main Graph component
 * @param {Object} props - Component props
 * @param {string} props.dot - DOT format graph description
 */
export const Graph = ({ dot }) => {
  const graphRef = useRef(null);
  const [svgGetBBox, setSvgGetBBox] = useState(null);
  const [polygonGetBBox, setPolygonGetBBox] = useState(null);

  // Initialize custom hooks
  const { blinkNode } = useNodeBlinking();

  const {
    zoomRef,
    currentZoom,
    initializeZoom,
    handleReset,
    handleZoomIn,
    handleZoomOut,
    zoomToNode,
  } = useZoom({ svgGetBBox, polygonGetBBox });

  const {
    nodeDetailsPanels,
    createNewNodeDetailsPanel,
    handleClosePanel,
    handleToggleMinimize,
    handlePanelDragStart,
    handleResizeStart,
    resetPanels,
  } = usePanels();

  const {
    selectedNode,
    setSelectedNode,
    nodes,
    extractNodes,
    handleNodeClick,
    handleNodeSelect,
    attachNodeClickHandlers,
  } = useNodeSelection({
    zoomToNode,
    createNewNodeDetailsPanel,
    blinkNode,
  });

  // Combined reset function
  const handleFullReset = () => {
    handleReset();
    resetPanels();
    setSelectedNode("");
  };

  // Initialize graph and set up event handlers
  useEffect(() => {
    if (!graphRef.current) return;

    const gviz = graphviz(graphRef.current, {
      useWorker: false,
    }).renderDot(dot);

    gviz.on("end", () => {
      const svg = d3.select(graphRef.current).select("svg");

      // Style the SVG
      svg.style("background-color", "lightgray");
      svg.style("border", "2px solid black");
      svg.style("width", "100%");

      // Extract nodes from graph
      const nodeNames = extractNodes(graphRef.current);
      console.log("Found nodes:", nodeNames.length);

      // Get bounding boxes
      const svgBox = svg.node().getBBox();
      const polygonBox = svg.select("polygon").node().getBBox();

      setSvgGetBBox(svgBox);
      setPolygonGetBBox(polygonBox);

      // Set up zoom behavior
      const zoomBehavior = initializeZoom(svg);

      // Attach click handlers to nodes
      attachNodeClickHandlers(graphRef.current);

      // Initial reset after state is updated
      setTimeout(handleReset, 300);
    });
  }, [extractNodes, attachNodeClickHandlers, handleReset, initializeZoom]);

  return (
    <div>
      {/* Node selection dropdown and reset button */}
      <NodeSelector
        selectedNode={selectedNode}
        nodes={nodes}
        onNodeSelect={handleNodeSelect}
        onReset={handleFullReset}
      />

      {/* Graph container */}
      <Box sx={{ position: "relative" }}>
        {/* Main graph */}
        <div ref={graphRef} style={{ width: "100%" }} />

        {/* Node detail panels */}
        {nodeDetailsPanels.map((panel) => (
          <NodeDetailsPanel
            key={panel.id}
            panel={panel}
            onClose={handleClosePanel}
            onMinimize={handleToggleMinimize}
            onDragStart={handlePanelDragStart}
            onResizeStart={handleResizeStart}
          />
        ))}

        {/* Zoom controls */}
        <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </Box>
    </div>
  );
};
