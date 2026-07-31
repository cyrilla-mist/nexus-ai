const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

const BRIDGE_CONTRACTS = Object.freeze({
  read: Object.freeze({
    port: "8790",
    pathname: "/api/continuity/reentry",
  }),
  mutation: Object.freeze({
    port: "8791",
    pathname: "/api/context/repair/benchmark-owner",
  }),
});

export class LocalBridgeUrlError extends Error {
  constructor(message, code = "INVALID_LOCAL_BRIDGE_URL", options = {}) {
    super(message, options);
    this.name = "LocalBridgeUrlError";
    this.code = code;
  }
}

export function validateLocalBridgeUrl(value, kind = "read") {
  const contract = BRIDGE_CONTRACTS[kind];
  if (!contract) {
    throw new LocalBridgeUrlError(
      `Unsupported local bridge kind: ${kind}`,
      "UNKNOWN_LOCAL_BRIDGE_KIND",
    );
  }

  let url;
  try {
    url = new URL(String(value || ""));
  } catch (cause) {
    throw new LocalBridgeUrlError(
      "The local bridge URL is not valid.",
      "INVALID_LOCAL_BRIDGE_URL",
      { cause },
    );
  }

  if (url.protocol !== "http:") {
    throw new LocalBridgeUrlError(
      "The local bridge must use http on the loopback interface.",
      "LOCAL_BRIDGE_PROTOCOL_NOT_ALLOWED",
    );
  }
  if (url.username || url.password) {
    throw new LocalBridgeUrlError(
      "Credentials are not allowed in a local bridge URL.",
      "LOCAL_BRIDGE_CREDENTIALS_NOT_ALLOWED",
    );
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new LocalBridgeUrlError(
      "The local bridge host must be localhost or 127.0.0.1.",
      "LOCAL_BRIDGE_HOST_NOT_ALLOWED",
    );
  }
  if (url.port !== contract.port) {
    throw new LocalBridgeUrlError(
      `The ${kind} bridge must use port ${contract.port}.`,
      "LOCAL_BRIDGE_PORT_NOT_ALLOWED",
    );
  }
  if (url.pathname !== contract.pathname) {
    throw new LocalBridgeUrlError(
      `The ${kind} bridge path is not allow-listed.`,
      "LOCAL_BRIDGE_PATH_NOT_ALLOWED",
    );
  }
  if (url.search || url.hash) {
    throw new LocalBridgeUrlError(
      "Query strings and fragments are not allowed in a local bridge URL.",
      "LOCAL_BRIDGE_SUFFIX_NOT_ALLOWED",
    );
  }

  return url.toString();
}

export function defaultLocalBridgeUrl(kind = "read", host = "127.0.0.1") {
  const contract = BRIDGE_CONTRACTS[kind];
  if (!contract) {
    throw new LocalBridgeUrlError(
      `Unsupported local bridge kind: ${kind}`,
      "UNKNOWN_LOCAL_BRIDGE_KIND",
    );
  }
  return validateLocalBridgeUrl(
    `http://${host}:${contract.port}${contract.pathname}`,
    kind,
  );
}
