import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { NotificationsProvider } from "./notifications";
import { makeQueryClient } from "./queryClient";
import "./styles/globals.css";

const queryClient = makeQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
