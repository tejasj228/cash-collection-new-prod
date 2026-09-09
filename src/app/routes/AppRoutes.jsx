import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ApplicationBootstrap } from "../providers/ApplicationBootstrap";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/cash-collection/*" element={<ApplicationBootstrap />} />
      <Route path="/overview" element={<ApplicationBootstrap />} />
      <Route path="/reports" element={<ApplicationBootstrap />} />
      <Route path="/estimates" element={<ApplicationBootstrap />} />
      <Route path="/" element={<Navigate to="/cash-collection" replace />} />
      <Route path="*" element={<Navigate to="/cash-collection" replace />} />
    </Routes>
  );
}
