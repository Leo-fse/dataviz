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
export const useZoom = ({ svgGetBBox, polygonGetBBox, onZoomChange }) => {
  const zoomRef = useRef(null);
  const svgRef = useRef(null);
  const initializedRef = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  // ズームの初期化
  const initializeZoom = useCallback(
    (svg) => {
      console.log("ズーム機能の初期化開始");

      // SVG参照を保存
      svgRef.current = svg;

      const zoom = d3.zoom().on("zoom", (event) => {
        svg.select("g").attr("transform", event.transform);
        setCurrentZoom(event.transform.k);

        // ズーム変更時に onZoomChange を呼び出す
        if (typeof onZoomChange === "function") {
          onZoomChange(event.transform);
        }
      });

      // 初期変換を設定（予期しない動作を避けるためにidentity）
      svg.call(zoom.transform, d3.zoomIdentity);
      svg.call(zoom);
      zoomRef.current = zoom;
      initializedRef.current = true;

      console.log("ズーム機能の初期化完了");
      return zoom;
    },
    [onZoomChange]
  );

  // 継続的なズーム変更を防ぐために初期化状態を追跡
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  // デフォルトビューにリセット - グラフ全体を表示
  const handleReset = useCallback(() => {
    if (
      !zoomRef.current ||
      !initializedRef.current ||
      !svgRef.current ||
      !polygonGetBBox
    ) {
      console.warn("リセット処理：必要な参照がまだ設定されていません");
      return;
    }

    try {
      const svg = svgRef.current;
      const g = svg.select("g");

      g.style("opacity", 0);

      const yOffset = polygonGetBBox.y < 0 ? Math.abs(polygonGetBBox.y) : 0;
      const xOffset = polygonGetBBox.x < 0 ? Math.abs(polygonGetBBox.x) : 0;

      const padding = ZOOM_SETTINGS.padding;
      const scale = 1.0;

      const translateX = padding + xOffset;
      const translateY = padding + yOffset;

      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);

      svg.call(zoomRef.current.transform, transform);

      // 変換後に onZoomChange を呼び出す
      if (typeof onZoomChange === "function") {
        onZoomChange(transform);
      }

      g.transition().duration(1000).style("opacity", 1);
    } catch (error) {
      console.error("handleResetでエラー:", error);
    }
  }, [polygonGetBBox, onZoomChange]); // 依存関係に onZoomChange を追加

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

  // 特定のノードにズーム - 完全に書き直し
  const zoomToNode = useCallback(
    (nodeId) => {
      if (
        !zoomRef.current ||
        !initializedRef.current ||
        !svgRef.current ||
        !polygonGetBBox
      ) {
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
        const svgWidth = svg.node().clientWidth;
        const svgHeight = svg.node().clientHeight;

        // ノードの位置を取得
        const nodeBox = node.node().getBBox();
        const nodeCenterX = nodeBox.x + nodeBox.width / 2;
        const nodeCenterY = nodeBox.y + nodeBox.height / 2;

        // グラフの座標系補正（負のY座標の処理）
        const yOffset = polygonGetBBox.y < 0 ? Math.abs(polygonGetBBox.y) : 0;
        const hasNegativeY = polygonGetBBox.y < 0;

        // ノードフォーカス用のスケール
        const zoomScale = ZOOM_SETTINGS.nodeZoomScale;

        // トランスフォーム計算の大幅な修正
        // このzoom関数は既にD3に設定された現在のトランスフォームを考慮します
        const currentTransform = d3.zoomTransform(svg.node());

        // 必要な新しい中心座標を計算
        let targetX = nodeCenterX;
        let targetY = nodeCenterY;

        // 負のY座標がある場合の補正
        if (hasNegativeY) {
          targetY = nodeCenterY - yOffset;
        }

        // 中心に配置するためのtranslateを計算
        const translateX = svgWidth / 2 - targetX * zoomScale;
        const translateY = svgHeight / 2 - targetY * zoomScale;

        // デバッグログ
        console.log(`ノード「${nodeId}」へのズーム:`, {
          translateX,
          translateY,
          zoomScale,
          nodeBox,
          nodeCenterX,
          nodeCenterY,
          yOffset,
          hasNegativeY,
          currentTransform: currentTransform.toString(),
        });

        // 新しいtransformを作成して適用
        const newTransform = d3.zoomIdentity
          .translate(translateX, translateY)
          .scale(zoomScale);

        // 滑らかなトランジションでズーム適用
        svg
          .transition()
          .duration(750)
          .call(zoomRef.current.transform, newTransform);

        // 変換後に onZoomChange を呼び出す
        if (typeof onZoomChange === "function") {
          onZoomChange(newTransform);
        }
      } catch (error) {
        console.error(`ノード「${nodeId}」へのズーム処理でエラー:`, error);
      }
    },
    [polygonGetBBox, onZoomChange]
  );

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
