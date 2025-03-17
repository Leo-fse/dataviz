"use client";

import { useViewportCenter } from "./hooks/useViewportCenter";
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { graphviz } from "d3-graphviz";
import { Box } from "@mui/material";

// カスタムフックのインポート
import { useZoom } from "./hooks/useZoom";
import { useNodeBlinking } from "./hooks/useNodeBlinking";
import { usePanels } from "./hooks/usePanels";
import { useNodeSelection } from "./hooks/useNodeSelection";

// コンポーネントのインポート
import NodeSelector from "./components/NodeSelector";
import ZoomControls from "./components/ZoomControls";
import NodeDetailsPanel from "./components/NodeDetailsPanel";

/**
 * メインのグラフコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.dot - DOT形式のグラフ記述
 */
export const Graph = ({ dot }) => {
  const graphRef = useRef(null);
  const [svgGetBBox, setSvgGetBBox] = useState(null);
  const [polygonGetBBox, setPolygonGetBBox] = useState(null);
  const [graphInitialized, setGraphInitialized] = useState(false);
  const [svgElement, setSvgElement] = useState(null);

  const {
    containerRef,
    svgRef: viewportSvgRef,
    viewportCenter,
    svgCenter,
    calculateCenter,
    onZoomChange,
  } = useViewportCenter();

  // カスタムフックの初期化
  const { blinkNode } = useNodeBlinking();

  const {
    zoomRef,
    currentZoom,
    initializeZoom,
    handleReset,
    handleZoomIn,
    handleZoomOut,
    zoomToNode,
  } = useZoom({
    svgGetBBox,
    polygonGetBBox,
    onZoomChange, // これを追加
  });

  const {
    nodeDetailsPanels,
    createNewNodeDetailsPanel,
    handleClosePanel,
    handleToggleMinimize,
    handlePanelDragStart,
    handleResizeStart,
    resetPanels,
  } = usePanels();

  const {
    selectedNode,
    setSelectedNode,
    nodes,
    extractNodes,
    handleNodeClick,
    handleNodeSelect,
    attachNodeClickHandlers,
  } = useNodeSelection({
    zoomToNode,
    createNewNodeDetailsPanel,
    blinkNode,
  });

  // 完全リセット関数
  const handleFullReset = () => {
    console.log("完全リセットを実行中...");
    handleReset();
    resetPanels();
    setSelectedNode("");
  };

  // グラフを初期化してイベントハンドラを設定
  useEffect(() => {
    if (!graphRef.current || graphInitialized) return;
    console.log("DOTデータを使用してグラフを初期化中");
    // GraphvizをSVGに直接レンダリング
    const gviz = graphviz(graphRef.current, {
      useWorker: false,
      fit: true, // グラフをSVGにフィットさせる
      scale: 1.0, // 標準スケール
      width: "100%", // 幅を親要素に合わせる
      height: "100%", // 高さを親要素に合わせる
    }).renderDot(dot);

    gviz.on("end", () => {
      console.log("グラフのレンダリングが完了しました");

      const svg = d3.select(graphRef.current).select("svg");
      // SVGのスタイル設定
      svg.style("background-color", "lightgray");
      // svg.style("border", "1px dotted gray");

      setSvgElement(svg);

      // SVG要素をviewportSvgRefにも設定
      viewportSvgRef.current = svg.node();

      // グラフからノードを抽出
      const nodeNames = extractNodes(graphRef.current);
      console.log(`${nodeNames.length}個のノードが見つかりました`);

      // バウンディングボックスを取得
      const svgBox = svg.node().getBBox();
      console.log("SVG BBox:", svgBox);

      // Polygonを検出（グラフの境界を表す要素）
      const polygonElement = svg.select("polygon");

      if (polygonElement.empty()) {
        console.warn("ポリゴン要素が見つかりません");
        return;
      }

      const polygonBox = polygonElement.node().getBBox();
      console.log("Polygon BBox:", polygonBox);

      setSvgGetBBox(svgBox);
      setPolygonGetBBox(polygonBox);

      // ズーム動作の設定
      const zoomBehavior = initializeZoom(svg);

      // ノードにクリックハンドラーを追加
      attachNodeClickHandlers(graphRef.current);

      setGraphInitialized(true);

      // 初期中心点を計算
      calculateCenter();
    });
  }, [
    dot,
    extractNodes,
    attachNodeClickHandlers,
    initializeZoom,
    graphInitialized,
    calculateCenter,
  ]);

  // 初期化後のリセット処理 - ひとつにまとめる
  useEffect(() => {
    if (!graphInitialized || !svgGetBBox || !polygonGetBBox) return;

    console.log("グラフ初期化後の初期リセットを実行中");

    // 一度だけリセットを実行
    const timer = setTimeout(() => {
      handleReset();
    }, 100); // 十分短いが確実な時間

    return () => clearTimeout(timer);
  }, [graphInitialized, svgGetBBox, polygonGetBBox, handleReset]);

  return (
    <div>
      {/* ノード選択ドロップダウンとリセットボタン */}
      <NodeSelector
        selectedNode={selectedNode}
        nodes={nodes}
        onNodeSelect={handleNodeSelect}
        onReset={handleFullReset}
      />

      {/* グラフコンテナ - containerRefを追加 */}
      <Box
        ref={containerRef} // ここにcontainerRefを追加
        sx={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 200px)",
          minHeight: "380px",
          border: "1px solid #ccc",
          overflow: "auto",
        }}
      >
        {/* メイングラフ */}
        <div
          ref={graphRef}
          style={{
            minWidth: "100%",
            minHeight: "100%",
          }}
        />

        {/* ノード詳細パネル */}
        {nodeDetailsPanels.map((panel) => (
          <NodeDetailsPanel
            key={panel.id}
            panel={panel}
            onClose={handleClosePanel}
            onMinimize={handleToggleMinimize}
            onDragStart={handlePanelDragStart}
            onResizeStart={handleResizeStart}
          />
        ))}

        {/* オプション: デバッグ用にビューポートの中心点を表示 */}
        {process.env.NODE_ENV === "development" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "rgba(255,255,255,0.8)",
              padding: "4px",
              fontSize: "12px",
              zIndex: 1000,
            }}
          >
            中心点: x={viewportCenter.x.toFixed(0)}, y=
            {viewportCenter.y.toFixed(0)}
            <br />
            SVG中心: x={svgCenter.x.toFixed(0)}, y={svgCenter.y.toFixed(0)}
          </div>
        )}
      </Box>
      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
    </div>
  );
};
