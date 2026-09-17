import {
  API_BASE_URL,
  API_CREDENTIALS,
  REQUEST_TIMEOUT_MS,
} from "../utilities/sessionService";

export const runtimeConfig = Object.freeze({
  apiBaseUrl: API_BASE_URL,
  credentials: API_CREDENTIALS,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
});
