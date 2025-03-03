import "./styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root") as HTMLElement);
  root.render(<App />);
});
