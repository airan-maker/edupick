import { createLucideIcon } from "lucide-react";

export const SoccerBall = createLucideIcon("SoccerBall", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "ball-outline" }],
  ["polygon", { points: "12 7 14.5 9 13.5 12 10.5 12 9.5 9", key: "ball-center" }],
  ["line", { x1: "12", y1: "2", x2: "12", y2: "7", key: "top-panel" }],
  ["line", { x1: "22", y1: "12", x2: "14.5", y2: "9", key: "right-panel" }],
  ["line", { x1: "19", y1: "20", x2: "13.5", y2: "12", key: "bottom-right-panel" }],
  ["line", { x1: "5", y1: "20", x2: "10.5", y2: "12", key: "bottom-left-panel" }],
  ["line", { x1: "2", y1: "12", x2: "9.5", y2: "9", key: "left-panel" }],
]);

export default SoccerBall;
