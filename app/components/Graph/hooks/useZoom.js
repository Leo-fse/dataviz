import { useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { ZOOM_SETTINGS } from "../constant";

/**
 * Custom hook to handle zoom functionality
 * @param {Object} options - Configuration options
 * @param {Object} options.svgGetBBox - SVG bounding box
 * @param {Object} options.polygonGetBBox - Graph polygon bounding box
 * @return {Object} Zoom utilities and state
 */
export const useZoom = ({ svgGetBBox, polygonGetBBox }) => {
  const zoomRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Initialize zoom
  const initializeZoom = useCallback((svg) => {
    const zoom = d3.zoom().on("zoom", (event) => {
      svg.select("g").attr("transform", event.transform);
      setCurrentZoom(event.transform.k);
    });

    svg.call(zoom);
    zoomRef.current = zoom;

    return zoom;
  }, []);

  // Reset view to default
  const handleReset = useCallback(() => {
    if (!svgGetBBox || !polygonGetBBox || !zoomRef.current) return;

    const svg = d3.select("svg");
    const graphCenterX = polygonGetBBox.x - svgGetBBox.x;
    const graphCenterY = polygonGetBBox.y - svgGetBBox.y;

    svg
      .transition()
      .duration(750)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(-graphCenterX, -graphCenterY).scale(1)
      );
  }, [svgGetBBox, polygonGetBBox]);

  // Zoom in function
  const handleZoomIn = useCallback(() => {
    if (!zoomRef.current || !svgGetBBox) return;

    const svg = d3.select("svg");
    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;

    zoomRef.current.scaleBy(
      svg.transition().duration(ZOOM_SETTINGS.animationDuration),
      ZOOM_SETTINGS.zoomInFactor,
      [centerX, centerY]
    );
  }, [svgGetBBox]);

  // Zoom out function
  const handleZoomOut = useCallback(() => {
    if (!zoomRef.current || !svgGetBBox) return;

    const svg = d3.select("svg");
    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;

    zoomRef.current.scaleBy(
      svg.transition().duration(ZOOM_SETTINGS.animationDuration),
      ZOOM_SETTINGS.zoomOutFactor,
      [centerX, centerY]
    );
  }, [svgGetBBox]);

  // Zoom to specific node
  const zoomToNode = useCallback(
    (nodeId) => {
      if (!svgGetBBox || !zoomRef.current) return;

      const svg = d3.select("svg");
      const g = svg.select("g");
      const node = g.select(`#${nodeId}`);

      if (node.empty()) return;

      // Get node position
      const nodeBox = node.node().getBBox();
      const nodeCenterX = nodeBox.x + nodeBox.width / 2;
      const nodeCenterY = nodeBox.y + nodeBox.height / 2;

      // Scale for node focus
      const zoomScale = ZOOM_SETTINGS.nodeZoomScale;

      // Calculate translation to center the node
      const translateX = svgGetBBox.width / 2 - nodeCenterX * zoomScale;
      const translateY = svgGetBBox.height / 2 - nodeCenterY * zoomScale;

      // Apply zoom transformation
      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(zoomScale);

      svg.transition().duration(750).call(zoomRef.current.transform, transform);
    },
    [svgGetBBox]
  );

  return {
    zoomRef,
    currentZoom,
    initializeZoom,
    handleReset,
    handleZoomIn,
    handleZoomOut,
    zoomToNode,
  };
};
