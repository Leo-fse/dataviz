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
} from "@mui/material";
const dot = `digraph {
          A [id="A"];
          B [id="B"];
          C [id="C"];
          D [id="D"];
          E [id="E"];
          F [id="F"];
          G [id="G"];
          A -> B;
          A -> C;
          B -> D;
          C -> E;
          D -> F;
          E -> G;
        }`;

export const Graph = () => {
  const ref = useRef(null);
  const [selectedNode, setSelectedNode] = useState(""); // 選択されたノード
  const [nodes, setNodes] = useState([]); // ノード一覧
  const [displayCenter, setDisplayCenter] = useState({ x: 0, y: 0 }); // 中心座標
  const zoomRef = useRef(null); // D3ズームインスタンス

  useEffect(() => {
    if (ref.current) {
      const gviz = graphviz(ref.current, {
        useWorker: false,
      }).renderDot(dot);

      gviz.on("end", () => {
        // 背景色とボーダーを適用
        const svg = d3.select(ref.current).select("svg");
        svg.style("background-color", "lightgray");
        svg.style("border", "2px solid black");
        svg.style("width", "500");
        svg.style("height", "500px");

        // 描画完了時に実行
        const nodeNames = d3
          .select(ref.current)
          .selectAll("g.node")
          .nodes()
          .map((node) => d3.select(node).attr("id")) // ← `id` を取得
          .filter((id) => id !== null); // `null` を除外
        setNodes([...new Set(nodeNames)]); // 重複削除してセット

        // SVGのサイズを取得
        const svgGetBBox = svg.node().getBBox();
        console.log("svgGetBBox", svgGetBBox);
        setDisplayCenter({
          x: svgGetBBox.width / 2,
          y: -svgGetBBox.height / 2,
        });

        // ズーム設定
        const zoom = d3.zoom().on("zoom", (event) => {
          svg.select("g").attr("transform", event.transform);
        });
        svg.call(zoom);
        zoomRef.current = zoom;
      });
    }
  }, []);

  const zoomToNode = (nodeId) => {
    const svg = d3.select(ref.current).select("svg");
    const g = svg.select("g");

    const node = g.select(`#${nodeId}`);
    if (node.empty()) return;
    // ノードの位置を取得
    const nodeBox = node.node().getBBox();

    const nodeCenterX = nodeBox.x + nodeBox.width / 2;
    const nodeCenterY = nodeBox.y + nodeBox.height / 2;

    // ズーム倍率（ノードを大きく表示するためのスケール）
    const zoomScale = 2.0; // 拡大倍率を調整

    // ノードを中心に持ってくるための移動量
    const translateX = displayCenter.x - nodeCenterX * zoomScale;
    const translateY = -displayCenter.y - nodeCenterY * zoomScale;

    // ズーム変換を適用
    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(zoomScale);

    svg.transition().duration(750).call(zoomRef.current.transform, transform);
  };

  return (
    <div>
      <h1>Graph</h1>
      <FormControl style={{ minWidth: 200, marginBottom: 10 }}>
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

      <div ref={ref} style={{ width: "500px", height: "500px" }} />
    </div>
  );
};
