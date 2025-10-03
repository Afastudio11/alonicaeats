import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

const hideLoader = () => {
  const loader = document.getElementById("app-loader");
  if (loader) {
    loader.classList.add("hidden");
    setTimeout(() => {
      loader.remove();
    }, 500);
  }
};

setTimeout(hideLoader, 100);
