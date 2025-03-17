import React from "react";
import { Box, Card, CardContent, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PANEL_STYLES } from "../constant";

/**
 * Draggable and resizable panel showing node details
 *
 * @param {Object} props - Component props
 * @param {Object} props.panel - Panel data
 * @param {Function} props.onClose - Close panel callback
 * @param {Function} props.onMinimize - Minimize panel callback
 * @param {Function} props.onDragStart - Start dragging callback
 * @param {Function} props.onResizeStart - Start resizing callback
 */
const NodeDetailsPanel = ({
  panel,
  onClose,
  onMinimize,
  onDragStart,
  onResizeStart,
}) => {
  return (
    <Card
      sx={{
        position: "absolute",
        top: panel.position.y,
        left: panel.position.x,
        width: panel.size.width,
        height: panel.minimized ? "auto" : panel.size.height,
        maxWidth: "95%",
        zIndex: panel.zIndex,
        boxShadow: 3,
        overflow: "hidden",
        transition: "height 0.2s ease-in-out",
      }}
    >
      {/* Panel Header - Drag Handle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          backgroundColor: PANEL_STYLES.headerBgColor,
          padding: "8px 16px",
          cursor: "move",
          "&:hover": { backgroundColor: PANEL_STYLES.headerHoverBgColor },
          borderBottom: PANEL_STYLES.headerBorderBottom,
          position: "relative",
        }}
        onMouseDown={(e) => onDragStart(e, panel.id)}
      >
        {/* Drag Handle Icon */}
        <Box
          sx={{
            mr: 1,
            display: "flex",
            alignItems: "center",
            color: "rgba(0, 0, 0, 0.4)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7 19v-2h2v2H7zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2zm-8-4v-2h2v2H7zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2zm-8-4V9h2v2H7zm4 0V9h2v2h-2zm4 0V9h2v2h-2zM7 7V5h2v2H7zm4 0V5h2v2h-2zm4 0V5h2v2h-2z"
            />
          </svg>
        </Box>

        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {panel.title}
        </Typography>

        {/* Control Buttons */}
        <Box>
          <IconButton
            size="small"
            onClick={() => onMinimize(panel.id)}
            sx={{ mr: 0.5 }}
          >
            {panel.minimized ? (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13H5v-2h14v2z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"
                />
              </svg>
            )}
          </IconButton>
          <IconButton size="small" onClick={() => onClose(panel.id)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Panel Content */}
      {!panel.minimized && (
        <CardContent>
          <Typography variant="body1" paragraph>
            {panel.description}
          </Typography>

          <Typography variant="subtitle1" fontWeight="bold">
            Connections:
          </Typography>

          {panel.connections.map((conn, idx) => (
            <Box key={idx} sx={{ mt: 1 }}>
              <Typography variant="body2">
                • {conn.to} ({conn.type})
              </Typography>
            </Box>
          ))}
        </CardContent>
      )}

      {/* Resize Handle */}
      {!panel.minimized && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            cursor: "nwse-resize",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
          onMouseDown={(e) => onResizeStart(e, panel.id)}
        >
          <svg width="10" height="10" viewBox="0 0 24 24">
            <path
              fill="rgba(0,0,0,0.3)"
              d="M22 22H20V20H22V22ZM22 20H20V18H22V20ZM20 22H18V20H20V22ZM18 22H16V20H18V22Z"
            />
          </svg>
        </Box>
      )}
    </Card>
  );
};

export default NodeDetailsPanel;
