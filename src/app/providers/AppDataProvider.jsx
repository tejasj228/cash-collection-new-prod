import React, { createContext, useContext } from "react";

const AppDataContext = createContext(null);

export function AppDataProvider({ value, children }) {
  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("Cash Collection data provider is missing.");
  return value;
}
