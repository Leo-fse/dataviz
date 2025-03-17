import { useState, useEffect, useRef, useCallback } from "react";
import {
  getViewportCenter,
  domToSvgCoordinates,
} from "../utils/viewportCenterUtils";

/**
 * Custom hook to track the center point of the viewport in a scrollable container
 * @param {Object} options - Configuration options
 * @param {boolean} options.trackScrolling - Whether to track scrolling events
 * @param {boolean} options.trackZooming - Whether to track zoom events
 * @return {Object} - Hook API
 */
export const useViewportCenter = ({
  trackScrolling = true,
  trackZooming = true,
} = {}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [viewportCenter, setViewportCenter] = useState({ x: 0, y: 0 });
  const [svgCenter, setSvgCenter] = useState({ x: 0, y: 0 });

  // Calculate the center of the current viewport
  const calculateCenter = useCallback(() => {
    if (!containerRef.current) return;

    const center = getViewportCenter(containerRef.current);
    setViewportCenter(center);

    // If SVG element is available, convert to SVG coordinates
    if (svgRef.current) {
      const svgCoords = domToSvgCoordinates(center, svgRef.current);
      setSvgCenter(svgCoords);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Calculate initial center
    calculateCenter();

    // Set up scroll event listener if tracking is enabled
    if (trackScrolling) {
      container.addEventListener("scroll", calculateCenter);
    }

    // Set up resize listener
    const resizeObserver = new ResizeObserver(() => {
      calculateCenter();
    });
    resizeObserver.observe(container);

    // Cleanup function
    return () => {
      if (trackScrolling) {
        container.removeEventListener("scroll", calculateCenter);
      }
      resizeObserver.disconnect();
    };
  }, [calculateCenter, trackScrolling]);

  // If zoom changes, recalculate center (for D3 zoom)
  const onZoomChange = useCallback(() => {
    if (trackZooming) {
      calculateCenter();
    }
  }, [calculateCenter, trackZooming]);

  return {
    containerRef,
    svgRef,
    viewportCenter, // Center in DOM coordinates
    svgCenter, // Center in SVG coordinates
    calculateCenter, // Manually trigger center calculation
    onZoomChange, // Call this when zoom changes
  };
};
