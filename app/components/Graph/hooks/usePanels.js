import { useState, useRef, useCallback, useEffect } from "react";
import {
  DEFAULT_PANEL_SIZE,
  INITIAL_DRAG_STATE,
  PANEL_STYLES,
} from "../constant";

/**
 * Custom hook to manage node detail panels
 * @return {Object} Panel management utilities and state
 */
export const usePanels = () => {
  const panelsRef = useRef([]);
  const [nodeDetailsPanels, setNodeDetailsPanels] = useState([]);
  const [dragState, setDragState] = useState(INITIAL_DRAG_STATE);

  // 最後に表示したパネルの位置を記録
  const lastPanelPositionRef = useRef({ x: 20, y: 20 });

  // パネルのヘッダーの高さ - CSSから取得するか定数化するとよい
  // NodeDetailsPanelコンポーネントのヘッダー高さに合わせて調整
  const PANEL_HEADER_HEIGHT = 48; // px (paddingやborderを含む)

  // Track z-index
  const zIndexManagerRef = useRef({
    currentMaxZIndex: 0,
    getNextZIndex: function () {
      this.currentMaxZIndex += 1;
      return this.currentMaxZIndex;
    },
  });

  // Get dummy node connections (would be replaced with actual implementation)
  const getNodeConnections = useCallback((nodeId) => {
    // Example implementation - would be replaced with actual data
    return [
      { to: `Connected to ${nodeId}-1`, type: "Dependency" },
      { to: `Connected to ${nodeId}-2`, type: "Reference" },
    ];
  }, []);

  // Bring a panel to the front
  const handleBringToFront = useCallback((panelId) => {
    const currentPanels = panelsRef.current;
    const panel = currentPanels.find((p) => p.id === panelId);
    if (!panel) return;

    const newZIndex = zIndexManagerRef.current.getNextZIndex();

    currentPanels.forEach((p) => {
      if (p.id === panelId) {
        p.zIndex = newZIndex;
      }
    });

    setNodeDetailsPanels([...currentPanels]);
  }, []);

  // Activate a panel (bring to front and maximize if minimized)
  const activatePanel = useCallback(
    (panelId) => {
      const currentPanels = panelsRef.current;
      const panel = currentPanels.find((p) => p.id === panelId);
      if (!panel) return;

      handleBringToFront(panelId);

      if (panel.minimized) {
        panel.minimized = false;
        setNodeDetailsPanels([...currentPanels]);
      }
    },
    [handleBringToFront]
  );

  // 新しいパネルの位置を計算
  const calculateNewPanelPosition = useCallback(() => {
    // 最後に表示したパネルの位置から少しずらす
    const newPosition = {
      x: lastPanelPositionRef.current.x,
      y: lastPanelPositionRef.current.y + PANEL_HEADER_HEIGHT, // ヘッダー分だけ下げる
    };

    // 画面からはみ出さないように調整
    const maxX = window.innerWidth - DEFAULT_PANEL_SIZE.width - 40; // 余白を考慮
    const maxY = window.innerHeight - DEFAULT_PANEL_SIZE.height - 40; // 余白を考慮

    // 画面右端や下端に達したら左上に戻す
    if (newPosition.x > maxX) {
      newPosition.x = 100;
    }

    if (newPosition.y > maxY) {
      newPosition.y = 100;
    }

    // 最後のパネル位置を更新
    lastPanelPositionRef.current = newPosition;

    return newPosition;
  }, []);

  // Create a new node details panel
  const createNewNodeDetailsPanel = useCallback(
    (nodeId) => {
      if (!nodeId) return;

      // Check if panel already exists for this node
      const currentPanels = panelsRef.current;
      const existingPanels = currentPanels.filter(
        (panel) => panel.nodeId === nodeId
      );

      if (existingPanels.length > 0) {
        // Activate existing panel instead of creating a new one
        const existingPanel = existingPanels[existingPanels.length - 1];
        activatePanel(existingPanel.id);
        return;
      }

      // 新しいパネルの位置を計算
      const position = calculateNewPanelPosition();

      // Create panel with highest z-index
      const newZIndex = zIndexManagerRef.current.getNextZIndex();

      // Create panel data
      const nodeInfo = {
        id: `${nodeId}-${Date.now()}`, // Unique ID
        nodeId: nodeId,
        title: `Node ${nodeId}`,
        description: `Details for node ${nodeId}. Additional information can be added here.`,
        connections: getNodeConnections(nodeId),
        position: position,
        size: DEFAULT_PANEL_SIZE,
        minimized: false,
        zIndex: newZIndex,
      };

      // Add new panel
      panelsRef.current.push(nodeInfo);
      setNodeDetailsPanels([...panelsRef.current]);

      return nodeInfo;
    },
    [activatePanel, getNodeConnections, calculateNewPanelPosition]
  );

  // Close a panel
  const handleClosePanel = useCallback((panelId) => {
    panelsRef.current = panelsRef.current.filter(
      (panel) => panel.id !== panelId
    );
    setNodeDetailsPanels([...panelsRef.current]);
  }, []);

  // Toggle minimized state
  const handleToggleMinimize = useCallback((panelId) => {
    const currentPanels = panelsRef.current;

    currentPanels.forEach((panel) => {
      if (panel.id === panelId) {
        panel.minimized = !panel.minimized;
      }
    });

    setNodeDetailsPanels([...currentPanels]);
  }, []);

  // Start panel drag
  const handlePanelDragStart = useCallback(
    (e, panelId) => {
      e.preventDefault();
      const panel = nodeDetailsPanels.find((p) => p.id === panelId);
      if (!panel) return;

      handleBringToFront(panelId);

      setDragState({
        ...dragState,
        isPanelDragging: true,
        activePanel: panelId,
        startX: e.clientX - panel.position.x,
        startY: e.clientY - panel.position.y,
      });
    },
    [dragState, handleBringToFront, nodeDetailsPanels]
  );

  // Start resize
  const handleResizeStart = useCallback(
    (e, panelId) => {
      e.preventDefault();
      const panel = nodeDetailsPanels.find((p) => p.id === panelId);
      if (!panel) return;

      handleBringToFront(panelId);

      setDragState({
        ...dragState,
        isResizing: true,
        activePanel: panelId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: panel.size.width,
        startHeight:
          typeof panel.size.height === "number" ? panel.size.height : 200,
      });
    },
    [dragState, handleBringToFront, nodeDetailsPanels]
  );

  // Handle mouse movement for dragging and resizing
  const handleMouseMove = useCallback(
    (e) => {
      const currentPanels = panelsRef.current;

      // Handle panel dragging
      if (dragState.isPanelDragging && dragState.activePanel) {
        const panelId = dragState.activePanel;
        const newX = e.clientX - dragState.startX;
        const newY = e.clientY - dragState.startY;

        currentPanels.forEach((panel) => {
          if (panel.id === panelId) {
            panel.position = { x: newX, y: newY };
          }
        });

        setNodeDetailsPanels([...currentPanels]);
      }

      // Handle panel resizing
      if (dragState.isResizing && dragState.activePanel) {
        const panelId = dragState.activePanel;
        const newWidth = Math.max(
          200,
          dragState.startWidth + (e.clientX - dragState.startX)
        );
        const newHeight = Math.max(
          100,
          dragState.startHeight + (e.clientY - dragState.startY)
        );

        currentPanels.forEach((panel) => {
          if (panel.id === panelId) {
            panel.size = { width: newWidth, height: newHeight };
          }
        });

        setNodeDetailsPanels([...currentPanels]);
      }
    },
    [dragState]
  );

  // Handle mouse up event (end drag/resize)
  const handleMouseUp = useCallback(() => {
    if (dragState.isPanelDragging || dragState.isResizing) {
      // ドラッグ終了時に最後のパネル位置を更新
      if (dragState.isPanelDragging && dragState.activePanel) {
        const panel = panelsRef.current.find(
          (p) => p.id === dragState.activePanel
        );
        if (panel) {
          lastPanelPositionRef.current = { ...panel.position };
        }
      }

      setDragState({
        ...dragState,
        isPanelDragging: false,
        isResizing: false,
        activePanel: null,
      });
    }
  }, [dragState]);

  // Reset all panels
  const resetPanels = useCallback(() => {
    panelsRef.current = [];
    setNodeDetailsPanels([]);
    lastPanelPositionRef.current = { x: 100, y: 100 }; // 初期位置にリセット
    zIndexManagerRef.current.currentMaxZIndex = 0;
  }, []);

  // Set up global mouse event listeners
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    nodeDetailsPanels,
    createNewNodeDetailsPanel,
    handleClosePanel,
    handleToggleMinimize,
    handlePanelDragStart,
    handleResizeStart,
    resetPanels,
    handleBringToFront,
    activatePanel,
  };
};
