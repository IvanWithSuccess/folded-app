import React from "react";
import { HashRouter, Routes, Route } from "react-router";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

// Pages
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Download from "./pages/Download";
import Manual from "./pages/Manual";
import Updates from "./pages/Updates";

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-[#09090b]">
        {/* Navigation Bar */}
        <NavBar />

        {/* Main Content Area */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/download" element={<Download />} />
            <Route path="/manual" element={<Manual />} />
            <Route path="/updates" element={<Updates />} />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </HashRouter>
  );
}
