const { createProxyMiddleware } = require("http-proxy-middleware");
const { LEGACY_BACKEND_ORIGIN } = require("./utilities/sessionService");

// Dev-server only. The real HBIMS pending-request endpoint doesn't send
// Access-Control-Allow-Origin, so the browser refuses to call it directly
// from localhost:3000. Proxying through the CRA dev server keeps the
// browser's request same-origin; this file has no effect on `npm run build`
// output, so production still needs the backend to allow the real origin
// (or to be served from the same origin as this app, which needs no proxy
// at all — see src/utilities/sessionService.js).
//
module.exports = function setupProxy(app) {
  app.use(
    "/legacy-hbims",
    createProxyMiddleware({
      target: LEGACY_BACKEND_ORIGIN,
      changeOrigin: true,
      pathRewrite: { "^/legacy-hbims": "" },
    }),
  );
};
