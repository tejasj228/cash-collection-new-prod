import React from "react";
import { CollectionWorkspace } from "../CollectionDetails.jsx";
import { REQUEST_DETAILS_SOURCE } from "./requestBasedDetails";
import "./RequestBasedDetails.css";

export function RequestBasedDetails(props) {
  return (
    <CollectionWorkspace
      {...props}
      mode={REQUEST_DETAILS_SOURCE}
      request={props.request}
    />
  );
}
