import "./styles/index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/app/App";
import { AppProviders } from '@/app/providers/AppProviders';

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <AppProviders>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </AppProviders>
  </React.StrictMode>
);
