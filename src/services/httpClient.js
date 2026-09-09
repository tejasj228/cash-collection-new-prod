export class ApiError extends Error {
  constructor(message, { code, status, fieldErrors, requestId } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.requestId = requestId;
  }
}

export function createHttpClient({
  baseUrl,
  credentials = "include",
  timeoutMs = 30000,
}) {
  async function request(path, { method = "GET", query, body, headers } = {}) {
    const url = new URL(
      `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
      window.location.origin,
    );
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        url.searchParams.set(key, String(value));
    });
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        credentials,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const envelope = await response.json().catch(() => null);
      if (!response.ok || !envelope || envelope.success === false) {
        const error = envelope?.error || {};
        throw new ApiError(
          error.message || `Request failed with status ${response.status}.`,
          {
            code: error.code,
            status: response.status,
            fieldErrors: error.fieldErrors,
            requestId: envelope?.requestId,
          },
        );
      }
      return Object.prototype.hasOwnProperty.call(envelope, "data")
        ? envelope.data
        : envelope;
    } catch (error) {
      if (error?.name === "AbortError")
        throw new ApiError("The server took too long to respond.", {
          code: "REQUEST_TIMEOUT",
        });
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  return Object.freeze({ request });
}
