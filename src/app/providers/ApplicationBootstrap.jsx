import React, { useEffect, useState } from "react";
import { Alert, Button, Spin } from "antd";
import { resolveApplicationRuntime } from "../../services/applicationRuntime";
import CashCollectionApplication from "../../features/cashCollection/CashCollectionApplication";

export function ApplicationBootstrap() {
  const [state, setState] = useState({
    loading: true,
    runtime: null,
    error: null,
  });
  const load = () => {
    setState({ loading: true, runtime: null, error: null });
    resolveApplicationRuntime()
      .then((runtime) => setState({ loading: false, runtime, error: null }))
      .catch((error) => setState({ loading: false, runtime: null, error }));
  };
  useEffect(load, []);
  if (state.loading)
    return (
      <div className="application-state">
        <Spin size="large" tip="Loading cash collection data…">
          <div className="application-state-space" />
        </Spin>
      </div>
    );
  if (state.error)
    return (
      <div className="application-state">
        <Alert
          type="error"
          showIcon
          message="Cash Collection could not be loaded"
          description={state.error.message}
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  return (
    <CashCollectionApplication
      data={state.runtime.data}
      integration={state.runtime.integration}
    />
  );
}
