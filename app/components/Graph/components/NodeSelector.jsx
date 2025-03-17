import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Button,
} from "@mui/material";

/**
 * Node selection component with dropdown and reset button
 *
 * @param {Object} props - Component props
 * @param {string} props.selectedNode - Currently selected node
 * @param {Array} props.nodes - List of available nodes
 * @param {Function} props.onNodeSelect - Callback when node is selected
 * @param {Function} props.onReset - Callback for reset button
 */
const NodeSelector = ({ selectedNode, nodes, onNodeSelect, onReset }) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <FormControl style={{ minWidth: 200 }}>
        <InputLabel>Select Node</InputLabel>
        <Select
          value={selectedNode}
          onChange={(e) => onNodeSelect(e.target.value)}
        >
          {nodes.map((node) => (
            <MenuItem key={node} value={node}>
              {node}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        color="secondary"
        onClick={onReset}
        style={{ marginLeft: 10 }}
      >
        Reset
      </Button>
    </Box>
  );
};

export default NodeSelector;
