"use client";
import { Graph } from "../components/Graph";
import { Box } from "@mui/material";

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
  J [id="J"];
  K [id="K"];
  L [id="L"];
  N [id="N"];
  O [id="O"];
  P [id="P"];
  Q [id="Q"];
  R [id="R"];
  S [id="S"];
  T [id="T"];
  U [id="U"];
  V [id="V"];
  W [id="W"];
  X [id="X"];
  Y [id="Y"];
  Z [id="Z"];
  AA [id="AA"];
  AB [id="AB"];
  AC [id="AC"];
  AD [id="AD"];
  AE [id="AE"];
  AF [id="AF"];
  AG [id="AG"];
  AH [id="AH"];
  AI [id="AI"];
  AJ [id="AJ"];
  AK [id="AK"];
  AL [id="AL"];
  AM [id="AM"];
  A -> B;
  B -> C;
  C -> D;
  D -> E;
  E -> F;
  F -> G;
  G -> H;
  H -> I;
  I -> J;
  J -> K;
  B -> S;
  S -> R;
  R -> Q;
  Q -> P;
}`;

export default function GraphvizPage() {
  return (
    <Box sx={{ height: "calc(100vh - 100px)" }}>
      <Graph dot={dot} />
    </Box>
  );
}
