"use client";

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
  } = useZoom({ svgGetBBox, polygonGetBBox });

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
      svg.style("border", "1px dotted gray");

      setSvgElement(svg);

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
    });
  }, [
    dot,
    extractNodes,
    attachNodeClickHandlers,
    initializeZoom,
    graphInitialized,
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

  // GraphMain.jsx の変更部分

  // グラフコンテナスタイルを更新
  return (
    <div>
      {/* ノード選択ドロップダウンとリセットボタン */}
      <NodeSelector
        selectedNode={selectedNode}
        nodes={nodes}
        onNodeSelect={handleNodeSelect}
        onReset={handleFullReset}
      />

      {/* グラフコンテナ - 高さと幅を固定し、オーバーフローをスクロールに設定 */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 150px)", // 上部のナビとセレクターのスペースを差し引いた高さ
          border: "1px solid #ccc",
          overflow: "auto", // スクロール可能に設定
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

        {/* ズームコントロール */}
        <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </Box>
    </div>
  );
};
