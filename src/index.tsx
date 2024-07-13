import React from "react";
import ReactDOM from "react-dom/client";
import Sidepanel from "./sidepanel";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <Sidepanel />
  </React.StrictMode>
);

console.log("Sidepanel React app mounted");
