import React from "react";
import { Box, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

/**
 * Google Maps style zoom controls
 *
 * @param {Object} props - Component props
 * @param {Function} props.onZoomIn - Callback for zoom in
 * @param {Function} props.onZoomOut - Callback for zoom out
 */
const ZoomControls = ({ onZoomIn, onZoomOut }) => {
  return (
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
      <IconButton onClick={onZoomIn} size="small">
        <AddIcon />
      </IconButton>

      <Box sx={{ height: "1px", backgroundColor: "#e0e0e0" }} />

      <IconButton onClick={onZoomOut} size="small">
        <RemoveIcon />
      </IconButton>
    </Box>
  );
};

export default ZoomControls;
