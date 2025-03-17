/**
 * Graph component constants
 */

// パネル位置のパターン定義
export const PANEL_OFFSET_PATTERN = [
  { x: 20, y: 20 }, // 1つ目のパネル
  { x: 70, y: 40 }, // 2つ目のパネル
  { x: 120, y: 60 }, // 3つ目のパネル
  { x: 170, y: 80 }, // 4つ目のパネル
  { x: 200, y: 120 }, // 5つ目のパネル
  { x: 180, y: 180 }, // 6つ目のパネル
  { x: 130, y: 200 }, // 7つ目のパネル
  { x: 80, y: 220 }, // 8つ目のパネル
  { x: 40, y: 180 }, // 9つ目のパネル
  { x: 30, y: 120 }, // 10つ目のパネル
];

// パネルのデフォルトサイズ
export const DEFAULT_PANEL_SIZE = {
  width: 300,
  height: 200,
};

// ズーム関連の定数
export const ZOOM_SETTINGS = {
  defaultScale: 1.0,
  zoomInFactor: 1.3,
  zoomOutFactor: 0.7,
  animationDuration: 300,
  nodeZoomScale: 2.0,
  blinkDuration: 4000,
  blinkInterval: 500,
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
