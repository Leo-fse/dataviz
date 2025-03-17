import { useState, useCallback } from "react";
import * as d3 from "d3";

/**
 * ノード選択を処理するカスタムフック
 * @param {Object} options - 設定オプション
 * @param {Function} options.zoomToNode - ノードにズームする関数
 * @param {Function} options.createNewNodeDetailsPanel - 新しいパネルを作成する関数
 * @param {Function} options.blinkNode - ノードを点滅させる関数
 * @return {Object} ノード選択ユーティリティと状態
 */
export const useNodeSelection = ({
  zoomToNode,
  createNewNodeDetailsPanel,
  blinkNode,
}) => {
  const [selectedNode, setSelectedNode] = useState("");
  const [nodes, setNodes] = useState([]);

  // グラフからノードを抽出
  const extractNodes = useCallback((selector) => {
    const nodeNames = d3
      .select(selector)
      .selectAll("g.node")
      .nodes()
      .map((node) => d3.select(node).attr("id"))
      .filter((id) => id !== null);

    // アルファベット順にソート
    const uniqueNodeNames = [...new Set(nodeNames)].sort();
    console.log("抽出されたノード:", uniqueNodeNames);
    setNodes(uniqueNodeNames);

    return uniqueNodeNames;
  }, []);

  // ノードクリック時の処理
  const handleNodeClick = useCallback(
    (event, nodeId) => {
      event.stopPropagation();
      console.log("ノードがクリックされました:", nodeId);

      if (nodeId) {
        setSelectedNode(nodeId); // 選択ノードを更新
        createNewNodeDetailsPanel(nodeId);
        zoomToNode(nodeId);
        blinkNode(nodeId);
      }
    },
    [createNewNodeDetailsPanel, zoomToNode, blinkNode]
  );

  // ドロップダウンから選択
  const handleNodeSelect = useCallback(
    (nodeId) => {
      if (!nodeId) return;

      console.log("ドロップダウンからノードが選択されました:", nodeId);
      setSelectedNode(nodeId);

      // 少し遅延を入れて実行（レンダリングサイクルを確保）
      setTimeout(() => {
        createNewNodeDetailsPanel(nodeId);
        zoomToNode(nodeId);
        blinkNode(nodeId);
      }, 50);
    },
    [createNewNodeDetailsPanel, zoomToNode, blinkNode]
  );

  // ノードにクリックハンドラーを追加
  const attachNodeClickHandlers = useCallback(
    (selector) => {
      const nodes = d3.select(selector).selectAll("g.node");
      console.log(`${nodes.size()}個のノードにクリックハンドラーを追加中`);

      nodes.each(function () {
        const node = d3.select(this);
        const nodeId = node.attr("id");

        node.on("click", function (event) {
          console.log(`ノード「${nodeId}」のクリックイベントが発生`);
          handleNodeClick(event, nodeId);
        });
      });
    },
    [handleNodeClick]
  );

  return {
    selectedNode,
    setSelectedNode,
    nodes,
    extractNodes,
    handleNodeClick,
    handleNodeSelect,
    attachNodeClickHandlers,
  };
};
