import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { AuthProvider } from "./contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotificationsProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </NotificationsProvider>
  </StrictMode>,
);
