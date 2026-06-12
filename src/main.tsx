import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router";
import HomePage from "./imports/Frame28/index.tsx";
import DownloadPage from "./DownloadPage.tsx";
import StubPage from "./StubPage.tsx";
import HowItWorksPage from "./HowItWorksPage.tsx";
import InstallMacOSPage from "./InstallMacOSPage.tsx";
import InstallWindowsPage from "./InstallWindowsPage.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/install/macos" element={<InstallMacOSPage />} />
      <Route path="/install/windows" element={<InstallWindowsPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      import UserGuidePage from "./UserGuidePage.tsx";
      <Route path="/guide" element={<UserGuidePage />} />
      <Route path="/updates" element={<StubPage title="Updates" />} />
    </Routes>
  </HashRouter>
);