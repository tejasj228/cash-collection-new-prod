import { useState } from "react";

function useSort(initial = null) {
  const [sort, setSort] = useState(initial);
  const toggle = (field) =>
    setSort((current) =>
      current && current.field === field
        ? current.dir === "asc"
          ? { field, dir: "desc" }
          : null
        : { field, dir: "asc" },
    );
  return [sort, toggle];
}

const applySort = (rows, sort, accessors) => {
  if (!sort || !accessors[sort.field]) return rows;
  const get = accessors[sort.field];
  return [...rows].sort((a, b) => {
    const left = get(a);
    const right = get(b);
    const cmp =
      typeof left === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return sort.dir === "asc" ? cmp : -cmp;
  });
};

export { useSort, applySort };
