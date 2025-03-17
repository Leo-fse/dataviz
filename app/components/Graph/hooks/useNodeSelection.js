import { useState, useCallback } from "react";
import * as d3 from "d3";

/**
 * Custom hook to handle node selection
 * @param {Object} options - Configuration options
 * @param {Function} options.zoomToNode - Function to zoom to a node
 * @param {Function} options.createNewNodeDetailsPanel - Function to create a new panel
 * @param {Function} options.blinkNode - Function to make a node blink
 * @return {Object} Node selection utilities and state
 */
export const useNodeSelection = ({
  zoomToNode,
  createNewNodeDetailsPanel,
  blinkNode,
}) => {
  const [selectedNode, setSelectedNode] = useState("");
  const [nodes, setNodes] = useState([]);

  // Extract nodes from the graph
  const extractNodes = useCallback((selector) => {
    const nodeNames = d3
      .select(selector)
      .selectAll("g.node")
      .nodes()
      .map((node) => d3.select(node).attr("id"))
      .filter((id) => id !== null);

    // Sort alphabetically
    const uniqueNodeNames = [...new Set(nodeNames)].sort();
    setNodes(uniqueNodeNames);

    return uniqueNodeNames;
  }, []);

  // Handle node click
  const handleNodeClick = useCallback(
    (event, nodeId) => {
      event.stopPropagation();
      console.log("Node clicked:", nodeId);

      if (nodeId) {
        createNewNodeDetailsPanel(nodeId);
        zoomToNode(nodeId);
        blinkNode(nodeId);
      }
    },
    [createNewNodeDetailsPanel, zoomToNode, blinkNode]
  );

  // Handle selection from dropdown
  const handleNodeSelect = useCallback(
    (nodeId) => {
      if (!nodeId) return;

      setSelectedNode(nodeId);
      createNewNodeDetailsPanel(nodeId);
      zoomToNode(nodeId);
      blinkNode(nodeId);
    },
    [createNewNodeDetailsPanel, zoomToNode, blinkNode]
  );

  // Attach click handlers to nodes
  const attachNodeClickHandlers = useCallback(
    (selector) => {
      const nodes = d3.select(selector).selectAll("g.node");

      nodes.each(function () {
        const node = d3.select(this);
        const nodeId = node.attr("id");

        node.on("click", function (event) {
          handleNodeClick(event, nodeId);
        });
      });
    },
    [handleNodeClick]
  );

  return {
    selectedNode,
    setSelectedNode,
    nodes,
    extractNodes,
    handleNodeClick,
    handleNodeSelect,
    attachNodeClickHandlers,
  };
};
