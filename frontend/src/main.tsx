import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OrgProvider } from "./contexts/OrgContext";

async function boot() {
  // Dev-only API stand-in; dead code in production builds.
  if (import.meta.env.DEV && import.meta.env.VITE_API_SHIM === "1") {
    const { installShim } = await import("./dev/shim");
    installShim();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <NotificationsProvider>
        <AuthProvider>
          <OrgProvider>
            <App />
          </OrgProvider>
        </AuthProvider>
      </NotificationsProvider>
    </StrictMode>,
  );
}

boot();
