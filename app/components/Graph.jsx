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
} from "@mui/material";
import Paper from "@mui/material/Paper";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

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

        // 🔥 状態が更新された後にリセットを適用する
        setTimeout(handleReset, 300);
      });
    }
  }, []);

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
  };

  // 拡大ボタンのハンドラー
  const handleZoomIn = () => {
    if (!zoomRef.current) return;

    const svg = d3.select(ref.current).select("svg");
    const newZoom = currentZoom * 1.3; // 30%拡大

    svg
      .transition()
      .duration(300)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(
            d3.zoomTransform(svg.node()).x,
            d3.zoomTransform(svg.node()).y
          )
          .scale(newZoom)
      );
  };

  // 縮小ボタンのハンドラー
  const handleZoomOut = () => {
    if (!zoomRef.current) return;

    const svg = d3.select(ref.current).select("svg");
    const newZoom = currentZoom * 0.7; // 30%縮小

    svg
      .transition()
      .duration(300)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(
            d3.zoomTransform(svg.node()).x,
            d3.zoomTransform(svg.node()).y
          )
          .scale(newZoom)
      );
  };

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
