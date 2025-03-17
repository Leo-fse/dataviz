"use client";

import { useState, useRef } from "react";
import * as d3 from "d3";

export const useZoom = (graphRef, svgGetBBox, polygonGetBBox) => {
  const [currentZoom, setCurrentZoom] = useState(1);
  const zoomRef = useRef(null);

  const setupZoom = () => {
    console.log("setupZoom");
    console.log("graphRef", graphRef);
    if (!graphRef.current) return;

    const svg = d3.select(graphRef.current).select("svg");
    const zoom = d3.zoom().on("zoom", (event) => {
      svg.select("g").attr("transform", event.transform);
      setCurrentZoom(event.transform.k); // ズームレベルを更新
    });
    svg.call(zoom);
    zoomRef.current = zoom;
  };

  const handleZoomIn = () => {
    console.log("handleZoomIn");
    console.log("zoomRef.current", zoomRef.current);
    console.log("svgGetBBox", svgGetBBox);

    if (!zoomRef.current || !svgGetBBox) return;

    const svg = d3.select(graphRef.current).select("svg");
    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;
    console.log("centerX", centerX);
    console.log("centerY", centerY);

    zoomRef.current.scaleBy(svg.transition().duration(300), 1.3, [
      centerX,
      centerY,
    ]);
  };

  return {
    setupZoom,
    currentZoom,
    zoomRef,
    handleZoomIn,
  };
};
