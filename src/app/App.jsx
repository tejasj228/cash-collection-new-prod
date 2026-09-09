import React from "react";
import { ConfigProvider } from "antd";
import { HashRouter } from "react-router-dom";
import { AppRoutes } from "./routes/AppRoutes";
import { antdTheme } from "./theme/antdTheme";

export default function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ConfigProvider>
  );
}
