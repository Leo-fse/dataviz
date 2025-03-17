import { useState } from "react";

export const useNodeSelection = () => {
  const [selectedNode, setSelectedNode] = useState("");

  // ノードクリック時のハンドラー
  const handleNodeClick = (event, nodeId) => {
    event.stopPropagation();
    console.log("Node clicked:", nodeId);
    if (nodeId) {
      setSelectedNode(nodeId);
      // 注: この関数は外部から提供される関数を呼び出す必要がある
      // createNewNodeDetailsPanel(nodeId) と zoomToNode(nodeId) は
      // 親コンポーネントから渡される
    }
  };

  return {
    selectedNode,
    setSelectedNode,
    handleNodeClick,
  };
};
