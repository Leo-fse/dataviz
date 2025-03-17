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

  // デフォルトビューにリセット - フェードインアニメーション
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
      const graphCenterX = polygonGetBBox.x - svgGetBBox.x;
      const graphCenterY = polygonGetBBox.y - svgGetBBox.y;

      console.log("ズームリセット (フェードイン): ", {
        graphCenterX,
        graphCenterY,
      });

      // グラフを一度透明にする
      g.style("opacity", 0);

      // 位置を設定
      const transform = d3.zoomIdentity
        .translate(-graphCenterX, -graphCenterY)
        .scale(1);

      svg.call(zoomRef.current.transform, transform);

      // フェードインアニメーション
      g.transition().duration(1000).style("opacity", 1);
    } catch (error) {
      console.error("handleResetでエラー:", error);
    }
  }, [svgGetBBox, polygonGetBBox]);

  // ズームイン機能
  const handleZoomIn = useCallback(() => {
    if (
      !zoomRef.current ||
      !svgGetBBox ||
      !initializedRef.current ||
      !svgRef.current
    ) {
      console.warn("ズームイン処理：必要な参照がまだ設定されていません");
      return;
    }

    try {
      const svg = svgRef.current;
      const centerX = svgGetBBox.width / 2;
      const centerY = svgGetBBox.height / 2;

      zoomRef.current.scaleBy(
        svg.transition().duration(ZOOM_SETTINGS.animationDuration),
        ZOOM_SETTINGS.zoomInFactor,
        [centerX, centerY]
      );
    } catch (error) {
      console.error("handleZoomInでエラー:", error);
    }
  }, [svgGetBBox]);

  // ズームアウト機能
  const handleZoomOut = useCallback(() => {
    if (
      !zoomRef.current ||
      !svgGetBBox ||
      !initializedRef.current ||
      !svgRef.current
    ) {
      console.warn("ズームアウト処理：必要な参照がまだ設定されていません");
      return;
    }

    try {
      const svg = svgRef.current;
      const centerX = svgGetBBox.width / 2;
      const centerY = svgGetBBox.height / 2;

      zoomRef.current.scaleBy(
        svg.transition().duration(ZOOM_SETTINGS.animationDuration),
        ZOOM_SETTINGS.zoomOutFactor,
        [centerX, centerY]
      );
    } catch (error) {
      console.error("handleZoomOutでエラー:", error);
    }
  }, [svgGetBBox]);

  // 特定のノードにズーム
  const zoomToNode = useCallback(
    (nodeId) => {
      if (
        !svgGetBBox ||
        !zoomRef.current ||
        !initializedRef.current ||
        !svgRef.current
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

        // ノードの位置を取得
        const nodeBox = node.node().getBBox();
        const nodeCenterX = nodeBox.x + nodeBox.width / 2;
        const nodeCenterY = nodeBox.y + nodeBox.height / 2;

        // ノードフォーカス用のスケール
        const zoomScale = ZOOM_SETTINGS.nodeZoomScale;

        // ノードを中心に配置するための変換を計算
        const translateX = svgGetBBox.width / 2 - nodeCenterX * zoomScale;
        const translateY = svgGetBBox.height / 2 - nodeCenterY * zoomScale;

        // デバッグ用にログ出力
        console.log(`ノード「${nodeId}」へのズーム:`, {
          translateX,
          translateY,
          zoomScale,
          nodeBox,
        });

        // ズーム変換を適用
        const transform = d3.zoomIdentity
          .translate(translateX, translateY)
          .scale(zoomScale);

        svg
          .transition()
          .duration(750)
          .call(zoomRef.current.transform, transform);
      } catch (error) {
        console.error(`ノード「${nodeId}」へのズーム処理でエラー:`, error);
      }
    },
    [svgGetBBox]
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
