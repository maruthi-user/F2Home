import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Wouter drives the page routes; it must also know the base path GitHub
// Pages serves the app from, otherwise /F2Home/app/... matches no route.
import { Router as WouterRouter } from "wouter";
import App from "./App.jsx";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./redux/store";

document.addEventListener(
  "wheel",
  (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "number") {
      e.target.blur();
    }
  },
  { passive: true }
);

const base = import.meta.env.BASE_URL;
// Wouter wants the base without a trailing slash ("" for root deploys).
const wouterBase = base.endsWith("/") ? base.slice(0, -1) : base;

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
      <BrowserRouter basename={base}>
      <WouterRouter base={wouterBase}>
      <Provider store={store}>
        <App />
      </Provider>
      </WouterRouter>
      </BrowserRouter>
  // {/* </React.StrictMode> */}
);
