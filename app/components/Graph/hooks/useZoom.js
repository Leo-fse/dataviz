import { useRef, useState, useCallback, useEffect } from "react";
import * as d3 from "d3";
import { ZOOM_SETTINGS } from "../constant";

/**
 * ズーム機能を処理するカスタムフック
 * @param {Object} options - 設定オプション
 * @param {Object} options.svgGetBBox - SVGバウンディングボックス
 * @param {Object} options.polygonGetBBox - グラフポリゴンバウンディングボックス
 * @return {Object} ズームユーティリティと状態
 */
export const useZoom = ({ svgGetBBox, polygonGetBBox }) => {
  const zoomRef = useRef(null);
  const svgRef = useRef(null);
  const initializedRef = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  // ズームの初期化
  const initializeZoom = useCallback((svg) => {
    console.log("ズーム機能の初期化開始");

    // SVG参照を保存
    svgRef.current = svg;

    const zoom = d3.zoom().on("zoom", (event) => {
      svg.select("g").attr("transform", event.transform);
      setCurrentZoom(event.transform.k);
    });

    // 初期変換を設定（予期しない動作を避けるためにidentity）
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.call(zoom);
    zoomRef.current = zoom;
    initializedRef.current = true;

    console.log("ズーム機能の初期化完了");
    return zoom;
  }, []);

  // 継続的なズーム変更を防ぐために初期化状態を追跡
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  // デフォルトビューにリセット - 負のY座標を考慮して調整
  const handleReset = useCallback(() => {
    if (
      !svgGetBBox ||
      !polygonGetBBox ||
      !zoomRef.current ||
      !initializedRef.current ||
      !svgRef.current
    ) {
      console.warn("リセット処理：必要な参照がまだ設定されていません");
      return;
    }

    try {
      const svg = svgRef.current;
      const g = svg.select("g");

      // グラフを一度透明にする
      g.style("opacity", 0);

      console.log("グラフの実際のBBox:", polygonGetBBox);
      console.log("SVGコンテナサイズ:", {
        width: svg.node().clientWidth,
        height: svg.node().clientHeight,
      });

      // 重要: Polygonの負のY値を考慮した調整
      // Y値が負の場合は、その分だけ下に移動させる必要がある
      const yOffset = polygonGetBBox.y < 0 ? Math.abs(polygonGetBBox.y) : 0;

      // 余白を追加
      const padding = ZOOM_SETTINGS.padding;
      const scale = 1.0;

      // X座標の調整（左端から少し余白を持たせる）
      const translateX =
        padding + (polygonGetBBox.x < 0 ? Math.abs(polygonGetBBox.x) : 0);

      // Y座標の調整（上端から適切な位置に配置）
      // yOffsetを考慮して、負の値分だけ下方向に移動
      const translateY = padding + yOffset;

      console.log("ズームリセット: ", {
        translateX,
        translateY,
        scale,
        yOffset,
      });

      // 変換を適用
      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);

      svg.call(zoomRef.current.transform, transform);

      // フェードインアニメーション
      g.transition().duration(1000).style("opacity", 1);
    } catch (error) {
      console.error("handleResetでエラー:", error);
    }
  }, [svgGetBBox, polygonGetBBox]);

  // ズームイン機能
  const handleZoomIn = useCallback(() => {
    if (!zoomRef.current || !initializedRef.current || !svgRef.current) {
      console.warn("ズームイン処理：必要な参照がまだ設定されていません");
      return;
    }

    try {
      const svg = svgRef.current;
      const width = svg.node().clientWidth;
      const height = svg.node().clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      zoomRef.current.scaleBy(
        svg.transition().duration(ZOOM_SETTINGS.animationDuration),
        ZOOM_SETTINGS.zoomInFactor,
        [centerX, centerY]
      );
    } catch (error) {
      console.error("handleZoomInでエラー:", error);
    }
  }, []);

  // ズームアウト機能
  const handleZoomOut = useCallback(() => {
    if (!zoomRef.current || !initializedRef.current || !svgRef.current) {
      console.warn("ズームアウト処理：必要な参照がまだ設定されていません");
      return;
    }

    try {
      const svg = svgRef.current;
      const width = svg.node().clientWidth;
      const height = svg.node().clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      zoomRef.current.scaleBy(
        svg.transition().duration(ZOOM_SETTINGS.animationDuration),
        ZOOM_SETTINGS.zoomOutFactor,
        [centerX, centerY]
      );
    } catch (error) {
      console.error("handleZoomOutでエラー:", error);
    }
  }, []);

  // 特定のノードにズーム
  const zoomToNode = useCallback((nodeId) => {
    if (!zoomRef.current || !initializedRef.current || !svgRef.current) {
      console.warn(
        `ノード「${nodeId}」へのズーム処理：必要な参照がまだ設定されていません`
      );
      return;
    }

    try {
      const svg = svgRef.current;
      const g = svg.select("g");
      const node = g.select(`#${nodeId}`);

      if (node.empty()) {
        console.warn(`ノード「${nodeId}」が見つかりません`);
        return;
      }

      // SVGコンテナのサイズを取得
      const svgWidth = svg.node().clientWidth || svg.attr("width");
      const svgHeight = svg.node().clientHeight || svg.attr("height");

      // ノードの位置を取得
      const nodeBox = node.node().getBBox();
      const nodeCenterX = nodeBox.x + nodeBox.width / 2;
      const nodeCenterY = nodeBox.y + nodeBox.height / 2;

      // ノードフォーカス用のスケール
      const zoomScale = ZOOM_SETTINGS.nodeZoomScale;

      // ノードを中心に配置するための変換を計算
      const translateX = svgWidth / 2 - nodeCenterX * zoomScale;
      const translateY = svgHeight / 2 - nodeCenterY * zoomScale;

      // デバッグ用にログ出力
      console.log(`ノード「${nodeId}」へのズーム:`, {
        translateX,
        translateY,
        zoomScale,
        nodeBox,
        svgWidth,
        svgHeight,
      });

      // ズーム変換を適用
      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(zoomScale);

      svg.transition().duration(750).call(zoomRef.current.transform, transform);
    } catch (error) {
      console.error(`ノード「${nodeId}」へのズーム処理でエラー:`, error);
    }
  }, []);

  return {
    zoomRef,
    currentZoom,
    initializeZoom,
    handleReset,
    handleZoomIn,
    handleZoomOut,
    zoomToNode,
  };
};
