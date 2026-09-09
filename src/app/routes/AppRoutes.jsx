import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ApplicationBootstrap } from "../providers/ApplicationBootstrap";
import { CASH_COLLECTION_ROUTES } from "../../features/cashCollection/model/navigationRoutes";

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path={`${CASH_COLLECTION_ROUTES.collection}/*`}
        element={<ApplicationBootstrap />}
      />
      <Route
        path={CASH_COLLECTION_ROUTES.overview}
        element={<ApplicationBootstrap />}
      />
      <Route
        path={CASH_COLLECTION_ROUTES.reports}
        element={<ApplicationBootstrap />}
      />

      <Route
        path="/cash-collection"
        element={<Navigate to={CASH_COLLECTION_ROUTES.collection} replace />}
      />
      <Route
        path="/overview"
        element={<Navigate to={CASH_COLLECTION_ROUTES.overview} replace />}
      />
      <Route
        path="/reports"
        element={<Navigate to={CASH_COLLECTION_ROUTES.reports} replace />}
      />
      <Route
        path="/estimates"
        element={<Navigate to={CASH_COLLECTION_ROUTES.collection} replace />}
      />
      <Route
        path="/"
        element={<Navigate to={CASH_COLLECTION_ROUTES.collection} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={CASH_COLLECTION_ROUTES.collection} replace />}
      />
    </Routes>
  );
}
