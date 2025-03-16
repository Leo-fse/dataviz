"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Typography } from "@mui/material";

export const MultiLinePlot = ({ series }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: 600,
    height: 300,
    fontSize: 14,
  });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        // 画面幅に応じてフォントサイズを計算
        const baseFontSize = Math.max(12, Math.min(16, width / 40));

        setDimensions({
          width: width,
          height: window.innerHeight * 0.5,
          fontSize: baseFontSize,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    // 初回マウント時とリサイズ時に実行
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (
      !svgRef.current ||
      !tooltipRef.current ||
      !containerRef.current ||
      !series ||
      series.length === 0
    )
      return;

    const { width, height, fontSize } = dimensions;
    // マージンを調整：Y軸ラベルのスペースを増やし、X軸ラベルとX軸目盛数値の間隔を広げる
    const margin = {
      top: Math.max(20, fontSize * 1.5),
      right: Math.max(80, fontSize * 6), // 凡例のために右マージンを拡大
      bottom: Math.max(70, fontSize * 5), // X軸ラベルと目盛りの間隔を広げるため
      left: Math.max(80, fontSize * 5), // Y軸ラベルが見切れないよう左マージンを拡大
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // 再描画時にリセット

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style("opacity", 0); // 初期状態は非表示

    // すべてのデータを集約して日付の範囲を決定
    const allDates = series.flatMap((s) => s.data.map((d) => new Date(d.date)));
    const dateExtent = d3.extent(allDates);

    // すべてのデータを集約して値の範囲を決定
    const allValues = series.flatMap((s) => s.data.map((d) => d.value));
    const maxValue = d3.max(allValues) || 0;

    const xScale = d3
      .scaleTime()
      .domain(dateExtent)
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1]) // 最大値より少し余裕を持たせる
      .nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line()
      .x((d) => xScale(new Date(d.date)))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // X 軸
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%Y-%m-%d"))
      )
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .attr("dy", "1.5em") // X軸の目盛数値をさらに下に移動
      .style("text-anchor", "end")
      .style("font-size", `${fontSize}px`); // フォントサイズを設定

    // X軸ラベル
    svg
      .append("text")
      .attr(
        "transform",
        `translate(${width / 2}, ${height - margin.bottom / 6})`
      )
      .style("text-anchor", "middle")
      .style("font-size", `${fontSize * 1.2}px`)
      .text("日付");

    // Y 軸
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", `${fontSize}px`); // フォントサイズを設定

    // Y軸ラベル
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", margin.left / 3)
      .attr("x", -(height / 2))
      .style("text-anchor", "middle")
      .style("font-size", `${fontSize * 1.2}px`)
      .text("値");

    // 凡例を作成 - 位置を調整
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${width - margin.right + fontSize * 0.8}, ${margin.top})`
      ); // 凡例の位置を右に移動

    series.forEach((s, i) => {
      // 系列ごとに色を設定（指定されていない場合はD3のデフォルトカラースケールを使用）
      const color = s.color || d3.schemeCategory10[i % 10];

      // 折れ線を描画
      svg
        .append("path")
        .datum(s.data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", Math.max(2, fontSize / 6)) // 線の太さも調整
        .attr("d", line)
        .attr("class", `line-${s.id}`);

      // データポイントを描画
      svg
        .selectAll(`.data-point-${s.id}`)
        .data(s.data)
        .enter()
        .append("circle")
        .attr("class", `data-point-${s.id}`)
        .attr("cx", (d) => xScale(new Date(d.date)))
        .attr("cy", (d) => yScale(d.value))
        .attr("r", Math.max(3, fontSize / 4)) // ポイントのサイズも調整
        .attr("fill", color);

      // 凡例に項目を追加
      const legendItem = legend
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", `translate(0, ${i * fontSize * 1.5})`);

      legendItem
        .append("rect")
        .attr("width", fontSize)
        .attr("height", fontSize)
        .attr("fill", color);

      legendItem
        .append("text")
        .attr("x", fontSize * 1.5)
        .attr("y", fontSize * 0.8)
        .text(s.name || s.id)
        .style("font-size", `${fontSize}px`);
    });

    // ガイドライン（ホバー時の縦線）- 垂直線
    const verticalLine = svg
      .append("line")
      .attr("class", "guide-line vertical")
      .attr("stroke", "gray")
      .attr("stroke-dasharray", "4")
      .attr("stroke-width", Math.max(1, fontSize / 12)) // 線の太さを調整
      .attr("opacity", 0)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom);

    // ホバー円を各系列に対して作成
    const hoverCircles = {};
    series.forEach((s) => {
      const color = s.color || d3.schemeCategory10[series.indexOf(s) % 10];

      hoverCircles[s.id] = svg
        .append("circle")
        .attr("class", `hover-circle-${s.id}`)
        .attr("r", Math.max(6, fontSize / 2)) // ホバー円のサイズを調整
        .attr("fill", color)
        .attr("opacity", 0);
    });

    // 日付で近いデータポイントを取得するための関数 - 改善版
    const findClosestPoints = (date) => {
      const points = {};
      const actualDates = {}; // 各系列の実際の日付を保存

      series.forEach((s) => {
        // 日付が最も近いポイントを見つける
        let closest = null;
        let minDistance = Infinity;
        let closestDate = null;

        s.data.forEach((d) => {
          const pointDate = new Date(d.date);
          const distance = Math.abs(pointDate - date);
          if (distance < minDistance) {
            minDistance = distance;
            closest = d;
            closestDate = pointDate;
          }
        });

        if (closest) {
          points[s.id] = {
            ...closest,
            seriesId: s.id,
            seriesName: s.name || s.id,
            color: s.color || d3.schemeCategory10[series.indexOf(s) % 10],
            distance: minDistance, // 日付との距離を保存
          };
          actualDates[s.id] = closestDate;
        }
      });

      return { points, actualDates };
    };

    // マウスイベント用の透明なレイヤー
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", function (event) {
        // SVG内の相対座標を取得
        const svgBounds = svgRef.current.getBoundingClientRect();
        const containerBounds = containerRef.current.getBoundingClientRect();

        // イベントの位置からSVG内の相対座標を計算
        const mouseX = event.clientX - containerBounds.left;
        const scaleFactor = width / svgBounds.width;
        const adjustedMouseX = mouseX * scaleFactor;

        const date = xScale.invert(adjustedMouseX);

        // 該当する日付に最も近いすべての系列のデータポイントを取得
        const { points, actualDates } = findClosestPoints(date);

        // データポイントの日付との距離が閾値以内のもののみを表示
        // 例：7日以上離れている場合は表示しない
        const maxDistanceMs = 7 * 24 * 60 * 60 * 1000; // 7日をミリ秒で
        const filteredPoints = {};
        Object.entries(points).forEach(([id, point]) => {
          if (point.distance <= maxDistanceMs) {
            filteredPoints[id] = point;
          }
        });

        // 表示するポイントがなければ終了
        if (Object.keys(filteredPoints).length === 0) {
          verticalLine.attr("opacity", 0);
          Object.values(hoverCircles).forEach((circle) =>
            circle.attr("opacity", 0)
          );
          tooltip.style("opacity", 0);
          return;
        }

        // マウス位置の垂直線
        const xPos = adjustedMouseX;
        verticalLine.attr("x1", xPos).attr("x2", xPos).attr("opacity", 1);

        // 各系列のホバー円を更新
        Object.entries(points).forEach(([id, point]) => {
          const pointDate = new Date(point.date);
          const yPos = yScale(point.value);
          const xPos = xScale(pointDate);

          // 距離に基づいて透明度を調整
          const opacity = point.distance <= maxDistanceMs ? 1 : 0;

          hoverCircles[id]
            .attr("cx", xPos)
            .attr("cy", yPos)
            .attr("opacity", opacity);
        });

        // ツールチップ内容を作成
        let tooltipContent = `<div style="font-weight: bold; font-size: ${fontSize}px;">日付: ${date.toLocaleDateString()}</div>`;
        tooltipContent += `<table style="border-collapse: collapse; width: 100%; font-size: ${fontSize}px;">`;

        // 値が大きい順にソート
        const sortedPoints = Object.values(filteredPoints).sort(
          (a, b) => b.value - a.value
        );

        sortedPoints.forEach((point) => {
          const pointDate = new Date(point.date);
          const diffDays = Math.round(point.distance / (24 * 60 * 60 * 1000));
          const dateInfo =
            diffDays === 0
              ? pointDate.toLocaleDateString()
              : `${pointDate.toLocaleDateString()} (${
                  diffDays > 0 ? "+" : ""
                }${diffDays}日)`;

          tooltipContent += `
            <tr>
              <td>
                <span style="color: ${point.color}; font-size: ${
            fontSize * 1.2
          }px;">●</span>
                ${point.seriesName}:
              </td>
              <td style="text-align: right; padding-left: 10px;">
                ${point.value}
              </td>
              <td style="text-align: right; padding-left: 10px; color: ${
                diffDays === 0 ? "white" : "#aaa"
              };">
                ${dateInfo}
              </td>
            </tr>
          `;
        });

        tooltipContent += "</table>";

        // ツールチップの位置計算
        const svgXScale = svgBounds.width / width;
        const pageX = svgBounds.left + xPos * svgXScale;

        // ツールチップの位置調整（垂直位置は上部固定）
        let tooltipX = pageX + 10 - containerBounds.left;
        let tooltipY = margin.top - containerBounds.top;

        // 画面の右端ならツールチップを左側に配置
        if (pageX + fontSize * 15 > window.innerWidth) {
          tooltipX = pageX - fontSize * 16 - containerBounds.left;
        }

        tooltip
          .style("opacity", 1)
          .html(tooltipContent)
          .style("left", `${tooltipX}px`)
          .style("top", `${tooltipY}px`);
      })
      .on("mouseout", function () {
        // マウスが離れたら全てのガイドラインとホバー円を非表示
        verticalLine.attr("opacity", 0);

        Object.values(hoverCircles).forEach((circle) => {
          circle.attr("opacity", 0);
        });

        tooltip.style("opacity", 0);
      });
  }, [dimensions, series]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      />
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: `${dimensions.fontSize / 2}px`,
          borderRadius: "5px",
          pointerEvents: "none",
          opacity: 0,
          fontSize: `${dimensions.fontSize}px`,
          width: "auto",
          minWidth: `${dimensions.fontSize * 10}px`,
          whiteSpace: "nowrap",
          zIndex: 100,
        }}
      />
    </div>
  );
};
