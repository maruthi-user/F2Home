import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
      <BrowserRouter>
      <Provider store={store}>
        <App />
      </Provider>
      </BrowserRouter>
  // {/* </React.StrictMode> */}
);
