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
      height: "auto", // 高さを自動調整
    }).renderDot(dot);

    gviz.on("end", () => {
      console.log("グラフのレンダリングが完了しました");

      const svg = d3.select(graphRef.current).select("svg");
      setSvgElement(svg);

      // SVGのスタイル設定
      svg.style("background-color", "lightgray");
      svg.style("border", "2px solid black");
      svg.style("width", "100%");
      svg.style("height", "auto");

      // SVGを初期位置から表示
      // この時点では負の座標を持つかもしれないので、
      // viewBoxは後でズーム関数が適切に調整する

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

  // 初期化後のリセット処理はもう少し早く実行
  useEffect(() => {
    if (!graphInitialized || !svgGetBBox || !polygonGetBBox) return;

    console.log("グラフ初期化後の初期リセットを実行中");

    // 設定が完了したら即座にリセットを適用
    const timer = setTimeout(() => {
      handleReset();
    }, 50); // 100msから50msに短縮

    return () => clearTimeout(timer);
  }, [graphInitialized, svgGetBBox, polygonGetBBox, handleReset]);

  // 初期化後のリセット処理も高速化
  useEffect(() => {
    if (!graphInitialized || !svgGetBBox || !polygonGetBBox) return;

    console.log("グラフ初期化後の初期リセットを実行中");
    // リセットのタイミングを早める
    const timer = setTimeout(() => {
      handleReset();
    }, 100);

    return () => clearTimeout(timer);
  }, [graphInitialized, svgGetBBox, polygonGetBBox, handleReset]);

  // グラフが初期化され、バウンディングボックスが設定された後にリセットを処理
  useEffect(() => {
    if (!graphInitialized || !svgGetBBox || !polygonGetBBox) return;

    console.log("グラフ初期化後の初期リセットを実行中");
    // すべてが適切に設定されるように遅延を入れて初期リセットを適用
    const timer = setTimeout(() => {
      handleReset();
    }, 500);

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

      {/* グラフコンテナ */}
      <Box sx={{ position: "relative" }}>
        {/* メイングラフ */}
        <div ref={graphRef} style={{ width: "100%" }} />

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
