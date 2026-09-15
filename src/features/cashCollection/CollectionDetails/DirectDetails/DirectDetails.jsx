import React from "react";
import { CollectionWorkspace } from "../CollectionDetails.jsx";
import { DIRECT_DETAILS_SOURCE } from "./directDetails";
import "./DirectDetails.css";

export function DirectDetails(props) {
  return (
    <CollectionWorkspace
      {...props}
      mode={DIRECT_DETAILS_SOURCE}
      request={null}
    />
  );
}
