import { Graph } from "../components/Graph";

// DOTグラフの定義を修正 - rankdir="LR"を追加して横向きに
const dot = `digraph {
  // 左から右へ描画するための設定
  rankdir="LR";
  
  A [id="A"];
  B [id="B"];
  C [id="C"];
  D [id="D"];
  E [id="E"];
  F [id="F"];
  G [id="G"];
  H [id="H"];
  I [id="I"];
  N [id="N"];
  M [id="M"];
  A -> B;
  A -> C;
  B -> D;
  D -> G;
  C -> E;
  D -> F;
  C -> H;
  H -> I;
  I -> N;
  N -> A;
  A -> M;
  M -> I;
  
}`;
export default function GraphvizPage() {
  return <Graph dot={dot} />;
}
