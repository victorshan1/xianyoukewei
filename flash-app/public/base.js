var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const FLASH_APP_AUDIO_CONTROL = "FLASH_APP_AUDIO_CONTROL";
class FlashAppAudioRuntimeImpl {
  constructor() {
    __publicField(this, "muted", false);
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
  }
  getMuted() {
    return this.muted;
  }
  setMuted(muted) {
    if (this.muted === muted) {
      return;
    }
    this.muted = muted;
    this.listeners.forEach((listener) => listener(muted));
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.muted);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
const getFlashAppAudioRuntime = (targetWindow = window) => {
  if (!targetWindow.__FLASH_APP_AUDIO__) {
    targetWindow.__FLASH_APP_AUDIO__ = new FlashAppAudioRuntimeImpl();
  }
  return targetWindow.__FLASH_APP_AUDIO__;
};
let apiCallCount = 0;
const isDev = (() => {
  try {
    const hostname = window.location.hostname;
    const port = window.location.port;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }
    if (port && port !== "" && port !== "80" && port !== "443") {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
})();
const DEV_MOCK_IMAGE_URL = "https://gw.alipayobjects.com/render/p/yuyan/180023180034745799/assets/image.jpg";
const DEV_MOCK_MUSIC_URL = "https://mdn.alipayobjects.com/asap_serivce/uri/file/as/yequ.hexin.mp3";
const flashWindow = window;
const toRecordValue = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
};
const toStringValue = (value, fallback = "") => {
  return typeof value === "string" ? value : fallback;
};
const toStringSnapshotRecord = (value) => {
  const record = toRecordValue(value);
  const snapshot = {};
  Object.keys(record).forEach((key) => {
    snapshot[key] = toStringValue(record[key]);
  });
  return snapshot;
};
const toPrimitiveString = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return void 0;
};
const toNumberValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return void 0;
};
const toVisibilityState = (value) => {
  if (value === "visible" || value === "hidden") {
    return value;
  }
  return void 0;
};
const getErrorMessage = (error, fallback) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const record = toRecordValue(error);
  return toStringValue(record.message, fallback);
};
const getErrorCode = (error) => {
  const record = toRecordValue(error);
  return toPrimitiveString(record.code);
};
const getErrorStack = (error) => {
  if (error instanceof Error && typeof error.stack === "string") {
    return error.stack;
  }
  const record = toRecordValue(error);
  return toStringValue(record.stack) || void 0;
};
const normalizeHeadersRecord = (headers) => {
  const normalized = {};
  if (!headers) {
    return normalized;
  }
  const resolvedHeaders = new Headers(headers);
  resolvedHeaders.forEach((value, key) => {
    normalized[key] = value;
  });
  return normalized;
};
const normalizeQueryRecord = (url) => {
  const query = {};
  url.searchParams.forEach((value, key) => {
    const currentValue = query[key];
    if (currentValue === void 0) {
      query[key] = value;
      return;
    }
    if (Array.isArray(currentValue)) {
      currentValue.push(value);
      return;
    }
    query[key] = [currentValue, value];
  });
  return query;
};
const normalizeServiceBody = (body) => {
  if (body === null || body === void 0) {
    return null;
  }
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  throw new Error("lingguang.service.fetch 目前仅支持 string / URLSearchParams body");
};
const normalizeServiceRequest = (input, init = {}) => {
  var _a, _b, _c, _d;
  if (typeof Request !== "undefined" && input instanceof Request) {
    return normalizeServiceRequest(input.url, {
      method: (_a = init.method) != null ? _a : input.method,
      headers: (_b = init.headers) != null ? _b : input.headers,
      body: init.body,
      signal: (_c = init.signal) != null ? _c : input.signal
    });
  }
  if (typeof input !== "string" && !(input instanceof URL)) {
    throw new Error("lingguang.service.fetch 仅支持 string / URL / Request 输入");
  }
  const url = input instanceof URL ? input : new URL(input);
  const method = toStringValue(init.method, "GET").toUpperCase();
  return {
    method,
    path: url.pathname || "/",
    query: normalizeQueryRecord(url),
    headers: normalizeHeadersRecord(init.headers),
    body: normalizeServiceBody(init.body),
    signal: (_d = init.signal) != null ? _d : void 0
  };
};
const buildServiceResponse = (response) => {
  var _a;
  return new Response((_a = response.body) != null ? _a : "", {
    status: response.status,
    headers: response.headers
  });
};
const requestService = async (request) => {
  if (!request.path) {
    throw new Error("path is required");
  }
  const _a = request, { signal } = _a, rest = __objRest(_a, ["signal"]);
  return callApi("lingguang.service.request", { request: rest }, { signal });
};
const serviceFetch = async (input, init) => {
  const response = await requestService(normalizeServiceRequest(input, init));
  return buildServiceResponse(response);
};
const createFlashAppFetch = () => {
  return serviceFetch;
};
const flashAppAudioRuntime = getFlashAppAudioRuntime(flashWindow);
window.addEventListener("message", (event) => {
  const eventData = toRecordValue(event.data);
  if (eventData.type !== FLASH_APP_AUDIO_CONTROL) {
    return;
  }
  flashAppAudioRuntime.setMuted(Boolean(eventData.muted));
});
const installLocalStorageBridge = () => {
  const config = flashWindow.__flashAppLocalStorageBridgeConfig;
  if (!(config == null ? void 0 : config.enabled)) {
    return;
  }
  if (!window.artifactId && config.artifactId) {
    window.artifactId = config.artifactId;
  }
  if (!window.artifactVersion && config.artifactVersion) {
    window.artifactVersion = config.artifactVersion;
  }
  const cache = new Map(Object.entries(toStringSnapshotRecord(config.snapshot)));
  let persistSeq = 0;
  const buildSnapshot = () => {
    return Object.fromEntries(cache.entries());
  };
  const persistSnapshot = (reason) => {
    const requestId = `flash-app-localstorage-${Date.now()}-${++persistSeq}`;
    window.parent.postMessage(
      {
        type: "FLASH_APP_LOCALSTORAGE_SYNC",
        requestId,
        reason,
        storageKey: config.storageKey,
        storageNamespace: config.storageNamespace,
        artifactId: config.artifactId,
        artifactVersion: config.artifactVersion,
        traceId: window.trace_id || "",
        snapshot: buildSnapshot()
      },
      "*"
    );
  };
  const bridgeStorage = {
    get length() {
      return cache.size;
    },
    clear() {
      cache.clear();
      persistSnapshot("clear");
    },
    getItem(key) {
      var _a;
      const normalizedKey = String(key);
      return cache.has(normalizedKey) ? (_a = cache.get(normalizedKey)) != null ? _a : null : null;
    },
    key(index) {
      var _a;
      if (!Number.isInteger(index) || index < 0 || index >= cache.size) {
        return null;
      }
      return (_a = Array.from(cache.keys())[index]) != null ? _a : null;
    },
    removeItem(key) {
      const normalizedKey = String(key);
      if (!cache.has(normalizedKey)) {
        return;
      }
      cache.delete(normalizedKey);
      persistSnapshot("removeItem");
    },
    setItem(key, value) {
      const normalizedKey = String(key);
      cache.set(normalizedKey, String(value));
      persistSnapshot("setItem");
    }
  };
  flashWindow.__bridgeLocalStorage = bridgeStorage;
  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: true,
      get() {
        return bridgeStorage;
      }
    });
    console.log("[FLASH APP] localStorage bridge 已安装到 window.localStorage", {
      mode: config.mode,
      storageNamespace: config.storageNamespace
    });
  } catch (error) {
    console.log("[FLASH APP] 安装 window.localStorage bridge 失败，使用 __bridgeLocalStorage 兜底", error);
  }
  try {
    if (typeof Storage !== "undefined" && Storage.prototype) {
      Storage.prototype.getItem = function(key) {
        return bridgeStorage.getItem(String(key));
      };
      Storage.prototype.setItem = function(key, value) {
        bridgeStorage.setItem(String(key), String(value));
      };
      Storage.prototype.removeItem = function(key) {
        bridgeStorage.removeItem(String(key));
      };
      Storage.prototype.clear = function() {
        bridgeStorage.clear();
      };
      Storage.prototype.key = function(index) {
        return bridgeStorage.key(index);
      };
    }
  } catch (error) {
    console.log("[FLASH APP] patch Storage.prototype 失败，忽略兜底逻辑", error);
  }
};
installLocalStorageBridge();
globalThis.__FLASH_APP_FETCH_API__ = createFlashAppFetch();
const pendingApiCalls = /* @__PURE__ */ new Map();
const pendingStreamCallbacks = /* @__PURE__ */ new Map();
window.addEventListener("message", (event) => {
  var _a;
  const eventData = toRecordValue(event.data);
  if (eventData.type === "FLASH_APP_LOCALSTORAGE_ACK") {
    const requestId = toStringValue(eventData.requestId);
    if (eventData.success === true) {
      console.log("[FLASH APP] localStorage bridge 持久化成功", requestId);
    } else {
      console.log("[FLASH APP] localStorage bridge 持久化失败", {
        requestId,
        message: toStringValue(eventData.message, "persist failed")
      });
    }
    return;
  }
  if (eventData.type === "API_STREAM") {
    const id = toStringValue(eventData.id);
    const payload = eventData.payload;
    const callbackInfo = pendingStreamCallbacks.get(id);
    if (!callbackInfo) {
      console.log("[FLASH APP] API_STREAM 未找到对应的回调", id);
      return;
    }
    try {
      callbackInfo.onText(toRecordValue(payload));
    } catch (e) {
      console.log("[FLASH APP] API_STREAM 回调执行失败", e);
    }
    return;
  }
  if (eventData.type === "API_STREAM_ERROR") {
    const id = toStringValue(eventData.id);
    const error = toStringValue(eventData.error, "流式响应失败");
    const code = toStringValue(eventData.code) || void 0;
    const callbackInfo = pendingStreamCallbacks.get(id);
    if (!callbackInfo) {
      console.log("[FLASH APP] API_STREAM_ERROR 未找到对应的回调", id);
      return;
    }
    try {
      (_a = callbackInfo.onError) == null ? void 0 : _a.call(callbackInfo, { message: error, code });
    } catch (e) {
      console.log("[FLASH APP] API_STREAM_ERROR 回调执行失败", e);
    }
    return;
  }
  if (eventData.type === "API_CALLBACK") {
    const id = toStringValue(eventData.id);
    const success = eventData.success === true;
    const message = toStringValue(eventData.message, "API 调用失败");
    const payload = eventData.payload;
    const pendingCall = pendingApiCalls.get(id);
    if (!pendingCall) {
      console.log("[FLASH APP] API_CALLBACK 未找到对应的回调", id);
      return;
    }
    pendingApiCalls.delete(id);
    pendingStreamCallbacks.delete(id);
    if (success) {
      pendingCall.resolve(payload);
    } else {
      pendingCall.reject(new Error(message));
    }
  }
});
if (!window.artifactId) {
  window.artifactId = `flashapp-${Date.now()}`;
  window.artifactVersion = "1";
  window.trace_id = "";
}
const createAbortError = () => {
  try {
    return new DOMException("Aborted", "AbortError");
  } catch (e) {
    const error = new Error("Aborted");
    Object.defineProperty(error, "name", {
      value: "AbortError",
      configurable: true
    });
    return error;
  }
};
const setDevStorageItem = (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized === void 0 ? "null" : serialized);
    return true;
  } catch (e) {
    console.log("[FLASH APP][DEV MOCK] lingguang.storage.setItem 失败", e);
    return false;
  }
};
const getDevStorageItem = (key) => {
  try {
    const serialized = window.localStorage.getItem(key);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized);
  } catch (e) {
    console.log("[FLASH APP][DEV MOCK] lingguang.storage.getItem 失败", e);
    return null;
  }
};
const removeDevStorageItem = (key) => {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.log("[FLASH APP][DEV MOCK] lingguang.storage.removeItem 失败", e);
    return false;
  }
};
const clearDevStorage = () => {
  try {
    window.localStorage.clear();
    return true;
  } catch (e) {
    console.log("[FLASH APP][DEV MOCK] lingguang.storage.clear 失败", e);
    return false;
  }
};
const toLegacyMockKey = (value) => {
  var _a;
  if (!value) {
    return "";
  }
  return (_a = toPrimitiveString(value)) != null ? _a : "";
};
const toDevMockOptions = (payload) => {
  const options = toRecordValue(payload.options);
  return Object.keys(options).length > 0 ? options : toRecordValue(payload.params);
};
const resolveDevMockResponse = (action, payload, isStream) => {
  var _a, _b;
  switch (action) {
    case "lingguang.storage.setItem":
      return setDevStorageItem(toLegacyMockKey(payload.key), payload.value);
    case "lingguang.storage.getItem":
      return getDevStorageItem(toLegacyMockKey(payload.key));
    case "lingguang.storage.removeItem":
      return removeDevStorageItem(toLegacyMockKey(payload.key));
    case "lingguang.storage.clear":
      return clearDevStorage();
    case "lingguang.db.query":
      return { success: false, data: [], message: "db.query not available in dev mode" };
    case "lingguang.db.execute":
      return { success: false, data: { rowsAffected: 0 }, message: "db.execute not available in dev mode" };
    case "lingguang.db.role":
      return { role: "USER" };
    case "lingguang.data.fetch":
      return null;
    case "lingguang.data.getWeather":
    case "lingguang.data.getExchangeRate":
    case "lingguang.data.getStockPrice":
    case "lingguang.data.getStockCandlestickData":
    case "lingguang.data.getPreciousMetalPrice":
      return null;
    case "lingguang.data.explore":
      if (isStream) {
        return void 0;
      }
      return '<div style="padding:16px;color:#666;">开发环境 mock：explore 暂不可用</div>';
    case "lingguang.service.request":
      return {
        status: 503,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          code: "FLASH_APP_SERVICE_UNAVAILABLE_IN_DEV",
          message: "当前预览环境不提供应用私有服务能力，请在真实运行环境联调"
        })
      };
    case "lingguang.storybook":
    case "lingguang.ai.llmStream":
      return void 0;
    case "lingguang.canIUse":
      return true;
    case "lingguang.navigate.to":
      return { success: true };
    case "lingguang.app.share":
      return { success: true, message: "mock share success" };
    case "lingguang.ai.imageGeneration":
      return { url: DEV_MOCK_IMAGE_URL };
    case "lingguang.ai.vllm":
      return { content: "这是一张图片的描述内容（开发环境模拟数据）" };
    case "lingguang.ai.musicGeneration":
      return { url: DEV_MOCK_MUSIC_URL, duration: 227 };
    case "lingguang.chooseImage":
    case "lingguang.takePhoto":
      return { tempFiles: [] };
    case "lingguang.saveImageToPhotosAlbum":
      return void 0;
    case "lingguang.uploadImage":
      return { url: DEV_MOCK_IMAGE_URL };
    case "lingguang.getLocation": {
      const options = toDevMockOptions(payload);
      const location2 = {
        longitude: 121.4737,
        latitude: 31.2304,
        country: "China",
        countryCode: "CN",
        province: "Shanghai",
        provinceCode: "310000",
        city: "Shanghai",
        cityCode: "310100"
      };
      if (options.poi === true) {
        return __spreadProps(__spreadValues({}, location2), {
          pois: [{ name: "People Square", address: "People's Avenue, Huangpu District" }]
        });
      }
      return location2;
    }
    case "lingguang.chooseFile":
      return {
        filePath: "/tmp/mock-file.txt",
        fileName: "mock-file.txt"
      };
    case "lingguang.uploadFile":
      return { fileId: "mock-file-id" };
    case "lingguang.fs.parseFileText": {
      const options = toDevMockOptions(payload);
      const fileId = toPrimitiveString(options.fileId) || "mock-file-id";
      return { success: true, fileId, runId: fileId };
    }
    case "lingguang.fs.getFileText": {
      const options = toDevMockOptions(payload);
      const runId = toPrimitiveString(options.runId) || "mock-file-id";
      return { success: true, fileId: runId, status: "uploaded", parseStatus: "mock_pending", runId };
    }
    case "lingguang.saveFile":
      return { success: true };
    case "lingguang.readFile": {
      const options = toDevMockOptions(payload);
      if (options.encoding === "base64") {
        return { data: "bW9jayBmaWxlIGNvbnRlbnQ=" };
      }
      return { data: "mock file content" };
    }
    case "lingguang.vibrate":
    case "lingguang.gyroscope.start":
    case "lingguang.gyroscope.stop":
    case "lingguang.asr.start":
    case "lingguang.asr.stop":
    case "lingguang.asr.abort":
    case "lingguang.monitor.event":
      return void 0;
    case "lingguang.alert": {
      const options = toDevMockOptions(payload);
      const message = (_a = toPrimitiveString(options.message)) != null ? _a : "";
      console.log("[FLASH APP][DEV MOCK] alert", message);
      return void 0;
    }
    case "lingguang.deprecated.callLLM": {
      const prompt = (_b = toPrimitiveString(payload.prompt)) != null ? _b : "";
      const systemPrompt = payload.systemPrompt;
      if (systemPrompt === "DATA_API_REQUEST") {
        return {
          success: true,
          data: JSON.stringify(null)
        };
      }
      const formattedSystemPrompt = toPrimitiveString(systemPrompt);
      return {
        content: `这是开发环境的 mock LLM 响应。

用户消息：${prompt}${formattedSystemPrompt ? `

系统提示：${formattedSystemPrompt}` : ""}`
      };
    }
    default:
      if (isStream) {
        return void 0;
      }
      return { success: true, message: `mocked in dev mode: ${action}` };
  }
};
const callApi = async (action, payload, options = {}) => {
  const { signal } = options;
  if (signal == null ? void 0 : signal.aborted) {
    return Promise.reject(createAbortError());
  }
  if (isDev) {
    console.log("[FLASH APP][DEV MOCK] API:", action, payload);
    return resolveDevMockResponse(action, payload, false);
  }
  const id = `api-call-${Date.now()}-${++apiCallCount}`;
  payload.artifactId = window.artifactId;
  payload.artifactVersion = window.artifactVersion;
  payload.traceId = window.trace_id;
  const message = {
    type: "API",
    id,
    action,
    payload
  };
  console.log("[FLASH APP] 发起 API 调用:", JSON.stringify(message, null, 2));
  window.parent.postMessage(message, "*");
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      pendingApiCalls.delete(id);
      cleanup();
      reject(createAbortError());
    };
    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    pendingApiCalls.set(id, {
      resolve: (value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(value);
      },
      reject: (error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      }
    });
  });
};
const callApiStream = async (action, payload, options) => {
  const { signal, onText, onError } = options;
  if (signal == null ? void 0 : signal.aborted) {
    return Promise.reject(createAbortError());
  }
  if (!onText) {
    throw new Error("onText callback is required");
  }
  if (isDev) {
    console.log("[FLASH APP][DEV MOCK] API_STREAM:", action, payload);
    return resolveDevMockResponse(action, payload, true);
  }
  const id = `api-call-${Date.now()}-${++apiCallCount}`;
  payload.artifactId = window.artifactId;
  payload.artifactVersion = window.artifactVersion;
  payload.traceId = window.trace_id;
  const message = {
    type: "API",
    id,
    action,
    payload
  };
  console.log("[FLASH APP] 发起 API 调用(流式):", JSON.stringify(message, null, 2));
  window.parent.postMessage(message, "*");
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      pendingStreamCallbacks.delete(id);
    };
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      pendingApiCalls.delete(id);
      cleanup();
      reject(createAbortError());
    };
    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    pendingStreamCallbacks.set(id, { onText, onError });
    pendingApiCalls.set(id, {
      resolve: (value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(value);
      },
      reject: (error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      }
    });
  });
};
window.lingguang = {
  db: {
    query: async (req) => {
      if (!req || !req.sql) {
        throw new Error("sql is required");
      }
      const _a = req, { signal } = _a, rest = __objRest(_a, ["signal"]);
      return callApi("lingguang.db.query", { req: rest }, { signal });
    },
    execute: async (req) => {
      if (!req || !req.sql) {
        throw new Error("sql is required");
      }
      const _a = req, { signal } = _a, rest = __objRest(_a, ["signal"]);
      return callApi("lingguang.db.execute", { req: rest }, { signal });
    },
    role: async () => {
      return callApi("lingguang.db.role", {});
    }
  },
  storage: {
    setItem: async (key, value) => {
      return callApi("lingguang.storage.setItem", { key, value });
    },
    getItem: async (key) => {
      return callApi("lingguang.storage.getItem", { key });
    },
    removeItem: async (key) => {
      return callApi("lingguang.storage.removeItem", { key });
    },
    clear: async () => {
      return callApi("lingguang.storage.clear", {});
    }
  },
  service: {
    request: async (request) => {
      return requestService(request);
    },
    fetch: createFlashAppFetch()
  },
  data: {
    fetch: async (query, schema) => {
      return callApi("lingguang.data.fetch", { query, schema });
    },
    getWeather: async (options) => {
      return callApi("lingguang.data.getWeather", { params: options || {} });
    },
    getExchangeRate: async (options) => {
      return callApi("lingguang.data.getExchangeRate", { params: options || {} });
    },
    getStockPrice: async (options) => {
      return callApi("lingguang.data.getStockPrice", { params: options || {} });
    },
    getStockCandlestickData: async (options) => {
      return callApi("lingguang.data.getStockCandlestickData", { params: options || {} });
    },
    getPreciousMetalPrice: async (options) => {
      return callApi("lingguang.data.getPreciousMetalPrice", { params: options || {} });
    },
    /**
     * 渐进式探索 API - 根据查询生成流式 HTML 内容
     * @param query - 查询内容，必须包含完整上下文
     * @param currentHTML - 当前显示的 HTML，用于主题检测和上下文理解
     * @param onStreamChunk - 流式回调，接收累积的 HTML 内容
     * @returns Promise<string | null> - 使用流式回调时返回 null，否则返回完整 HTML
     */
    explore: async (query, currentHTML, onStreamChunk) => {
      if (!query) {
        throw new Error("query is required");
      }
      if (onStreamChunk) {
        let accumulatedHtml = "";
        return callApiStream(
          "lingguang.data.explore",
          { query, currentHTML: currentHTML || "" },
          {
            onText: (payload) => {
              accumulatedHtml = payload.text || accumulatedHtml + (payload.delta || "");
              onStreamChunk(accumulatedHtml);
            }
          }
        ).then(() => null);
      }
      return callApi("lingguang.data.explore", { query, currentHTML: currentHTML || "" });
    }
  },
  storybook: async (options) => {
    if (!options || !options.prompt) {
      throw new Error("prompt is required");
    }
    if (!options.onDelta) {
      throw new Error("onDelta callback is required");
    }
    const { prompt, onDelta, signal } = options;
    return callApiStream(
      "lingguang.storybook",
      { prompt },
      {
        signal,
        onText: (payload) => {
          var _a;
          const payloadRecord = toRecordValue(payload);
          onDelta(toRecordValue((_a = payloadRecord.delta) != null ? _a : payloadRecord));
        }
      }
    );
  },
  canIUse: async (api) => {
    const apiName = typeof api === "string" ? api : api == null ? void 0 : api.api;
    if (!apiName) {
      throw new Error("api is required");
    }
    return callApi("lingguang.canIUse", { options: { api: apiName } });
  },
  navigate: {
    to: async (options) => {
      return callApi("lingguang.navigate.to", { options });
    }
  },
  app: {
    share: async (payload) => {
      return callApi("lingguang.app.share", { options: payload });
    }
  },
  ai: {
    /**
     * AI图像生成能力，根据文本描述生成指定尺寸的图像
     * @param {Object} params - 请求参数对象
     * @param {string} params.query - 图像生成的文本描述
     * @param {number} params.width - 生成图像的宽度（像素）
     * @param {number} params.height - 生成图像的高度（像素）
     * @returns {Promise<{url: string}>} 成功时返回包含图像 URL 的对象
     */
    imageGeneration: async (params) => {
      return callApi("lingguang.ai.imageGeneration", { params });
    },
    /**
     * 多模态理解能力的大语言模型，主要用于图像理解，支持图像和文本的混合输入
     * @param {Object} params - 请求参数对象
     * @param {Array<{type: 'image'|'text', content: string}>} params.content - 内容数组，可包含图像和文本
     * @returns {Promise<{content: string}>} 成功时返回包含模型理解结果的对象
     */
    vllm: async (params) => {
      return callApi("lingguang.ai.vllm", { params });
    },
    /**
     * AI音乐生成能力，根据文本描述生成音乐，支持纯音乐和带歌词的歌曲生成
     * @param {Object} params - 请求参数对象
     * @param {string} params.prompt - 音乐风格描述（英文）
     * @param {string} [params.lyrics=''] - 歌词内容，空字符串表示纯音乐
     * @param {number} [params.duration=30] - 音乐时长（秒），范围 30-240，默认 30
     * @returns {Promise<{url: string, duration?: number}>} 成功时返回包含音乐 URL 的对象
     */
    musicGeneration: async (params) => {
      return callApi("lingguang.ai.musicGeneration", { params });
    },
    /**
     * AI 流式文本生成能力，支持实时返回片段用于 UI 流式渲染
     * @param {Object} options - 请求参数对象
     * @param {string} options.prompt - 用户输入
     * @param {string} [options.systemPrompt] - 系统提示词（可选）
     * @param {(payload: {delta: string; text: string; isFinal?: boolean}) => void} options.onText - 流式文本回调
     * @param {(err: {message: string; code?: string}) => void} [options.onError] - 错误回调（可选）
     * @param {AbortSignal} [options.signal] - 取消控制（可选）
     * @returns {Promise<void>} 成功时返回 Promise
     */
    llmStream: async (options) => {
      if (!options || !options.prompt) {
        throw new Error("prompt is required");
      }
      if (!options.onText) {
        throw new Error("onText callback is required");
      }
      const { signal, onText, onError, prompt, systemPrompt } = options;
      return callApiStream("lingguang.ai.llmStream", { prompt, systemPrompt }, { signal, onText, onError });
    },
    /**
     * Agentic 流式生成（搜索 + LLM），通过 agentic_fr_agent 处理
     * @param {object} options - 请求参数
     * @param {string} options.prompt - 用户输入
     * @param {string} [options.systemPrompt] - 系统提示词（可选）
     * @param {function} options.onText - 流式文本回调（必需）
     * @param {function} [options.onError] - 错误回调（可选）
     * @param {AbortSignal} [options.signal] - 取消控制（可选）
     * @returns {Promise<void>} 成功时返回 Promise
     */
    agenticStream: async (options) => {
      if (!options || !options.prompt) {
        throw new Error("prompt is required");
      }
      if (!options.onText) {
        throw new Error("onText callback is required");
      }
      const { signal, onText, onError, prompt, systemPrompt } = options;
      return callApiStream("lingguang.ai.agenticStream", { prompt, systemPrompt }, { signal, onText, onError });
    },
    agentStream: async (options) => {
      if (!options || !options.prompt) {
        throw new Error("prompt is required");
      }
      if (!options.onText) {
        throw new Error("onText callback is required");
      }
      const { signal, onText, onError, prompt, sessionId } = options;
      return callApiStream("lingguang.ai.agentStream", { prompt, sessionId }, { signal, onText, onError });
    }
  },
  session: {
    sessionList: async (params) => {
      return callApi("lingguang.session.sessionList", { params: params || {} });
    },
    sessionDetail: async (params) => {
      if (!params || !params.sessionId) throw new Error("sessionId is required");
      return callApi("lingguang.session.sessionDetail", { params });
    },
    sessionDelete: async (params) => {
      if (!params || !params.sessionId) throw new Error("sessionId is required");
      return callApi("lingguang.session.sessionDelete", { params });
    }
  },
  chooseImage: async (options) => {
    return callApi("lingguang.chooseImage", { options });
  },
  takePhoto: async (options) => {
    return callApi("lingguang.takePhoto", { options });
  },
  saveImageToPhotosAlbum: async (options) => {
    return callApi("lingguang.saveImageToPhotosAlbum", { options });
  },
  uploadImage: async (options) => {
    return callApi("lingguang.uploadImage", { options });
  },
  getLocation: async (options) => {
    return callApi("lingguang.getLocation", { options });
  },
  chooseFile: async (options) => {
    return callApi("lingguang.chooseFile", { options });
  },
  uploadFile: async (options) => {
    return callApi("lingguang.uploadFile", { options });
  },
  parseFileText: async (options) => {
    if (!options || !options.fileId) {
      throw new Error("fileId is required");
    }
    return callApi("lingguang.fs.parseFileText", { params: options });
  },
  getFileText: async (options) => {
    if (!options || !options.runId) {
      throw new Error("runId is required");
    }
    return callApi("lingguang.fs.getFileText", { params: options });
  },
  saveFile: async (options) => {
    return callApi("lingguang.saveFile", { options });
  },
  readFile: async (options) => {
    return callApi("lingguang.readFile", { options });
  },
  vibrate: async (options) => {
    return callApi("lingguang.vibrate", { options });
  },
  startAccelerometer: async (options) => {
    return callApi("lingguang.startAccelerometer", { options });
  },
  stopAccelerometer: async () => {
    return callApi("lingguang.stopAccelerometer", {});
  },
  onAccelerometerChange: (callback) => {
    if (typeof callback !== "function") {
      throw new Error("callback is required");
    }
    if (!flashWindow._accelerometerCallbacks) {
      flashWindow._accelerometerCallbacks = /* @__PURE__ */ new Map();
    }
    const callbackId = `accelerometer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    flashWindow._accelerometerCallbacks.set(callbackId, callback);
  },
  startCompass: async (options) => {
    return callApi("lingguang.startCompass", { options });
  },
  stopCompass: async () => {
    return callApi("lingguang.stopCompass", {});
  },
  onCompassChange: (callback) => {
    if (typeof callback !== "function") {
      throw new Error("callback is required");
    }
    if (!flashWindow._compassCallbacks) {
      flashWindow._compassCallbacks = /* @__PURE__ */ new Map();
    }
    const callbackId = `compass_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    flashWindow._compassCallbacks.set(callbackId, callback);
  },
  startDeviceMotionListening: async (options) => {
    return callApi("lingguang.startDeviceMotionListening", { options });
  },
  stopDeviceMotionListening: async () => {
    return callApi("lingguang.stopDeviceMotionListening", {});
  },
  onDeviceMotionChange: (callback) => {
    if (typeof callback !== "function") {
      throw new Error("callback is required");
    }
    if (!flashWindow._deviceMotionCallbacks) {
      flashWindow._deviceMotionCallbacks = /* @__PURE__ */ new Map();
    }
    const callbackId = `devicemotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    flashWindow._deviceMotionCallbacks.set(callbackId, callback);
  },
  gyroscope: {
    start: async (options) => {
      if (!options || !options.onReading) {
        throw new Error("onReading callback is required");
      }
      if (!flashWindow._gyroscopeCallbacks) {
        flashWindow._gyroscopeCallbacks = /* @__PURE__ */ new Map();
      }
      const callbackId = `gyroscope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      flashWindow._gyroscopeCallbacks.set(callbackId, options.onReading);
      return callApi("lingguang.gyroscope.start", {
        options: {
          frequency: options.frequency || "high",
          callbackId
        }
      });
    },
    stop: async () => {
      return callApi("lingguang.gyroscope.stop", {});
    }
  },
  asr: {
    start: async (options) => {
      var _a;
      if (!options || !options.onText) {
        throw new Error("onText callback is required");
      }
      const sessionId = `asr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!flashWindow._asrCallbacks) {
        flashWindow._asrCallbacks = /* @__PURE__ */ new Map();
      }
      flashWindow._asrCallbacks.set(sessionId, {
        onText: options.onText,
        onError: options.onError,
        onEnd: options.onEnd
      });
      console.log("[FLASH APP] 存储回调函数，用于接收 ASR 结果事件", sessionId);
      try {
        console.log("[FLASH APP] before await callApi lingguang.asr.start", sessionId);
        await callApi("lingguang.asr.start", {
          options: {
            id: sessionId,
            lang: options.lang || "zh-CN",
            interim: options.interim !== false,
            continuous: options.continuous === true
          }
        });
        console.log("[FLASH APP] after await callApi lingguang.asr.start", sessionId);
      } catch (error) {
        console.log("[FLASH APP] callApi lingguang.asr.start 异常", sessionId);
        if (flashWindow._asrCallbacks) {
          flashWindow._asrCallbacks.delete(sessionId);
        }
        const asrError = {
          error: "unknown",
          message: getErrorMessage(error, "启动识别失败"),
          code: getErrorCode(error)
        };
        const errorMsg = getErrorMessage(error, "").toLowerCase();
        if (errorMsg.includes("permission") || errorMsg.includes("权限")) {
          asrError.error = "not-allowed";
        } else if (errorMsg.includes("device") || errorMsg.includes("设备")) {
          asrError.error = "audio-capture";
        } else if (errorMsg.includes("network") || errorMsg.includes("网络")) {
          asrError.error = "network";
        }
        throw new Error((_a = asrError.message) != null ? _a : "启动识别失败");
      }
    },
    stop: async () => {
      const asrCallbacks = flashWindow._asrCallbacks;
      if (!asrCallbacks || asrCallbacks.size === 0) {
        console.log("[FLASH APP] ASR stop: 没有活跃的识别会话");
        return;
      }
      const sessionId = asrCallbacks.keys().next().value;
      if (!sessionId) {
        return;
      }
      return callApi("lingguang.asr.stop", {
        options: {
          id: sessionId
        }
      });
    },
    abort: async () => {
      const asrCallbacks = flashWindow._asrCallbacks;
      if (!asrCallbacks || asrCallbacks.size === 0) {
        console.log("[FLASH APP] ASR abort: 没有活跃的识别会话");
        return;
      }
      const sessionId = asrCallbacks.keys().next().value;
      if (!sessionId) {
        return;
      }
      try {
        await callApi("lingguang.asr.abort", {
          options: {
            id: sessionId
          }
        });
        if (flashWindow._asrCallbacks) {
          flashWindow._asrCallbacks.delete(sessionId);
        }
      } catch (error) {
        if (flashWindow._asrCallbacks) {
          flashWindow._asrCallbacks.delete(sessionId);
        }
        throw error;
      }
    }
  },
  monitor: {
    event: async (options) => {
      return callApi("lingguang.monitor.event", { options });
    }
  }
};
const initializeCurrentRole = () => {
  window.currentRole = "USER";
  if (window.parent === window) {
    window.currentRoleReady = Promise.resolve("USER");
    return window.currentRoleReady;
  }
  window.currentRoleReady = Promise.race([
    window.lingguang.db.role().then((result) => {
      return result.role === "MANAGER" ? "MANAGER" : "USER";
    }),
    new Promise((resolve) => {
      window.setTimeout(() => resolve("USER"), 1e3);
    })
  ]).then((result) => {
    const role = result === "MANAGER" ? "MANAGER" : "USER";
    window.currentRole = role;
    return role;
  }).catch((error) => {
    console.log("[FLASH APP] 初始化 DB 角色失败，按 USER 处理", error);
    window.currentRole = "USER";
    return "USER";
  });
  return window.currentRoleReady;
};
void initializeCurrentRole();
window.callLLM = (prompt, systemPrompt, timeout) => {
  return callApi("lingguang.deprecated.callLLM", { prompt, systemPrompt, timeout });
};
const asyncAlertWindow = window;
asyncAlertWindow.alert = async (message) => {
  try {
    await callApi("lingguang.alert", { options: { message } });
  } catch (e) {
    console.log("[FLASH APP] alert 失败", e);
  }
};
const getCandyJarCallbacks = () => {
  if (!window._candyJarCallbacks) {
    window._candyJarCallbacks = {};
  }
  return window._candyJarCallbacks;
};
void getCandyJarCallbacks();
if (!window.CandyJar) {
  window.CandyJar = {
    call: function(method, action, params, successCallback, errorCallback, timeout = 2e4) {
      const callId = "candyJar_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const callbackMap = getCandyJarCallbacks();
      callbackMap[callId] = {
        resolve: (result) => {
          clearTimeout(timeoutId);
          delete callbackMap[callId];
          if (successCallback && typeof successCallback === "function") {
            const response = __spreadProps(__spreadValues({}, toRecordValue(result)), {
              success: true
            });
            successCallback(response);
          }
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          delete callbackMap[callId];
          if (errorCallback && typeof errorCallback === "function") {
            errorCallback(error);
          }
        }
      };
      const timeoutId = setTimeout(() => {
        if (callbackMap[callId]) {
          console.log("[FLASH APP] CandyJar 调用超时:", method, action);
          delete callbackMap[callId];
          if (errorCallback && typeof errorCallback === "function") {
            errorCallback(new Error("CandyJar call timeout"));
          }
        }
      }, timeout);
      const message = {
        type: "CANDYJAR_CALL",
        callId,
        method,
        action,
        params
      };
      console.log("[FLASH APP] 子iframe向主iframe发送消息:", JSON.stringify(message, null, 2));
      window.parent.postMessage(message, "*");
    }
  };
  window.addEventListener("message", function(event) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const messageData = toRecordValue(event.data);
    if (messageData.type === "CANDYJAR_CALLBACK") {
      const callId = toStringValue(messageData.callId);
      const success = messageData.success === true;
      const result = messageData.result;
      const errorMessage = toStringValue(messageData.error, "CandyJar call failed");
      const callbackMap = window._candyJarCallbacks;
      const promiseData = callId ? callbackMap == null ? void 0 : callbackMap[callId] : void 0;
      if (promiseData) {
        if (success) {
          console.log("[FLASH APP] CandyJar 调用成功:", callId, result);
          promiseData.resolve(result);
        } else {
          console.log("[FLASH APP] CandyJar 调用失败:", callId, errorMessage);
          promiseData.reject(new Error(errorMessage));
        }
        if (callbackMap && callId) {
          delete callbackMap[callId];
        }
      } else {
        console.log("[FLASH APP] 未找到对应的回调处理器（可能已经释放） for callId:", callId);
      }
    }
    if (messageData.type === "CANDYJAR_EVENT") {
      const eventType = toStringValue(messageData.eventType);
      const eventData = toRecordValue(messageData.eventData);
      if (!eventType) {
        return;
      }
      console.log("[FLASH APP] 接收到" + eventType + "类型的事件转发，数据:" + JSON.stringify(eventData, null, 2));
      if (eventType === "CandyJar.WebContainer.VisibilityChange") {
        const visibilityState = toVisibilityState(eventData.visibilityState);
        const avGuard = flashWindow.__AV_GUARD__;
        if (visibilityState === "hidden") {
          void ((_a = avGuard == null ? void 0 : avGuard.pauseAll) == null ? void 0 : _a.call(avGuard));
        } else if (visibilityState === "visible") {
          void ((_b = avGuard == null ? void 0 : avGuard.resumeAll) == null ? void 0 : _b.call(avGuard));
        }
      }
      const customEvent = new CustomEvent(eventType, {
        detail: eventData,
        // 直接传递序列化的事件数据
        bubbles: true,
        cancelable: true
      });
      const segmentId = toStringValue(eventData.segmentId);
      if (segmentId) customEvent.segmentId = segmentId;
      if (eventData.sentences !== void 0) customEvent.sentences = eventData.sentences;
      if (eventData.error !== void 0) customEvent.error = eventData.error;
      const htmlFragment = toStringValue(eventData.htmlFragment);
      if (htmlFragment) customEvent.htmlFragment = htmlFragment;
      const action = toStringValue(eventData.action);
      if (action) customEvent.action = action;
      const x = toNumberValue(eventData.x);
      if (x !== void 0) customEvent.x = x;
      const y = toNumberValue(eventData.y);
      if (y !== void 0) customEvent.y = y;
      const z = toNumberValue(eventData.z);
      if (z !== void 0) customEvent.z = z;
      const direction = toNumberValue(eventData.direction);
      if (direction !== void 0) customEvent.direction = direction;
      const alpha = toNumberValue(eventData.alpha);
      if (alpha !== void 0) customEvent.alpha = alpha;
      const beta = toNumberValue(eventData.beta);
      if (beta !== void 0) customEvent.beta = beta;
      const gamma = toNumberValue(eventData.gamma);
      if (gamma !== void 0) customEvent.gamma = gamma;
      const timestamp = toNumberValue(eventData.timestamp);
      if (timestamp !== void 0) customEvent.timestamp = timestamp;
      const id = toStringValue(eventData.id);
      if (id) customEvent.id = id;
      const speechState = toNumberValue(eventData.speechState);
      if (speechState !== void 0) customEvent.speechState = speechState;
      const errorCode = toNumberValue(eventData.errorCode);
      if (errorCode !== void 0) customEvent.errorCode = errorCode;
      const result = toPrimitiveString(eventData.result);
      if (result !== void 0) customEvent.result = result;
      if (eventData.isFinal !== void 0) customEvent.isFinal = eventData.isFinal === "1" || eventData.isFinal === true;
      const customVisibilityState = toVisibilityState(eventData.visibilityState);
      if (customVisibilityState) customEvent.visibilityState = customVisibilityState;
      if (eventType === "CandyJar.Sensor.onGyroscopeChange") {
        const gyroscopeCallbacks = flashWindow._gyroscopeCallbacks;
        if (gyroscopeCallbacks && gyroscopeCallbacks.size > 0) {
          const reading = {
            x: (_c = toNumberValue(eventData.x)) != null ? _c : 0,
            y: (_d = toNumberValue(eventData.y)) != null ? _d : 0,
            z: (_e = toNumberValue(eventData.z)) != null ? _e : 0,
            timestamp: (_f = toNumberValue(eventData.timestamp)) != null ? _f : 0
          };
          gyroscopeCallbacks.forEach((callback) => {
            try {
              callback(reading);
            } catch (e) {
              console.log("[FLASH APP] 陀螺仪回调执行失败:", e);
            }
          });
        }
      }
      if (eventType === "CandyJar.Sensor.onAccelerometerChange") {
        const accelerometerCallbacks = flashWindow._accelerometerCallbacks;
        if (accelerometerCallbacks && accelerometerCallbacks.size > 0) {
          const reading = {
            x: (_g = toNumberValue(eventData.x)) != null ? _g : 0,
            y: (_h = toNumberValue(eventData.y)) != null ? _h : 0,
            z: (_i = toNumberValue(eventData.z)) != null ? _i : 0
          };
          accelerometerCallbacks.forEach((callback) => {
            try {
              callback(reading);
            } catch (e) {
              console.log("[FLASH APP] 加速度回调执行失败:", e);
            }
          });
        }
      }
      if (eventType === "CandyJar.Sensor.onCompassChange") {
        const compassCallbacks = flashWindow._compassCallbacks;
        if (compassCallbacks && compassCallbacks.size > 0) {
          const reading = {
            direction: (_j = toNumberValue(eventData.direction)) != null ? _j : 0
          };
          compassCallbacks.forEach((callback) => {
            try {
              callback(reading);
            } catch (e) {
              console.log("[FLASH APP] 罗盘回调执行失败:", e);
            }
          });
        }
      }
      if (eventType === "CandyJar.Sensor.onDeviceMotionChange") {
        const deviceMotionCallbacks = flashWindow._deviceMotionCallbacks;
        if (deviceMotionCallbacks && deviceMotionCallbacks.size > 0) {
          const reading = {
            alpha: (_k = toNumberValue(eventData.alpha)) != null ? _k : 0,
            beta: (_l = toNumberValue(eventData.beta)) != null ? _l : 0,
            gamma: (_m = toNumberValue(eventData.gamma)) != null ? _m : 0
          };
          deviceMotionCallbacks.forEach((callback) => {
            try {
              callback(reading);
            } catch (e) {
              console.log("[FLASH APP] 设备方向回调执行失败:", e);
            }
          });
        }
      }
      if (eventType === "CandyJar.ASR.OnResult") {
        const asrCallbacks = flashWindow._asrCallbacks;
        if (asrCallbacks) {
          const sessionId = toStringValue(eventData.id);
          if (!sessionId) {
            console.log("[FLASH APP] ASR OnResult 事件缺少 sessionId");
            window.document.dispatchEvent(customEvent);
            return;
          }
          const callbacks = asrCallbacks.get(sessionId);
          if (callbacks) {
            const errorCode2 = toStringValue(eventData.errorCode);
            const result2 = toPrimitiveString(eventData.result);
            const isFinal = eventData.isFinal === "1" || eventData.isFinal === true;
            const speechState2 = toStringValue(eventData.speechState);
            if (errorCode2 && errorCode2 !== "0" && errorCode2 !== "38") {
              const asrError = {
                error: "unknown",
                message: "识别过程出错",
                fatal: true,
                sessionId,
                code: errorCode2
              };
              if (errorCode2 === "40") {
                asrError.error = "no-speech";
                asrError.message = "未检测到语音，录音已终止";
              }
              try {
                if (callbacks.onError) {
                  callbacks.onError(asrError);
                }
              } catch (e) {
                console.log("[FLASH APP] ASR onError 回调执行失败:", e);
              }
              try {
                if (callbacks.onEnd) {
                  callbacks.onEnd("error", sessionId);
                }
              } catch (e) {
                console.log("[FLASH APP] ASR onEnd 回调执行失败:", e);
              }
              asrCallbacks.delete(sessionId);
              return;
            }
            if (result2 !== void 0) {
              try {
                callbacks.onText({
                  text: result2,
                  sessionId,
                  isFinal
                });
              } catch (e) {
                console.log("[FLASH APP] ASR onText 回调执行失败:", e);
              }
            }
            if (isFinal || speechState2 === "cancel") {
              try {
                if (callbacks.onEnd) {
                  callbacks.onEnd("stop", sessionId);
                }
              } catch (e) {
                console.log("[FLASH APP] ASR onEnd 回调执行失败:", e);
              }
              asrCallbacks.delete(sessionId);
            }
          } else {
            console.log("[FLASH APP] ASR OnResult 事件未找到对应的回调，sessionId:", sessionId);
          }
        }
      }
      window.document.dispatchEvent(customEvent);
    }
  });
  console.log("[FLASH APP] iframe CandyJar 已初始化为 postMessage 通信");
}
(function() {
  let lastHeight = 0;
  let isDebouncing = false;
  const isInIframe = window.self !== window.top;
  function sendHeightToParent() {
    if (!isInIframe) return;
    const height = Math.max(document.body.offsetHeight, document.body.scrollHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
    if (height !== lastHeight) {
      window.parent.postMessage(
        {
          type: "miniapp_resize",
          height,
          timestamp: Date.now()
        },
        "*"
      );
      console.log("[FLASH APP] 发送高度信息:", height, "(上次:", lastHeight, ")");
      lastHeight = height;
    }
  }
  function debouncedSendHeight() {
    if (isDebouncing) return;
    isDebouncing = true;
    setTimeout(() => {
      sendHeightToParent();
      isDebouncing = false;
    }, 150);
  }
  window.addEventListener("message", function(event) {
    const eventData = toRecordValue(event.data);
    if (eventData.type === "checkHeight") {
      sendHeightToParent();
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      sendHeightToParent();
    });
  } else {
    sendHeightToParent();
  }
  window.addEventListener("resize", debouncedSendHeight);
  const observer = new MutationObserver(debouncedSendHeight);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"]
  });
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(debouncedSendHeight);
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);
  }
})();
(function() {
  const isInIframe = window.self !== window.top;
  if (!isInIframe) {
    return;
  }
  if (flashWindow._canvasDetectionInitialized) {
    return;
  }
  flashWindow._canvasDetectionInitialized = true;
  const DETECTION_WINDOW_MS = 5e3;
  let detectionActive = false;
  let hasNotified = false;
  let observer = null;
  let stopTimer = null;
  let checkScheduled = false;
  function stopDetection() {
    detectionActive = false;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    console.log("[FLASH APP] canvas 检测窗口已结束");
  }
  function notifyCanvasDetected() {
    if (hasNotified) {
      return;
    }
    hasNotified = true;
    window.parent.postMessage(
      {
        type: "FLASH_APP_CANVAS_DETECTED",
        hasCanvas: true,
        artifactId: window.artifactId,
        artifactVersion: window.artifactVersion,
        timestamp: Date.now()
      },
      "*"
    );
    console.log("[FLASH APP] 检测到 canvas，已通知上层");
    stopDetection();
  }
  function checkCanvasPresence() {
    if (!detectionActive || hasNotified) {
      return;
    }
    try {
      if (document.querySelector("canvas")) {
        notifyCanvasDetected();
      }
    } catch (e) {
      console.log("[FLASH APP] canvas 检测失败", e);
    }
  }
  function scheduleCheck() {
    if (!detectionActive || checkScheduled) {
      return;
    }
    checkScheduled = true;
    setTimeout(() => {
      checkScheduled = false;
      checkCanvasPresence();
    }, 0);
  }
  function startDetection() {
    if (detectionActive) {
      return;
    }
    detectionActive = true;
    checkCanvasPresence();
    const observeTarget = document.body || document.documentElement;
    if (observeTarget) {
      observer = new MutationObserver(scheduleCheck);
      observer.observe(observeTarget, {
        childList: true,
        subtree: true
      });
    }
    stopTimer = window.setTimeout(() => {
      stopDetection();
    }, DETECTION_WINDOW_MS);
  }
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function() {
        startDetection();
      },
      { once: true }
    );
  } else {
    startDetection();
  }
})();
(function() {
  if (flashWindow._safeAreaVisibilityGuardInitialized) {
    return;
  }
  flashWindow._safeAreaVisibilityGuardInitialized = true;
  const SAFE_AREA_ID = "safe-area";
  const HEIGHT_THRESHOLD = 667;
  const HIDDEN_MARKER_ATTR = "data-flash-app-hidden-by-height";
  const ORIGINAL_DISPLAY_ATTR = "data-flash-app-original-display";
  let rafId = null;
  let resizeObserver = null;
  let mutationObserver = null;
  let observedContainer = null;
  const getAppContainer = () => {
    return document.getElementById("app") || document.getElementById("root") || document.getElementById("app-root") || document.getElementById("full-component");
  };
  const getAppContainerHeight = () => {
    const container = getAppContainer();
    if (container && container.clientHeight > 0) {
      return container.clientHeight;
    }
    if (window.visualViewport && Number.isFinite(window.visualViewport.height) && window.visualViewport.height > 0) {
      return Math.round(window.visualViewport.height);
    }
    if (document.documentElement && document.documentElement.clientHeight > 0) {
      return document.documentElement.clientHeight;
    }
    return window.innerHeight > 0 ? window.innerHeight : 0;
  };
  const hideSafeArea = (element) => {
    if (element.getAttribute(HIDDEN_MARKER_ATTR) === "1") {
      return;
    }
    element.setAttribute(HIDDEN_MARKER_ATTR, "1");
    element.setAttribute(ORIGINAL_DISPLAY_ATTR, element.style.display || "");
    element.style.display = "none";
  };
  const showSafeArea = (element) => {
    if (element.getAttribute(HIDDEN_MARKER_ATTR) !== "1") {
      return;
    }
    const originalDisplay = element.getAttribute(ORIGINAL_DISPLAY_ATTR);
    element.style.display = originalDisplay || "";
    element.removeAttribute(HIDDEN_MARKER_ATTR);
    element.removeAttribute(ORIGINAL_DISPLAY_ATTR);
  };
  const applySafeAreaVisibility = () => {
    const safeAreaElement = document.getElementById(SAFE_AREA_ID);
    if (!safeAreaElement) {
      return;
    }
    const containerHeight = getAppContainerHeight();
    if (containerHeight > 0 && containerHeight < HEIGHT_THRESHOLD) {
      hideSafeArea(safeAreaElement);
      return;
    }
    showSafeArea(safeAreaElement);
  };
  const ensureContainerObserved = () => {
    if (!resizeObserver) {
      return;
    }
    const container = getAppContainer();
    if (!container) {
      return;
    }
    if (observedContainer && observedContainer !== container) {
      resizeObserver.unobserve(observedContainer);
    }
    if (observedContainer !== container) {
      resizeObserver.observe(container);
      observedContainer = container;
    }
  };
  const scheduleApply = () => {
    if (rafId !== null) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      ensureContainerObserved();
      applySafeAreaVisibility();
    });
  };
  const setupObservers = () => {
    window.addEventListener("resize", scheduleApply);
    window.addEventListener("orientationchange", scheduleApply);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleApply);
    }
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(scheduleApply);
      if (document.documentElement) {
        resizeObserver.observe(document.documentElement);
      }
      if (document.body) {
        resizeObserver.observe(document.body);
      }
      ensureContainerObserved();
    }
    mutationObserver = new MutationObserver(scheduleApply);
    if (document.documentElement) {
      mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  };
  const init = () => {
    applySafeAreaVisibility();
    setupObservers();
  };
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        init();
      },
      { once: true }
    );
  } else {
    init();
  }
})();
let directScrollDisabled = false;
window.addEventListener("message", function(event) {
  const eventData = toRecordValue(event.data);
  const eventType = toStringValue(eventData.type);
  if (eventType === "DISABLE_DIRECT_SCROLL" || eventType === "ENABLE_DIRECT_SCROLL") {
    directScrollDisabled = eventType === "DISABLE_DIRECT_SCROLL";
    flashWindow.__directScrollDisabled = directScrollDisabled;
    console.log("[FLASH APP] 直接滚动状态变更:", directScrollDisabled ? "已禁用" : "已启用");
    if (directScrollDisabled) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.documentElement.style.touchAction = "none";
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.documentElement.style.touchAction = "";
      document.documentElement.style.height = "";
      document.body.style.height = "";
    }
  }
  if (eventType === "SCROLL_TO_PERCENTAGE") {
    const percentage = toNumberValue(eventData.percentage);
    const behaviorRaw = toStringValue(eventData.behavior, "auto");
    const behavior = behaviorRaw === "smooth" ? "smooth" : "auto";
    if (percentage === void 0) {
      console.log("[FLASH APP] 滚动控制：无效的 percentage 参数");
      return;
    }
    try {
      const bodyElement = document.body;
      const scrollHeight = bodyElement.scrollHeight;
      const clientHeight = bodyElement.clientHeight;
      if (scrollHeight <= clientHeight) {
        bodyElement.scrollTo({
          top: 0,
          behavior
        });
        console.log("[FLASH APP] 滚动控制：内容无滚动条，已滚动到顶部");
        return;
      }
      const maxScrollTop = scrollHeight - clientHeight;
      if (maxScrollTop <= 0) {
        bodyElement.scrollTo({
          top: 0,
          behavior
        });
        console.log("[FLASH APP] 滚动控制：maxScrollTop <= 0，已滚动到顶部");
        return;
      }
      const percent = Math.max(0, Math.min(100, percentage));
      const targetScrollTop = Math.round(percent / 100 * maxScrollTop);
      const finalScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
      bodyElement.scrollTo({
        top: finalScrollTop,
        behavior
      });
      console.log("[FLASH APP] 滚动控制：已滚动到", percent + "%", "位置 (scrollTop:", finalScrollTop + ")", {
        percentage: percent,
        scrollHeight,
        clientHeight,
        maxScrollTop,
        finalScrollTop,
        behavior
      });
    } catch (error) {
      console.log("[FLASH APP] 滚动执行失败:", error);
    }
  }
});
try {
  if (document.documentElement) {
    const htmlStyle = window.getComputedStyle(document.documentElement);
    if (htmlStyle.overflow === "hidden") {
      document.documentElement.style.overflow = "visible";
    }
  }
  if (document.body) {
    const bodyStyle = window.getComputedStyle(document.body);
    if (bodyStyle.overflow === "hidden") {
      document.body.style.overflow = "visible";
    }
  }
} catch (e) {
  console.log("[FLASH APP] 移除 overflow 属性失败:", e);
}
(function() {
  if (flashWindow._linkClickProxyInitialized) {
    return;
  }
  flashWindow._linkClickProxyInitialized = true;
  function handleLinkClick(event) {
    const target = event.target;
    if (!target || !(target instanceof HTMLAnchorElement)) {
      return;
    }
    const href = target.getAttribute("href");
    if (!href) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    console.log("[FLASH APP] 拦截到链接点击:", href);
    window.lingguang.navigate.to({ url: href }).catch((error) => {
      console.log("[FLASH APP] 链接跳转失败", error);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      document.addEventListener("click", handleLinkClick, true);
      console.log("[FLASH APP] 全局链接点击代理已初始化");
    });
  } else {
    document.addEventListener("click", handleLinkClick, true);
    console.log("[FLASH APP] 全局链接点击代理已初始化");
  }
})();
(function() {
  let scriptLoadPromise = null;
  async function loadMap() {
    console.log("[FLASH APP] 开始加载高德地图");
    const key = "";
    const securityJsCode = "";
    const version = "2.3.5.4";
    window._AMapSecurityConfig = {
      securityJsCode
    };
    console.log("[FLASH APP] 已设置高德地图安全配置");
    console.log("[FLASH APP] 检查并确保脚本已加载");
    await ensureScriptLoaded();
    console.log("[FLASH APP] 脚本加载完成");
    console.log("[FLASH APP] 等待 AMapLoader 可用");
    await waitForAMapLoader();
    console.log("[FLASH APP] AMapLoader 已可用");
    console.log("[FLASH APP] 调用 AMapLoader.load，版本:", version);
    try {
      if (!window.AMapLoader) {
        throw new Error("AMapLoader is not available");
      }
      const result = await window.AMapLoader.load({
        key,
        version
      });
      console.log("[FLASH APP] 高德地图加载成功");
      return result;
    } catch (error) {
      console.log("[FLASH APP] 高德地图加载失败:", error);
      throw error;
    }
  }
  function ensureScriptLoaded() {
    if (window.AMapLoader && typeof window.AMapLoader.load === "function") {
      console.log("[FLASH APP] 脚本已存在且 AMapLoader 可用，跳过加载");
      return Promise.resolve();
    }
    if (scriptLoadPromise) {
      console.log("[FLASH APP] 脚本正在加载中，等待现有加载完成");
      return scriptLoadPromise;
    }
    const scriptId = "amap-loader-script";
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      console.log("[FLASH APP] 脚本标签已存在，等待 AMapLoader 可用");
      scriptLoadPromise = waitForAMapLoader().then(() => {
        scriptLoadPromise = null;
      });
      return scriptLoadPromise;
    }
    console.log("[FLASH APP] 开始创建并加载高德地图脚本");
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://webapi.amap.com/loader.js";
      script.async = true;
      script.onload = () => {
        console.log("[FLASH APP] 脚本文件加载成功，等待 AMapLoader 初始化");
        waitForAMapLoader().then(() => {
          console.log("[FLASH APP] AMapLoader 初始化完成");
          scriptLoadPromise = null;
          resolve();
        }).catch((e) => {
          console.log("[FLASH APP] AMapLoader 初始化失败:", e);
          scriptLoadPromise = null;
          reject(e instanceof Error ? e : new Error(getErrorMessage(e, "[FLASH APP] AMapLoader 初始化失败")));
        });
      };
      script.onerror = () => {
        console.log("[FLASH APP] 脚本文件加载失败");
        scriptLoadPromise = null;
        reject(new Error("[FLASH APP] 高德地图脚本加载失败"));
      };
      document.head.appendChild(script);
    });
    return scriptLoadPromise;
  }
  function waitForAMapLoader() {
    return new Promise((resolve, reject) => {
      if (window.AMapLoader && typeof window.AMapLoader.load === "function") {
        console.log("[FLASH APP] AMapLoader 已可用，无需等待");
        resolve();
        return;
      }
      console.log("[FLASH APP] 开始轮询等待 AMapLoader 可用（最多等待 10 秒）");
      let attempts = 0;
      const maxAttempts = 100;
      const interval = 100;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.AMapLoader && typeof window.AMapLoader.load === "function") {
          clearInterval(checkInterval);
          console.log("[FLASH APP] AMapLoader 已可用，等待了", attempts * interval, "ms");
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.log("[FLASH APP] 等待 AMapLoader 超时，已尝试", attempts, "次");
          reject(new Error("[FLASH APP] 等待 AMapLoader 超时"));
        }
      }, interval);
    });
  }
  window.loadMap = loadMap;
})();
(function() {
  if (window._clickLoggerInitialized) {
    return;
  }
  window._clickLoggerInitialized = true;
  if (!window._flashAppSessionId) {
    window._flashAppSessionId = "flash-app-session-" + Date.now();
  }
  const sessionId = window._flashAppSessionId;
  function findElementWithTestId(element) {
    let current = element;
    while (current && current !== document.documentElement) {
      if (current.hasAttribute && current.hasAttribute("data-testid")) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
  async function logClick(element, _event) {
    const testId = element.getAttribute("data-testid");
    const logData = {
      type: "flash-app-use-click",
      testId,
      tagName: element.tagName,
      timestamp: Date.now(),
      artifactId: window.artifactId || "",
      artifactVersion: window.artifactVersion || "",
      sessionId
    };
    console.log("[FLASH APP] 点击日志", logData);
    try {
      await window.lingguang.monitor.event({
        rawLog: JSON.stringify(logData)
      }).catch((error) => {
        console.log("[FLASH APP] 点击日志上报失败", error);
      });
    } catch (e) {
      console.log("[FLASH APP] 点击日志上报异常", e);
    }
  }
  async function logLoadSuccess() {
    const logData = {
      type: "flash-app-use-load",
      timestamp: Date.now(),
      artifactId: window.artifactId || "",
      artifactVersion: window.artifactVersion || "",
      sessionId
    };
    console.log("[FLASH APP] 加载成功日志", logData);
    try {
      await window.lingguang.monitor.event({
        rawLog: JSON.stringify(logData)
      }).then(() => {
        console.log("[FLASH APP] [加载日志] 加载成功日志上报成功");
      }).catch((error) => {
        console.log("[FLASH APP] [加载日志] 加载成功日志上报失败", error);
      });
    } catch (e) {
      console.log("[FLASH APP] [加载日志] 加载成功日志上报异常", e);
    }
  }
  function handleGlobalClick(event) {
    const target = event.target;
    if (!target || !(target instanceof Element)) {
      return;
    }
    const elementWithTestId = findElementWithTestId(target);
    if (elementWithTestId) {
      void logClick(elementWithTestId);
    }
  }
  function handleWindowLoad() {
    void logLoadSuccess();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      document.addEventListener("click", handleGlobalClick, true);
      console.log("[FLASH APP] [点击日志] 全局点击监听器已初始化");
    });
  } else {
    document.addEventListener("click", handleGlobalClick, true);
    console.log("[FLASH APP] [点击日志] 全局点击监听器已初始化");
  }
  if (document.readyState === "complete") {
    void logLoadSuccess();
    console.log("[FLASH APP] [加载日志] 页面已加载完成，立即上报加载成功日志");
  } else {
    window.addEventListener("load", handleWindowLoad);
    console.log("[FLASH APP] [加载日志] 已注册 window.load 事件监听器");
  }
})();
if (typeof document !== "undefined") {
  const keywords = ["习近平", "习大大", "中国国家主席", "习维尼"];
  document.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLElement && el.isContentEditable) {
        const text = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : el.textContent || "";
        let next = text;
        for (const k of keywords) {
          if (!k) continue;
          if (next.includes(k)) {
            next = next.split(k).join("");
          }
        }
        if (next !== text) {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.value = next;
          } else {
            el.textContent = next;
          }
        }
      }
    },
    true
  );
}
(function() {
  if (window._errorHandlerInitialized) {
    return;
  }
  window._errorHandlerInitialized = true;
  async function sendErrorLog(errorInfo) {
    const logData = __spreadProps(__spreadValues({
      type: "flash-app-error"
    }, errorInfo), {
      timestamp: Date.now(),
      artifactId: window.artifactId || "",
      artifactVersion: window.artifactVersion || "",
      traceId: window.trace_id || "",
      sessionId: window._flashAppSessionId || ""
    });
    console.log("[FLASH APP] 错误日志", logData);
    try {
      const message = {
        type: "flash-app-error",
        payload: logData
      };
      window.parent.postMessage(message, "*");
    } catch (e) {
      console.log("[FLASH APP] 错误日志消息发送失败", e);
    }
    try {
      await window.lingguang.monitor.event({
        rawLog: JSON.stringify(logData)
      }).catch((error) => {
        console.log("[FLASH APP] 错误日志上报失败", error);
      });
    } catch (e) {
      console.log("[FLASH APP] 错误日志上报异常", e);
    }
  }
  window.addEventListener("error", function(event) {
    void sendErrorLog({
      message: event.message || "Unknown error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: getErrorStack(event.error),
      errorType: "error"
    });
  });
  window.addEventListener("unhandledrejection", function(event) {
    const reason = event.reason;
    const reasonRecord = toRecordValue(reason);
    let message = "Unhandled promise rejection";
    const reasonMessage = toStringValue(reasonRecord.message);
    if (reasonMessage) {
      message = reasonMessage;
    } else if (typeof reason === "string") {
      message = reason;
    } else if (reason && typeof reason === "object") {
      try {
        message = JSON.stringify(reason);
      } catch (e) {
        message = "Unhandled promise rejection (non-serializable reason)";
      }
    }
    void sendErrorLog({
      message,
      stack: getErrorStack(reason),
      errorType: "unhandledrejection"
    });
  });
  console.log("[FLASH APP] 全局错误监听器已初始化");
})();
(() => {
  const opts = {
    enabled: true,
    pauseWhenHidden: true,
    resumeWhenVisible: true,
    // 只影响 WebAudio：visible 时是否 resume AudioContext
    debug: false,
    // 可选：对某些 URL 不生效，返回 true 则跳过
    // skipIf: (url) => /\/no-audio-guard\//.test(url),
    skipIf: null
  };
  const state = {
    audioContexts: /* @__PURE__ */ new Set(),
    mediaElements: /* @__PURE__ */ new Set(),
    pausing: false,
    resuming: false,
    installed: false
  };
  const log = (...a) => opts.debug && console.log("[AV_GUARD]", ...a);
  function shouldSkip() {
    if (typeof opts.skipIf === "function") {
      try {
        return !!opts.skipIf(String(location.href));
      } catch (e) {
      }
    }
    return false;
  }
  function pauseAllMediaElements() {
    const list = document.querySelectorAll("audio,video");
    for (const m of list) {
      try {
        m.pause();
      } catch (e) {
      }
    }
    if (list.length) log("paused media elements:", list.length);
  }
  function trackMediaElement(el) {
    const media = el;
    if (media.__AV_GUARD_TRACKED__) return;
    media.__AV_GUARD_TRACKED__ = true;
    const add = () => state.mediaElements.add(el);
    const remove = () => state.mediaElements.delete(el);
    el.addEventListener("play", add);
    el.addEventListener("playing", add);
    el.addEventListener("pause", remove);
    el.addEventListener("ended", remove);
    el.addEventListener("abort", remove);
    el.addEventListener("emptied", remove);
    if (!el.paused) state.mediaElements.add(el);
  }
  function pauseTrackedMediaElements() {
    const list = Array.from(state.mediaElements);
    if (!list.length) return;
    for (const m of list) {
      try {
        m.pause();
      } catch (e) {
      }
    }
    log("paused tracked media elements:", list.length);
  }
  function hookAudioContext() {
    const win = window;
    const Native = win.AudioContext || win.webkitAudioContext;
    if (!Native) return;
    if (Native.__AV_GUARD_WRAPPED__) return;
    const WrappedAudioContext = function(...args) {
      const ctx = new Native(...args);
      state.audioContexts.add(ctx);
      log("AudioContext created:", ctx.state);
      const origClose = ctx.close.bind(ctx);
      ctx.close = async () => {
        state.audioContexts.delete(ctx);
        return origClose();
      };
      return ctx;
    };
    WrappedAudioContext.prototype = Native.prototype;
    WrappedAudioContext.__AV_GUARD_WRAPPED__ = true;
    if (win.AudioContext) win.AudioContext = WrappedAudioContext;
    if (win.webkitAudioContext) win.webkitAudioContext = WrappedAudioContext;
  }
  function hookAudioConstructor() {
    const win = window;
    const Native = win.Audio;
    if (!Native) return;
    if (Native.__AV_GUARD_WRAPPED__) return;
    const WrappedAudio = function(...args) {
      const el = new Native(...args);
      trackMediaElement(el);
      return el;
    };
    WrappedAudio.prototype = Native.prototype;
    WrappedAudio.__AV_GUARD_WRAPPED__ = true;
    win.Audio = WrappedAudio;
  }
  async function suspendAllAudioContexts() {
    const list = Array.from(state.audioContexts);
    if (!list.length) return;
    log("suspend contexts:", list.length);
    await Promise.allSettled(
      list.map(async (ctx) => {
        try {
          await ctx.suspend();
        } catch (e) {
        }
      })
    );
  }
  async function resumeAllAudioContexts() {
    const list = Array.from(state.audioContexts);
    if (!list.length) return;
    log("resume contexts:", list.length);
    await Promise.allSettled(
      list.map(async (ctx) => {
        try {
          await ctx.resume();
        } catch (e) {
        }
      })
    );
  }
  async function pauseAll() {
    if (!opts.enabled || shouldSkip()) return;
    if (state.pausing) return;
    state.pausing = true;
    try {
      pauseAllMediaElements();
      pauseTrackedMediaElements();
      await suspendAllAudioContexts();
    } finally {
      state.pausing = false;
    }
  }
  async function resumeAll() {
    if (!opts.enabled || shouldSkip()) return;
    if (!opts.resumeWhenVisible) return;
    if (state.resuming) return;
    state.resuming = true;
    try {
      await resumeAllAudioContexts();
    } finally {
      state.resuming = false;
    }
  }
  function onVisibilityChange() {
    if (!opts.enabled || shouldSkip()) return;
    const hidden = document.hidden === true;
    log("visibilitychange:", { hidden, vis: document.visibilityState });
    if (hidden) {
      if (opts.pauseWhenHidden) void pauseAll();
    } else {
      void resumeAll();
    }
  }
  function install() {
    if (state.installed) return;
    state.installed = true;
    hookAudioContext();
    hookAudioConstructor();
    document.addEventListener("visibilitychange", onVisibilityChange, true);
    window.addEventListener(
      "pagehide",
      () => {
        void pauseAll();
      },
      true
    );
    window.addEventListener(
      "pageshow",
      () => {
        void resumeAll();
      },
      true
    );
    if (document.hidden && opts.pauseWhenHidden) void pauseAll();
    log("installed");
  }
  Object.defineProperty(window, "__AV_GUARD__", {
    value: {
      pauseAll,
      resumeAll,
      setOptions: (o) => {
        if (o) Object.assign(opts, o);
      },
      getOptions: () => __spreadValues({}, opts),
      enable: () => {
        opts.enabled = true;
        onVisibilityChange();
      },
      disable: () => {
        opts.enabled = false;
      }
    },
    configurable: false,
    enumerable: false,
    writable: false
  });
  install();
})();
