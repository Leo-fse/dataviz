import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import { ZOOM_SETTINGS } from "../constant";

/**
 * Custom hook to handle node blinking effects
 * @return {Object} Node blinking functionality
 */
export const useNodeBlinking = () => {
  const blinkIntervalRef = useRef(null);
  const blinkTimeoutRef = useRef(null);

  // Clean up any existing blink effects
  const clearBlinkEffects = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }

    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }
  }, []);

  // Make a node blink
  const blinkNode = useCallback(
    (nodeId) => {
      // Clear previous blinking
      clearBlinkEffects();

      const node = d3.select(`#${nodeId} ellipse`);
      if (node.empty()) return;

      // Reset all nodes to default appearance
      d3.selectAll("ellipse")
        .transition()
        .duration(200)
        .attr("fill", "white")
        .attr("opacity", 1.0);

      let isHighlighted = false;

      // Toggle highlighting at regular intervals
      blinkIntervalRef.current = setInterval(() => {
        isHighlighted = !isHighlighted;
        node
          .transition()
          .duration(ZOOM_SETTINGS.blinkInterval)
          .attr("fill", isHighlighted ? "lightgray" : "white")
          .attr("opacity", isHighlighted ? 0.5 : 1.0);
      }, ZOOM_SETTINGS.blinkInterval);

      // Stop blinking after a set duration
      blinkTimeoutRef.current = setTimeout(() => {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;

        node
          .transition()
          .duration(ZOOM_SETTINGS.blinkInterval)
          .attr("fill", "white")
          .attr("opacity", 1.0);
      }, ZOOM_SETTINGS.blinkDuration);
    },
    [clearBlinkEffects]
  );

  // Clean up on unmount
  useEffect(() => {
    return clearBlinkEffects;
  }, [clearBlinkEffects]);

  return { blinkNode };
};
