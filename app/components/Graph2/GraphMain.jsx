"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useZoom } from "./hooks/useZoom";
import { useCreateGraph } from "./hooks/useCreateGraph";

export const Graph2 = ({ dot }) => {
  const graphRef = useRef(null);

  // hooksでロジックを分離
  const { nodes, svgGetBBox, polygonGetBBox, initializeGraph } = useCreateGraph(
    graphRef,
    dot
  );

  const { currentZoom, zoomRef, setupZoom, handleZoomIn } = useZoom(
    graphRef,
    svgGetBBox,
    polygonGetBBox
  );

  useEffect(() => {
    initializeGraph();
    setupZoom();
  }, [dot]);

  return (
    <Box sx={{ position: "relative" }}>
      <div ref={graphRef} style={{ width: "100%" }} />
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          backgroundColor: "white",
          borderRadius: "4px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <IconButton size="small" onClick={handleZoomIn}>
          <AddIcon />
        </IconButton>
        <Box sx={{ height: "1px", backgroundColor: "#e0e0e0" }} />
        <IconButton size="small">
          <RemoveIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
