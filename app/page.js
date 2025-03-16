"use client";

import { Box } from "@mui/material";
import Link from "next/link";

export default function Home() {
  return (
    <ol>
      <Link href={"/"}>
        <li>home</li>
      </Link>
      <Link href={"/graphviz"}>
        <li>graphviz</li>
      </Link>
      <Link href={"/d3js"}>
        <li>D3.js</li>
      </Link>
    </ol>
  );
}
