import { useState } from "react";
import * as d3 from "d3";
import { graphviz } from "d3-graphviz";

export const useCreateGraph = (graphRef, dot) => {
  const [nodes, setNodes] = useState([]);
  const [svgGetBBox, setSvgGetBBox] = useState(null);
  const [polygonGetBBox, setPolygonGetBBox] = useState(null);

  const initializeGraph = () => {
    console.log("Initializing graph component");
    if (graphRef.current) {
      const gviz = graphviz(graphRef.current, {
        useWorker: false,
      }).renderDot(dot);

      gviz.on("end", () => {
        const svg = d3.select(graphRef.current).select("svg");
        svg.style("background-color", "lightgray");
        svg.style("border", "2px solid black");
        svg.style("width", "100%");

        // SVGのサイズを取得
        const svgBox = svg.node().getBBox();
        const polygonBox = polygonElement ? polygonElement.getBBox() : null;
        console.log("svgGetBBox", svgBox);
        console.log("polygonGetBBox", polygonBox);
        setSvgGetBBox(svgBox);
        setPolygonGetBBox(polygonBox);

        // ノード一覧を取得
        const nodeNames = d3
          .select(graphRef.current)
          .selectAll("g.node")
          .nodes()
          .map((node) => d3.select(node).attr("id"))
          .filter((id) => id !== null);

        // アルファベット順にソート
        const uniqueNodeNames = [...new Set(nodeNames)].sort();
        setNodes(uniqueNodeNames);
      });
    }
  };

  return {
    nodes,
    svgGetBBox,
    polygonGetBBox,
    initializeGraph,
  };
};
