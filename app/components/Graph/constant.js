/**
 * Graph component constants
 */

// パネル位置のパターン定義
export const PANEL_OFFSET_PATTERN = [
  { x: 20, y: 20 }, // 1つ目のパネル
  { x: 20, y: 40 }, // 2つ目のパネル
  { x: 20, y: 60 }, // 3つ目のパネル
  { x: 20, y: 80 }, // 4つ目のパネル
  { x: 20, y: 100 }, // 5つ目のパネル
  { x: 20, y: 120 }, // 6つ目のパネル
  { x: 20, y: 140 }, // 7つ目のパネル
  { x: 20, y: 160 }, // 8つ目のパネル
  { x: 20, y: 180 }, // 9つ目のパネル
  { x: 20, y: 200 }, // 10つ目のパネル
];

// パネルのデフォルトサイズ
export const DEFAULT_PANEL_SIZE = {
  width: 200,
  height: 400,
};

// ズーム関連の定数
export const ZOOM_SETTINGS = {
  defaultScale: 1.0,
  zoomInFactor: 1.3,
  zoomOutFactor: 0.7,
  animationDuration: 300,
  nodeZoomScale: 4.0,
  blinkDuration: 4000,
  blinkInterval: 500,
  padding: 0, // グラフ表示時の余白
  initialPadding: 5, // 初期表示時の余白
};
// パネルのスタイル関連の定数
export const PANEL_STYLES = {
  minWidth: 200,
  minHeight: 100,
  headerBgColor: "rgba(0, 0, 0, 0.05)",
  headerHoverBgColor: "rgba(0, 0, 0, 0.08)",
  headerBorderBottom: "1px solid rgba(0, 0, 0, 0.12)",
};

// ドラッグ状態の初期値
export const INITIAL_DRAG_STATE = {
  isPanelDragging: false,
  isResizing: false,
  activePanel: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
};
