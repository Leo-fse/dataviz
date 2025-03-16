"use client";

import * as d3 from "d3";
import { graphviz } from "d3-graphviz";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  IconButton,
  Box,
  Paper,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";

export const Graph = ({ dot }) => {
  const ref = useRef(null);
  const [selectedNode, setSelectedNode] = useState(""); // 選択されたノード
  const [nodes, setNodes] = useState([]); // ノード一覧
  const [svgGetBBox, setSvgGetBBox] = useState(null); // SVG全体のサイズ情報
  const [polygonGetBBox, setPolygonGetBBox] = useState(null); // グラフの囲みサイズ
  const zoomRef = useRef(null); // D3ズームインスタンス
  const blinkIntervalRef = useRef(null); // 点滅管理用
  const blinkTimeoutRef = useRef(null); // **点滅終了用タイマー**
  const [currentZoom, setCurrentZoom] = useState(1); // 現在のズームレベル
  // ノードの詳細情報を保持するための新しい状態
  const [nodeDetailsPanels, setNodeDetailsPanels] = useState([]); // 複数パネル対応
  // ドラッグとリサイズのための状態
  const [dragState, setDragState] = useState({
    isPanelDragging: false,
    isResizing: false,
    activePanel: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  useEffect(() => {
    if (ref.current) {
      const gviz = graphviz(ref.current, {
        useWorker: false,
      }).renderDot(dot);

      gviz.on("end", () => {
        const svg = d3.select(ref.current).select("svg");
        svg.style("background-color", "lightgray");
        svg.style("border", "2px solid black");
        svg.style("width", "100%");
        // svg.style("height", "100%");

        // ノード一覧を取得
        const nodeNames = d3
          .select(ref.current)
          .selectAll("g.node")
          .nodes()
          .map((node) => d3.select(node).attr("id"))
          .filter((id) => id !== null);

        // アルファベット順にソート
        const uniqueNodeNames = [...new Set(nodeNames)].sort();
        setNodes(uniqueNodeNames);

        // SVGのサイズを取得
        const svgBox = svg.node().getBBox();
        const polygonBox = svg.select("polygon").node().getBBox();

        console.log("svgGetBBox", svgBox);
        console.log("polygonGetBBox", polygonBox);

        setSvgGetBBox(svgBox);
        setPolygonGetBBox(polygonBox);

        // ズーム設定
        const zoom = d3.zoom().on("zoom", (event) => {
          svg.select("g").attr("transform", event.transform);
          setCurrentZoom(event.transform.k); // ズームレベルを更新
        });
        svg.call(zoom);
        zoomRef.current = zoom;

        // ノードにクリックイベントを追加
        d3.select(ref.current)
          .selectAll("g.node")
          .on("click", function (event) {
            event.stopPropagation(); // イベントの伝播を停止
            const nodeId = d3.select(this).attr("id");
            showNodeDetails(nodeId);
            zoomToNode(nodeId);
          });

        // SVGの背景クリックで詳細を閉じる
        svg.on("click", function () {
          setNodeDetails(null);
        });

        // 🔥 状態が更新された後にリセットを適用する
        setTimeout(handleReset, 300);
      });
    }
  }, []);

  // ノードの詳細情報を表示する関数
  const showNodeDetails = (nodeId) => {
    if (!nodeId) return;

    // 既にそのノードのパネルが開いていればフォーカスするだけ
    const existingPanelIndex = nodeDetailsPanels.findIndex(
      (panel) => panel.id === nodeId
    );
    if (existingPanelIndex >= 0) {
      // 既存のパネルを最前面に持ってくる処理
      const updatedPanels = [...nodeDetailsPanels];
      const panel = { ...updatedPanels[existingPanelIndex] };
      updatedPanels.splice(existingPanelIndex, 1);
      updatedPanels.push(panel);
      setNodeDetailsPanels(updatedPanels);
      return;
    }

    // ダミーのノード詳細情報
    const nodeInfo = {
      id: nodeId,
      title: `ノード ${nodeId}`,
      description: `これはノード ${nodeId} の詳細情報です。必要に応じてさらに情報を追加できます。`,
      connections: getNodeConnections(nodeId),
      position: { x: 10, y: 10 },
      size: { width: 300, height: "auto" },
      minimized: false,
      zIndex: nodeDetailsPanels.length + 1,
    };

    // 新しいパネルを追加
    setNodeDetailsPanels([...nodeDetailsPanels, nodeInfo]);
    setSelectedNode(nodeId);
  };

  // ノードの接続先を取得する関数（dotの解析から実装可能）
  const getNodeConnections = (nodeId) => {
    // この実装はシンプルな例です。実際のdotデータからパースするにはより複雑なロジックが必要かもしれません。
    // ここではダミーデータを返しています
    return [
      { to: "接続先ノード1", type: "依存関係" },
      { to: "接続先ノード2", type: "参照" },
    ];
  };

  const zoomToNode = (nodeId) => {
    if (!svgGetBBox) return;

    const svg = d3.select(ref.current).select("svg");
    const g = svg.select("g");

    const node = g.select(`#${nodeId}`);
    if (node.empty()) return;

    // ノードの位置を取得
    const nodeBox = node.node().getBBox();
    const nodeCenterX = nodeBox.x + nodeBox.width / 2;
    const nodeCenterY = nodeBox.y + nodeBox.height / 2;

    // ズーム倍率（ノードを大きく表示するためのスケール）
    const zoomScale = 2.0;

    // ノードを中心に持ってくるための移動量
    const translateX = svgGetBBox.width / 2 - nodeCenterX * zoomScale;
    const translateY = svgGetBBox.height / 2 - nodeCenterY * zoomScale;

    console.log("Zooming to:", {
      nodeCenterX,
      nodeCenterY,
      translateX,
      translateY,
    });

    // ズーム変換を適用
    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(zoomScale);
    svg.transition().duration(750).call(zoomRef.current.transform, transform);

    // **ノードを4秒間点滅させる**
    blinkNode(nodeId);
  };

  const blinkNode = (nodeId) => {
    // 以前の点滅をクリア
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
    }

    const node = d3.select(ref.current).select(`#${nodeId} ellipse`);
    if (node.empty()) return;

    // 以前のノードの色を元に戻す
    d3.select(ref.current)
      .selectAll("ellipse")
      .transition()
      .duration(200)
      .attr("fill", "white")
      .attr("opacity", 1.0);

    let isHighlighted = false;

    // 500ms 間隔で透明度を変える（スケルトンローディング風）
    blinkIntervalRef.current = setInterval(() => {
      isHighlighted = !isHighlighted;
      node
        .transition()
        .duration(500) // 0.5秒でゆっくり変化
        .attr("fill", isHighlighted ? "lightgray" : "white")
        .attr("opacity", isHighlighted ? 0.5 : 1.0);
    }, 500);

    // **4秒後に点滅を停止**
    blinkTimeoutRef.current = setTimeout(() => {
      clearInterval(blinkIntervalRef.current);
      node
        .transition()
        .duration(500)
        .attr("fill", "white")
        .attr("opacity", 1.0); // 完全に元の状態に戻す
    }, 4000);
  };

  const handleReset = () => {
    if (!svgGetBBox || !polygonGetBBox) return;

    const svg = d3.select(ref.current).select("svg");

    const graphCenterX = polygonGetBBox.x - svgGetBBox.x;
    const graphCenterY = polygonGetBBox.y - svgGetBBox.y;

    console.log("Resetting to:", { graphCenterX, graphCenterY });
    svg
      .transition()
      .duration(750)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(-graphCenterX, -graphCenterY).scale(1)
      );

    setSelectedNode("");
    // 全パネルを閉じる
    setNodeDetailsPanels([]);
  };

  const handleZoomIn = () => {
    if (!zoomRef.current) return;

    const svg = d3.select(ref.current).select("svg");

    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;

    // D3.jsのズーム機能を使用して、中心点を指定してズーム
    zoomRef.current.scaleBy(svg.transition().duration(300), 1.3, [
      centerX,
      centerY,
    ]);
  };

  const handleZoomOut = () => {
    if (!zoomRef.current) return;

    const svg = d3.select(ref.current).select("svg");

    const centerX = svgGetBBox.width / 2;
    const centerY = svgGetBBox.height / 2;

    // D3.jsのズーム機能を使用して、中心点を指定してズーム
    zoomRef.current.scaleBy(svg.transition().duration(300), 0.7, [
      centerX,
      centerY,
    ]);
  };

  // パネルを閉じる
  const handleClosePanel = (panelId) => {
    setNodeDetailsPanels(
      nodeDetailsPanels.filter((panel) => panel.id !== panelId)
    );
  };

  // パネルを最小化/最大化
  const handleToggleMinimize = (panelId) => {
    setNodeDetailsPanels(
      nodeDetailsPanels.map((panel) =>
        panel.id === panelId ? { ...panel, minimized: !panel.minimized } : panel
      )
    );
  };

  // パネルを最前面に
  const handleBringToFront = (panelId) => {
    const panel = nodeDetailsPanels.find((p) => p.id === panelId);
    if (!panel) return;

    const maxZIndex = Math.max(...nodeDetailsPanels.map((p) => p.zIndex));

    setNodeDetailsPanels(
      nodeDetailsPanels.map((p) =>
        p.id === panelId ? { ...p, zIndex: maxZIndex + 1 } : p
      )
    );
  };

  // ドラッグ開始時の処理
  const handlePanelDragStart = (e, panelId) => {
    e.preventDefault();
    const panel = nodeDetailsPanels.find((p) => p.id === panelId);
    if (!panel) return;

    // このパネルを最前面に
    handleBringToFront(panelId);

    setDragState({
      ...dragState,
      isPanelDragging: true,
      activePanel: panelId,
      startX: e.clientX - panel.position.x,
      startY: e.clientY - panel.position.y,
    });
  };

  // リサイズ開始時の処理
  const handleResizeStart = (e, panelId) => {
    e.preventDefault();
    const panel = nodeDetailsPanels.find((p) => p.id === panelId);
    if (!panel) return;

    // このパネルを最前面に
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
  };

  // マウス移動のハンドリング（ドラッグとリサイズ）
  const handleMouseMove = (e) => {
    // ドラッグ中
    if (dragState.isPanelDragging && dragState.activePanel) {
      const panelId = dragState.activePanel;
      const newX = e.clientX - dragState.startX;
      const newY = e.clientY - dragState.startY;

      setNodeDetailsPanels(
        nodeDetailsPanels.map((panel) =>
          panel.id === panelId
            ? { ...panel, position: { x: newX, y: newY } }
            : panel
        )
      );
    }

    // リサイズ中
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

      setNodeDetailsPanels(
        nodeDetailsPanels.map((panel) =>
          panel.id === panelId
            ? { ...panel, size: { width: newWidth, height: newHeight } }
            : panel
        )
      );
    }
  };

  // マウスアップイベントのハンドリング
  const handleMouseUp = () => {
    if (dragState.isPanelDragging || dragState.isResizing) {
      setDragState({
        ...dragState,
        isPanelDragging: false,
        isResizing: false,
        activePanel: null,
      });
    }
  };

  // グローバルのマウスイベントをリッスン
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // クリーンアップ関数
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, nodeDetailsPanels]);

  return (
    <div>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <FormControl style={{ minWidth: 200 }}>
          <InputLabel>ノードを選択</InputLabel>
          <Select
            value={selectedNode}
            onChange={(e) => {
              setSelectedNode(e.target.value);
              zoomToNode(e.target.value);
              showNodeDetails(e.target.value);
            }}
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
          onClick={handleReset}
          style={{ marginLeft: 10 }}
        >
          リセット
        </Button>
      </Box>

      {/* グラフコンテナ - 相対配置 */}
      <Box sx={{ position: "relative" }}>
        <div ref={ref} style={{ width: "100%" }} />

        {/* 複数のノード詳細パネル - ドラッグとリサイズ可能 */}
        {nodeDetailsPanels.map((panel, index) => (
          <Card
            key={panel.id}
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
            {/* パネルヘッダー - ドラッグハンドル */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                padding: "8px 16px",
                cursor: "move",
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.08)" },
                borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                position: "relative",
              }}
              onMouseDown={(e) => handlePanelDragStart(e, panel.id)}
            >
              {/* ドラッグハンドルアイコン */}
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

              {/* コントロールボタン */}
              <Box>
                <IconButton
                  size="small"
                  onClick={() => handleToggleMinimize(panel.id)}
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
                <IconButton
                  size="small"
                  onClick={() => handleClosePanel(panel.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* パネル内容 */}
            {!panel.minimized && (
              <CardContent>
                <Typography variant="body1" paragraph>
                  {panel.description}
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  接続情報:
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

            {/* リサイズハンドル */}
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
                onMouseDown={(e) => handleResizeStart(e, panel.id)}
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
        ))}

        {/* Google Map風のズームコントロール */}
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
          <IconButton onClick={handleZoomIn} size="small">
            <AddIcon />
          </IconButton>
          <Box sx={{ height: "1px", backgroundColor: "#e0e0e0" }} />
          <IconButton onClick={handleZoomOut} size="small">
            <RemoveIcon />
          </IconButton>
        </Box>
      </Box>
    </div>
  );
};
