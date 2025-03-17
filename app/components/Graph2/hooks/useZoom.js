"use client";

import { useState, useRef, useEffect } from "react";
import * as d3 from "d3";

export const useZoom = (graphRef, svgGetBBox, polygonGetBBox) => {
  const [currentZoom, setCurrentZoom] = useState(1);
  const zoomRef = useRef(null);

  // svgGetBBoxが更新されたら再設定
  useEffect(() => {
    if (svgGetBBox) {
      setupZoom();
    }
  }, [svgGetBBox]);

  const setupZoom = () => {
    console.log("setupZoom");
    if (!graphRef.current) return;

    const svg = d3.select(graphRef.current).select("svg");
    if (!svg.node()) return;

    const zoom = d3.zoom().on("zoom", (event) => {
      svg.select("g").attr("transform", event.transform);
      setCurrentZoom(event.transform.k); // ズームレベルを更新
    });

    svg.call(zoom);
    zoomRef.current = zoom;
  };

  const handleZoomIn = () => {
    if (!zoomRef.current || !graphRef.current) return;

    const svg = d3.select(graphRef.current).select("svg");
    if (!svg.node() || !svgGetBBox) return;

    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;

    zoomRef.current.scaleBy(svg.transition().duration(300), 1.3, [
      centerX,
      centerY,
    ]);
  };

  const handleZoomOut = () => {
    if (!zoomRef.current || !graphRef.current) return;

    const svg = d3.select(graphRef.current).select("svg");
    if (!svg.node() || !svgGetBBox) return;

    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;

    zoomRef.current.scaleBy(svg.transition().duration(300), 0.7, [
      centerX,
      centerY,
    ]);
  };

  return {
    setupZoom,
    currentZoom,
    zoomRef,
    handleZoomIn,
    handleZoomOut,
  };
};
