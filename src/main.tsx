import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocietyProvider } from "./context/SocietyContext";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocietyProvider>
          <App />
        </SocietyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
