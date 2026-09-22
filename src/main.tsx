import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Auth, { hasSession } from "./Auth";
import "./styles.css";

function Root() {
  const [authenticated, setAuthenticated] = useState(hasSession());
  return authenticated ? <App onLogout={() => { localStorage.removeItem("latam-session"); setAuthenticated(false); }} /> : <Auth onLogin={() => setAuthenticated(true)} />;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><Root /></React.StrictMode>);
