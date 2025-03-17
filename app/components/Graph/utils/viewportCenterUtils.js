/**
 * Calculate the center point of the current viewport in a scrollable container
 * @param {HTMLElement} scrollContainer - The scrollable container element
 * @return {Object} - The center coordinates {x, y} relative to the scroll container's content
 */
export const getViewportCenter = (scrollContainer) => {
  if (!scrollContainer) return { x: 0, y: 0 };

  // Get the scroll position
  const scrollLeft = scrollContainer.scrollLeft;
  const scrollTop = scrollContainer.scrollTop;

  // Get the visible viewport dimensions
  const viewportWidth = scrollContainer.clientWidth;
  const viewportHeight = scrollContainer.clientHeight;

  // Calculate the center point
  const centerX = scrollLeft + viewportWidth / 2;
  const centerY = scrollTop + viewportHeight / 2;

  return { x: centerX, y: centerY };
};

/**
 * Convert the viewport center to SVG coordinates
 * @param {Object} viewportCenter - The center point in DOM coordinates
 * @param {SVGElement} svgElement - The SVG element
 * @return {Object} - The center coordinates {x, y} in SVG space
 */
export const domToSvgCoordinates = (viewportCenter, svgElement) => {
  if (!svgElement || !viewportCenter) return { x: 0, y: 0 };

  // Get the SVG's CTM (Current Transformation Matrix)
  const svgPoint = svgElement.createSVGPoint();
  svgPoint.x = viewportCenter.x;
  svgPoint.y = viewportCenter.y;

  // Get the inverse transformation to convert from screen to SVG coordinates
  const CTM = svgElement.getScreenCTM();
  if (!CTM) return viewportCenter; // Fallback if getScreenCTM is not available

  const inverseCTM = CTM.inverse();
  const transformedPoint = svgPoint.matrixTransform(inverseCTM);

  return {
    x: transformedPoint.x,
    y: transformedPoint.y,
  };
};
