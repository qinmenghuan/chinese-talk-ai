import { cssVariables } from "@learn-chinese-ai/design-tokens";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AdminAuthProvider } from "./components/AdminAuthProvider";
import App from "./App";
import "./styles.css";

for (const [name, value] of Object.entries(cssVariables)) {
  document.documentElement.style.setProperty(name, value);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <App />
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
