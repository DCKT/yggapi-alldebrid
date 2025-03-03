import "./styles.css";
import "@radix-ui/themes/styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { Theme } from "@radix-ui/themes";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root") as HTMLElement);
  root.render(
    <Theme>
      <App />
    </Theme>,
  );
});
