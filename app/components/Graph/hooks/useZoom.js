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
export const useZoom = ({ svgGetBBox, polygonGetBBox, iniTransform }) => {
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

      // グラフを一度透明にする
      g.style("opacity", 0);

      // 負のY座標がある場合、それを補正
      const yOffset = polygonGetBBox.y < 0 ? Math.abs(polygonGetBBox.y) : 0;
      const xOffset = polygonGetBBox.x < 0 ? Math.abs(polygonGetBBox.x) : 0;

      console.log(
        `グラフ座標系の分析: {x: ${xOffset}, y: ${yOffset}, yNegative: ${
          polygonGetBBox.y < 0
        }}`
      );

      // 余白を追加
      const padding = ZOOM_SETTINGS.padding;
      const scale = 1.0;

      // 変換を計算 - 単純に余白とオフセットを適用
      const translateX = padding + xOffset;
      const translateY = padding + yOffset;

      console.log("ズームリセット: ", {
        translateX,
        translateY,
        scale,
        xOffset,
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
  }, [polygonGetBBox]);

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

        console.log("svgWidth:", svgWidth, "svgHeight:", svgHeight);

        const svgCenterX = svgGetBBox.x + svgGetBBox.width / 2;
        const svgCenterY = -svgGetBBox.y + svgGetBBox.height / 2;

        console.log("svgCenterX:", svgCenterX, "svgCenterY:", svgCenterY);
        console.log(svgGetBBox);

        // ノードの位置を取得
        const nodeBox = node.node().getBBox();
        const nodeCenterX = nodeBox.x + nodeBox.width / 2;
        const nodeCenterY = nodeBox.y + nodeBox.height / 2;
        console.log("nodeCenterX:", nodeCenterX, "nodeCenterY:", nodeCenterY);

        const zoomScale = ZOOM_SETTINGS.nodeZoomScale;
        const translateX = svgCenterX - nodeCenterX;
        const translateY = svgCenterY - nodeCenterY;

        // デバッグログ
        console.log(`ノード「${nodeId}」へのズーム:`, {
          translateX,
          translateY,
          zoomScale,
          nodeBox,
          nodeCenterX,
          nodeCenterY,
          // yOffset,
          // hasNegativeY,
          // currentTransform: currentTransform.toString(),
        });

        // 新しいtransformを作成して適用
        console.log("iniTransform", iniTransform);
        console.log(
          "d3.zoomTransform(svg.node())",
          d3.zoomTransform(svg.node())
        );

        const newTransform = d3.zoomIdentity
          .translate(
            iniTransform.x + (svgCenterX - nodeCenterX * zoomScale),
            iniTransform.y - (svgCenterY + nodeCenterY * zoomScale)
          )
          .scale(zoomScale);

        // 滑らかなトランジションでズーム適用
        svg
          .transition()
          .duration(750)
          .call(zoomRef.current.transform, newTransform);
      } catch (error) {
        console.error(`ノード「${nodeId}」へのズーム処理でエラー:`, error);
      }
    },
    [polygonGetBBox]
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
