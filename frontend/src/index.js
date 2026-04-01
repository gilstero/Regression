import { createVisualizerApp } from "./graph.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

createVisualizerApp(root);
