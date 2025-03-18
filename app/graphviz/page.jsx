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
  AA [id="AA", fillcolor="#7bca80", style="filled"];
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
  AN [id="AN"];
  AO [id="AO"];
  AP [id="AP"];
  AQ [id="AQ"];
  AR [id="AR"];
  AS [id="AS"];
  AT [id="AT"];
  A -> B;
  B -> C;
  C -> E
  C -> D;
  D -> E;
  E -> F;
  F -> G;
  G -> H;
  H -> I;
  I -> J;
  J -> K;
  AJ -> AI;
  AH -> AG;
  AG -> AF;
  AF -> AE;
  AE -> AD;
  B -> S;
  AA -> B
  S -> R;
  R -> Q;
  AK -> A;
  Q -> P;
  Q -> E;
  A -> AM;
  AM -> AL;
  AL -> AK;
  AK -> AJ;
  AJ -> AI;
  AI -> AH;
  AH -> AG;
  AG -> AF;
  AF -> AE;
  AE -> AD;
  AD -> AC;
  AC -> AB;
  AB -> AA;
  AA -> A;
  A -> AN;
  AN -> AO;
  AO -> AP;
  AP -> AQ;
  AQ -> AR;
  AR -> AS;
}`;

export default function GraphvizPage() {
  return <Graph dot={dot} />;
}
