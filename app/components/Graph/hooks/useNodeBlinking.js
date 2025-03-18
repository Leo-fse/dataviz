import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import { ZOOM_SETTINGS } from "../constant";

/**
 * Custom hook to handle node blinking effects while preserving original colors
 * @return {Object} Node blinking functionality
 */
export const useNodeBlinking = () => {
  const blinkIntervalRef = useRef(null);
  const blinkTimeoutRef = useRef(null);
  const originalNodeColorsRef = useRef(new Map());

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

    // Restore original colors for all nodes that were blinking
    originalNodeColorsRef.current.forEach((color, nodeId) => {
      const node = d3.select(`#${nodeId} ellipse`);
      if (!node.empty()) {
        node
          .transition()
          .duration(200)
          .attr("fill", color)
          .attr("opacity", 1.0);
      }
    });

    // Clear the stored colors
    originalNodeColorsRef.current.clear();
  }, []);

  // Make a node blink while preserving its original color
  const blinkNode = useCallback(
    (nodeId) => {
      // Clear previous blinking
      clearBlinkEffects();

      const node = d3.select(`#${nodeId} ellipse`);
      if (node.empty()) return;

      // Store the original fill color before modifying it
      const originalFill = node.attr("fill") || "white";
      originalNodeColorsRef.current.set(nodeId, originalFill);

      console.log(`Node ${nodeId} original color: ${originalFill}`);

      // Calculate a lighter version of the original color for the blink effect
      let lightColor;
      if (
        originalFill === "white" ||
        originalFill === "#ffffff" ||
        originalFill === "rgb(255, 255, 255)"
      ) {
        lightColor = "lightgray"; // If the node is white, use lightgray for blinking
      } else {
        // For any other color, create a lighter version
        // Try to handle different color formats
        try {
          let color;
          if (originalFill.startsWith("rgb")) {
            // Parse RGB format
            const rgbMatch = originalFill.match(
              /rgb\((\d+),\s*(\d+),\s*(\d+)\)/
            );
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1], 10);
              const g = parseInt(rgbMatch[2], 10);
              const b = parseInt(rgbMatch[3], 10);
              color = d3.rgb(r, g, b);
            }
          } else if (originalFill.startsWith("#")) {
            // Parse hex format
            color = d3.rgb(originalFill);
          } else {
            // Try to handle named colors
            color = d3.rgb(originalFill);
          }

          // Create a lighter version of the color for blinking
          if (color) {
            const lighterColor = d3.rgb(
              Math.min(255, color.r + 100),
              Math.min(255, color.g + 100),
              Math.min(255, color.b + 100)
            );
            lightColor = lighterColor.toString();
          } else {
            lightColor = "lightgray"; // Fallback
          }
        } catch (e) {
          console.warn("Error processing color:", e);
          lightColor = "lightgray"; // Fallback on error
        }
      }

      console.log(`Node ${nodeId} blink color: ${lightColor}`);

      let isHighlighted = false;

      // Toggle highlighting at regular intervals
      blinkIntervalRef.current = setInterval(() => {
        isHighlighted = !isHighlighted;
        node
          .transition()
          .duration(ZOOM_SETTINGS.blinkInterval)
          .attr("fill", isHighlighted ? lightColor : originalFill)
          .attr("opacity", isHighlighted ? 0.7 : 1.0);
      }, ZOOM_SETTINGS.blinkInterval);

      // Stop blinking after a set duration
      blinkTimeoutRef.current = setTimeout(() => {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;

        node
          .transition()
          .duration(ZOOM_SETTINGS.blinkInterval)
          .attr("fill", originalFill)
          .attr("opacity", 1.0);

        // Remove this node from our tracking map
        originalNodeColorsRef.current.delete(nodeId);
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
