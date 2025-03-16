import { Typography } from "@mui/material";
import { LinePlot, MultiLinePlot } from "../components/LinePlot";

const seriesData = [
  {
    id: "series1",
    name: "売上高",
    color: "#1f77b4",
    data: [
      { date: "2023-01-01", value: 100 },
      { date: "2023-02-01", value: 120 },
      { date: "2023-03-01", value: 140 },
      { date: "2023-04-01", value: 160 },
      { date: "2023-05-01", value: 180 },
      { date: "2023-06-01", value: 200 },
    ],
  },
  {
    id: "series2",
    name: "コスト",
    color: "#ff7f0e",
    data: [
      { date: "2022-10-01", value: 80 },
      { date: "2023-02-01", value: 85 },
      { date: "2023-03-01", value: 90 },
      { date: "2023-04-01", value: 95 },
      { date: "2023-05-01", value: 100 },
      { date: "2023-06-01", value: 105 },
    ],
  },
  {
    id: "series3",
    name: "利益",
    color: "#2ca02c",
    data: [
      { date: "2023-01-01", value: 20 },
      { date: "2023-02-01", value: 35 },
      { date: "2023-03-01", value: 50 },
      { date: "2023-04-01", value: 65 },
      { date: "2023-05-01", value: 80 },
      { date: "2023-06-01", value: 95 },
    ],
  },
  {
    id: "series4",
    name: "利益2",
    color: "#2ca000",
    data: [
      { date: "2023-03-01", value: 20 },
      { date: "2023-04-01", value: 35 },
      { date: "2023-05-01", value: 50 },
      { date: "2023-06-01", value: 65 },
      { date: "2023-07-01", value: 80 },
      { date: "2023-08-01", value: 95 },
    ],
  },
];

export default function d3js() {
  return (
    <div>
      <Typography variant="h3" gutterBottom>
        D3.js
      </Typography>
      <MultiLinePlot series={seriesData} />
    </div>
  );
}
