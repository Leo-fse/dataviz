import { Graph } from "../components/Graph";
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

export default function GraphvizPage() {
  return <Graph dot={dot} />;
}
