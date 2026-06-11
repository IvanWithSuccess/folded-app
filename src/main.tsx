import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import HomePage from "./imports/Frame28/index.tsx";
import DownloadPage from "./DownloadPage.tsx";
import StubPage from "./StubPage.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/how-it-works" element={<StubPage title="How It Works" />} />
      <Route path="/manual" element={<StubPage title="Manual" />} />
      <Route path="/updates" element={<StubPage title="Updates" />} />
    </Routes>
  </BrowserRouter>
);