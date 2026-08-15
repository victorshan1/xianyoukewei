/**
 * 全局类型声明文件
 * 扩展 Window 接口，添加 lingguang 相关的类型定义
 */

declare global {
  /**
   * DB 绑定参数类型
   */
  type BindValue = null | string | number | boolean | Date;

  /**
   * DB 请求参数
   */
  type DbReq = {
    /**
     * SQL 语句，仅支持 `?` 占位符
     */
    sql: string;
    /**
     * 与 `?` 一一对应的绑定参数数组
     */
    binds?: BindValue[];
    /**
     * 超时控制（毫秒）
     */
    timeoutMs?: number;
    /**
     * 取消控制（可选）
     */
    signal?: AbortSignal;
  };

  /**
   * DB 查询返回结构
   */
  type DbQueryResult<T = Record<string, any>> = {
    success: boolean;
    data: T[];
    message?: string;
  };

  /**
   * DB 执行返回结构
   */
  type DbExecuteResult = {
    success: boolean;
    data: {
      rowsAffected: number;
      lastInsertId?: number | string;
    };
    message?: string;
  };

  type DbRoleResult = {
    role?: 'MANAGER' | 'USER';
  };

  type DbRuntimeRole = 'MANAGER' | 'USER';

  /**
   * Service 请求体
   */
  type ServiceRequest = {
    method: string;
    path: string;
    query?: Record<string, string | string[]>;
    headers?: HeadersInit;
    body?: string | null;
    signal?: AbortSignal;
  };

  /**
   * Service 响应体
   */
  type ServiceResponse = {
    status: number;
    headers?: HeadersInit;
    body?: string | null;
  };

  type LingguangWeatherInclude = 'realtime' | 'daily' | 'hourly' | 'lifeIndex';

  type LingguangWeatherLocation =
    | string
    | {
        province?: string;
        city: string;
        district?: string;
        longitude?: number;
        latitude?: number;
      };

  type LingguangWeatherOptions = {
    location: LingguangWeatherLocation;
    include?: LingguangWeatherInclude[];
    forecastDays?: 1 | 3 | 7 | 15;
    hourlyHours?: 0 | 24 | 48;
    timeout?: number;
  };

  type LingguangWeatherRealtime = {
    date?: string;
    condition: string;
    temperatureC: number | null;
    tempHighC?: number | null;
    tempLowC?: number | null;
    feelsLikeC?: number | null;
    humidityPercent?: number | null;
    windDirection?: string;
    windLevel?: string;
    windSpeedMps?: number | null;
    visibilityMeters?: number | null;
    pressureHpa?: number | null;
    uvIndex?: number | null;
    uvLevel?: string;
    dewPointC?: number | null;
    sunrise?: string;
    sunset?: string;
    observationTime?: string;
    travelReminder?: string;
    pm25Level?: string;
    pm25Aqi?: number | null;
    precipitationProbabilityPercent?: number | null;
  };

  type LingguangWeatherDailyForecast = {
    date: string;
    weekday?: string;
    conditionDay: string;
    conditionNight?: string;
    tempHighC: number | null;
    tempLowC: number | null;
    windDirectionDay?: string;
    windDirectionNight?: string;
    windLevelDay?: string;
    windLevelNight?: string;
    humidityPercent?: number | null;
    humidityNightPercent?: number | null;
    precipitationProbabilityPercent?: number | null;
    pm25Level?: string;
    pm25Aqi?: number | null;
    iconDay?: string;
    iconNight?: string;
  };

  type LingguangWeatherHourlyForecast = {
    time: string;
    hour: number | null;
    condition: string;
    temperatureC: number | null;
    humidityPercent?: number | null;
    windDirection?: string;
    windLevel?: string;
    rainProbabilityPercent?: number | null;
    precipitationMm?: number | null;
    qpfMm?: number | null;
    visibilityMeters?: number | null;
    uvIndex?: number | null;
    pm25Level?: string;
    pm25Aqi?: number | null;
    isNow?: boolean;
  };

  type LingguangWeatherLifeIndex = {
    date?: string;
    type: string;
    typeId?: string | number;
    value?: string;
    level?: string;
    levelDesc?: string;
    description?: string;
    detail?: string;
  };

  type LingguangWeatherResult = {
    location: {
      country?: string;
      province?: string;
      city: string;
      district?: string;
    };
    updatedAt?: string;
    realtime?: LingguangWeatherRealtime;
    dailyForecast: LingguangWeatherDailyForecast[];
    hourlyForecast: LingguangWeatherHourlyForecast[];
    lifeIndex: LingguangWeatherLifeIndex[];
    traceId?: string;
  };

  type LingguangExchangeRateOptions = {
    from: string;
    to: string;
    amount?: number;
    timeout?: number;
  };

  type LingguangExchangeRateResult = {
    from: string;
    to: string;
    title: string;
    rate: number | null;
    inverseRate: number | null;
    amount?: number;
    convertedAmount?: number | null;
    updateTime?: string;
    changeRatePercent?: number | null;
    changeValue?: number | null;
    traceId?: string;
  };

  type LingguangStockMarket = 'CN' | 'HK' | 'US';
  type LingguangStockPeriod = '1d' | '1w' | '1mo';

  type LingguangStockPriceOptions = {
    symbol?: string;
    name?: string;
    market?: LingguangStockMarket;
    recentDays?: number;
    timeout?: number;
  };

  type LingguangStockCandlestickOptions = {
    symbol?: string;
    name?: string;
    market?: LingguangStockMarket;
    period?: LingguangStockPeriod;
    startDate?: string;
    endDate?: string;
    range?: string;
    lookback?: string;
    count?: number;
    timeout?: number;
  };

  type LingguangStockInstrument = {
    name: string;
    symbol: string;
    market: string;
    currency?: string;
    period?: string;
    periodLabel?: string;
    tradeStatus?: string;
    startDate?: string;
    endDate?: string;
  };

  type LingguangStockQuoteData = {
    date: string;
    openPrice: number | null;
    highPrice: number | null;
    lowPrice: number | null;
    closePrice: number | null;
    previousClosePrice?: number | null;
    priceChange?: number | null;
    priceChangePercent?: number | null;
    volume?: number | null;
    amount?: number | null;
  };

  type LingguangStockPriceResult = {
    instrument: LingguangStockInstrument;
    latest: LingguangStockQuoteData | null;
    recentCandles: LingguangStockQuoteData[];
    traceId?: string;
  };

  type LingguangStockCandlestickResult = {
    instrument: LingguangStockInstrument;
    latest: LingguangStockQuoteData | null;
    candles: LingguangStockQuoteData[];
    traceId?: string;
  };

  type LingguangPreciousMetal = 'gold' | 'silver' | 'platinum';
  type LingguangPreciousMetalMarket = 'SGE' | 'LBMA';
  type LingguangPreciousMetalPeriod = '1d' | '1w' | '1mo';

  type LingguangPreciousMetalPriceOptions = {
    metal?: LingguangPreciousMetal;
    symbol?: string;
    market?: LingguangPreciousMetalMarket;
    period?: LingguangPreciousMetalPeriod;
    startDate?: string;
    endDate?: string;
    count?: number;
    timeout?: number;
  };

  type LingguangPreciousMetalInstrument = {
    name: string;
    symbol: string;
    market: string;
    metal?: LingguangPreciousMetal;
    currency?: string;
    unit?: string;
    period?: string;
    periodLabel?: string;
    startDate?: string;
    endDate?: string;
  };

  type LingguangPreciousMetalQuoteData = {
    date: string;
    openPrice: number | null;
    highPrice: number | null;
    lowPrice: number | null;
    closePrice: number | null;
    previousClosePrice?: number | null;
    priceChange?: number | null;
    priceChangePercent?: number | null;
    volume?: number | null;
    amount?: number | null;
  };

  type LingguangPreciousMetalPriceResult = {
    instrument: LingguangPreciousMetalInstrument;
    latest: LingguangPreciousMetalQuoteData | null;
    candles: LingguangPreciousMetalQuoteData[];
    traceId?: string;
  };

  /**
   * 传感器监听频率
   */
  type SensorInterval = 'game' | 'ui' | 'normal';

  /**
   * 加速度数据
   */
  interface AccelerometerReading {
    /**
     * x 轴加速度值，单位 m/s²
     */
    x: number;
    /**
     * y 轴加速度值，单位 m/s²
     */
    y: number;
    /**
     * z 轴加速度值，单位 m/s²
     */
    z: number;
  }

  /**
   * 加速度监听配置
   */
  interface AccelerometerStartOptions {
    /**
     * 监听频率，默认值为 'normal'
     */
    interval?: SensorInterval;
  }

  /**
   * 设备方向数据
   */
  interface DeviceMotionReading {
    /**
     * 绕 Z 轴旋转角（单位：度），范围 [0, 360)
     */
    alpha: number;
    /**
     * 绕 X 轴旋转角（单位：度），范围 [-180, 180)
     */
    beta: number;
    /**
     * 绕 Y 轴旋转角（单位：度），范围 [-90, 90)
     */
    gamma: number;
  }

  /**
   * 设备方向监听配置
   */
  interface DeviceMotionStartOptions {
    /**
     * 监听频率，默认值为 'normal'
     */
    interval?: SensorInterval;
  }

  /**
   * 罗盘朝向数据
   */
  interface CompassReading {
    /**
     * 面对方向与正北方向顺时针夹角，范围 [0, 360)
     */
    direction: number;
  }

  /**
   * 罗盘监听配置
   */
  interface CompassStartOptions {
    /**
     * 监听频率，默认值为 'normal'
     */
    interval?: SensorInterval;
  }

  /**
   * 流式 LLM 配置选项
   */
  interface LingguangLLMStreamOptions {
    /** 用户输入 */
    prompt: string;

    /** 可选：系统提示词 */
    systemPrompt?: string;

    /** 必需：文本更新回调（会被多次触发） */
    onText: (payload: LingguangLLMStreamPayload) => void;

    /** 可选：错误回调 */
    onError?: (err: LingguangLLMStreamError) => void;

    /** 可选：取消控制 */
    signal?: AbortSignal;
  }

  /**
   * 流式 LLM 文本更新负载
   */
  interface LingguangLLMStreamPayload {
    /** 本次新增的文本片段 */
    delta: string;

    /** 当前完整文本（可直接覆盖 UI） */
    text: string;

    /** 是否为最终结果（最后一次回调为 true） */
    isFinal?: boolean;
  }

  /**
   * 流式 LLM 错误信息
   */
  interface LingguangLLMStreamError {
    /** 人类可读的错误信息 */
    message: string;

    /** 可选：错误码 */
    code?: string;
  }

  type LingguangSharePlatform = 'wechat' | 'xiaohongshu' | 'qq' | 'qzone' | 'passcode' | 'link' | 'poster';

  type LingguangShareOptions = {
    /**
     * 分享渠道配置。推荐传空数组，表示使用默认分享面板形态。
     */
    content: Array<{
      platform: LingguangSharePlatform;
    }>;
  };

  type LingguangShareResult = {
    success: boolean;
    message?: string;
    data?: unknown;
  };

  type LingguangFileTextParseResult = {
    success: boolean;
    fileId: string;
    runId?: string;
  };

  type LingguangFileTextStatus = 'uploaded' | 'parsing' | 'parsed' | 'parse_failed' | 'deleted';

  type LingguangFileTextResult = {
    success: boolean;
    fileId: string;
    status: LingguangFileTextStatus;
    parseStatus?: string;
    text?: string;
    error?: string;
    runId: string;
  };

  /**
   * 灵光轻应用全局 API 接口定义
   */
  interface LingguangAPI {
    /**
     * 内部调用方法，用于与后端通信
     * @param action - 操作名称，如 'lingguang.storage.setItem'
     * @param params - 请求参数（可选）
     * @param timeout - 超时时间（毫秒），默认 30000
     * @returns Promise，resolve 的值为响应对象，包含 success、data、message 等属性
     */
    _call: (
      action: string,
      params?: any,
      timeout?: number,
    ) => Promise<{
      success: boolean;
      data?: any;
      message?: string;
      [key: string]: any;
    }>;

    /**
     * 获取 artifactId
     * @returns artifactId 字符串
     */
    _getArtifactId: () => string;

    /**
     * 获取 artifactVersion
     * @returns artifactVersion 字符串，默认为 '1'
     */
    _getArtifactVersion: () => string;

    /**
     * 存储相关 API
     */
    storage: {
      /**
       * 设置存储项
       * @param key - 存储键名
       * @param value - 存储值（可以是任何可序列化的值）
       * @returns Promise<boolean> - 成功返回 true，失败返回 false
       */
      setItem: (key: string, value: any) => Promise<boolean>;

      /**
       * 获取存储项
       * @param key - 存储键名
       * @returns Promise<any | null> - 成功返回解析后的值，失败或不存在返回 null
       */
      getItem: (key: string) => Promise<any | null>;

      /**
       * 删除存储项
       * @param key - 存储键名
       * @returns Promise<boolean> - 成功返回 true，失败返回 false
       */
      removeItem: (key: string) => Promise<boolean>;

      /**
       * 清空所有存储项
       * @returns Promise<boolean> - 成功返回 true，失败返回 false
       */
      clear: () => Promise<boolean>;
    };

    /**
     * 应用私有服务 API
     */
    service: {
      /**
       * 发起结构化服务请求
       * @param request - 结构化请求参数
       */
      request: (request: ServiceRequest) => Promise<ServiceResponse>;

      /**
       * 发起类 fetch 请求
       * 与标准 fetch 保持接近，用于生成的 OpenAPI client 注入 fetchApi
       */
      fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
    };

    /**
     * 数据获取相关 API
     */
    data: {
      /**
       * 联网获取数据
       * @param query - 自然语言查询
       * @param schema - JSON Schema 定义返回数据结构（可选）
       * @param location - 位置信息，位置相关查询必传（可选）
       * @returns Promise<Record<string, any> | null> - 成功返回解析后的数据对象，失败返回 null
       */
      fetch: (
        query: string,
        schema?: object,
        location?: {
          longitude: number;
          latitude: number;
          province?: string;
          city?: string;
          district?: string;
          pois?: Array<{ name: string; address: string }>;
        },
      ) => Promise<Record<string, any> | null>;

      /** 查询稳定天气数据。 */
      getWeather: (options: LingguangWeatherOptions) => Promise<LingguangWeatherResult | null>;

      /** 查询稳定汇率数据。 */
      getExchangeRate: (options: LingguangExchangeRateOptions) => Promise<LingguangExchangeRateResult | null>;

      /** 查询股票最新行情和最近走势。 */
      getStockPrice: (options: LingguangStockPriceOptions) => Promise<LingguangStockPriceResult | null>;

      /** 查询股票 K 线数据。 */
      getStockCandlestickData: (
        options: LingguangStockCandlestickOptions,
      ) => Promise<LingguangStockCandlestickResult | null>;

      /** 查询贵金属行情数据。 */
      getPreciousMetalPrice: (
        options: LingguangPreciousMetalPriceOptions,
      ) => Promise<LingguangPreciousMetalPriceResult | null>;

      /**
       * 探索式UI生成 - 根据查询生成交互式HTML（支持流式渲染）
       * @param query - 用户查询/探索主题
       * @param currentHTML - 当前页面HTML（用于主题检测和上下文，可选）
       * @param onStreamChunk - 流式回调，接收累积的HTML用于实时渲染（可选）
       * @returns Promise<string | null> - 使用流式回调时返回null（内容已通过回调渲染），否则返回HTML字符串
       */
      explore: (query: string, currentHTML?: string, onStreamChunk?: (accumulatedHtml: string) => void) => Promise<string | null>;
    };

    /**
     * 数据库相关 API
     */
    db: {
      /**
       * 查询数据（SELECT）
       * @param req - DB 请求参数
       */
      query: <T = any>(req: DbReq) => Promise<DbQueryResult<T>>;
      /**
       * 执行写操作（INSERT/UPDATE/DELETE）
       * @param req - DB 请求参数
       */
      execute: (req: DbReq) => Promise<DbExecuteResult>;
      /**
       * 获取当前闪应用使用者的 DB 角色，用于前端 UI 做管理员入口显隐。
       */
      role: () => Promise<DbRoleResult>;
    };

    /**
     * 调用 LLM（大语言模型）
     * @param message - 消息内容
     * @param system_prompt_or_type - 系统提示词或类型标识（可选）
     *   - 如果为 "DATA_API_REQUEST"，则使用 DATA_API_REQUEST 类型
     *   - 如果为其他非空字符串，则作为 system_prompt 使用
     *   - 如果为 null 或 undefined，则不设置 system_prompt
     * @param timeout - 超时时间（毫秒），默认 60000
     * @returns Promise<any> - LLM 响应结果
     */
    callLLM: (message: string, system_prompt_or_type?: string | null, timeout?: number) => Promise<any>;

    /**
     * 打开手机相册，允许用户选择一张或多张图片
     * @param options - 配置对象（可选）
     * @param options.count - 最多选择的图片数量，范围 1-9，默认值为 1
     * @param options.sourceType - 图片来源，默认值为 ['album', 'camera']
     * @param options.sizeType - 所选的图片的尺寸，默认值为 ['original', 'compressed']
     * @returns Promise，成功时返回选择的图片信息，失败时 reject
     */
    chooseImage: (options?: { count?: number; sourceType?: ('album' | 'camera')[]; sizeType?: ('original' | 'compressed')[] }) => Promise<{
      tempFiles: Array<{
        path: string;
        size: number;
      }>;
    }>;

    /**
     * 调用扫码能力，支持二维码和条形码识别
     * @param options - 配置对象（可选）
     * @param options.onlyFromCamera - 是否仅允许相机扫码，默认 false
     * @param options.scanType - 扫码类型，默认 ['barCode', 'qrCode']
     * @returns Promise，成功时返回扫码结果和类型，失败时 reject
     */
    scanCode: (options?: { onlyFromCamera?: boolean; scanType?: ('barCode' | 'qrCode')[] }) => Promise<{
      result: string;
      scanType: string;
    }>;

    /**
     * 打开手机相机，允许用户拍摄照片
     * @param options - 配置对象（可选）
     * @param options.sizeType - 所选的图片的尺寸，默认值为 ['original', 'compressed']
     * @returns Promise，成功时返回拍摄的照片信息，失败时 reject
     */
    takePhoto: (options?: { sizeType?: ('original' | 'compressed')[] }) => Promise<{
      tempFiles: Array<{
        path: string;
        size: number;
      }>;
    }>;

    /**
     * 将H5应用中的图片保存到手机系统相册。支持 Base64 格式、本地文件路径或网络 URL
     * @param options - 配置对象
     * @param options.filePath - 图片数据，支持 Base64、本地文件路径或网络 URL
     * @returns Promise，成功时 resolve，失败时 reject
     */
    saveImageToPhotosAlbum: (options: { filePath: string }) => Promise<void>;

    /**
     * 将图片上传到服务器。支持多种图片来源（本地路径、Base64、URL）
     * @param options - 配置对象
     * @param options.filePath - 图片数据，支持本地路径、Base64 或 URL
     * @param options.compress - 压缩级别，默认值为 'auto'
     * @returns Promise，成功时返回服务器返回的图片 URL，失败时 reject
     */
    uploadImage: (options: { filePath: string; compress?: 'low' | 'medium' | 'high' | 'none' | 'auto' }) => Promise<{
      url: string;
    }>;

    /**
     * 获取设备当前的地理位置信息，包括经纬度、国家、省份、城市等信息。可选择是否返回附近的POI（兴趣点）信息
     * @param options - 配置对象（可选）
     * @param options.poi - 是否返回完整位置信息（包括国家、省份、城市和POI），默认值为 false
     * @returns Promise，成功时返回位置信息，失败时 reject
     */
    getLocation: (options?: { poi?: boolean }) => Promise<{
      longitude: number;
      latitude: number;
      country?: string;
      countryCode?: string;
      province?: string;
      provinceCode?: string;
      city?: string;
      cityCode?: string;
      district?: string;
      districtCode?: string;
      pois?: Array<{
        name: string;
        address: string;
      }>;
    }>;

    /**
     * 打开文件选择器，允许用户从设备中选择一个文件
     * @param options - 配置对象（可选），当前为空对象，保留用于未来扩展
     * @returns Promise，成功时返回文件信息，失败时 reject
     */
    chooseFile: (options?: {}) => Promise<{
      filePath: string;
      fileName: string;
    }>;

    /**
     * 将文件上传到服务器。支持本地文件路径
     * @param options - 配置对象
     * @param options.filePath - 文件路径，通常由 chooseFile 返回的 filePath
     * @returns Promise，成功时返回文件 ID，失败时 reject
     */
    uploadFile: (options: { filePath: string }) => Promise<{
      fileId: string;
    }>;

    /**
     * 提交文件文本解析任务。只提交任务，不等待解析完成。
     * @param options.fileId - uploadFile 返回的文件 ID
     */
    parseFileText: (options: { fileId: string }) => Promise<LingguangFileTextParseResult>;

    /**
     * 查询文件文本解析进度和结果，用于轮询。
     * @param options.runId - parseFileText 返回的解析任务 ID
     */
    getFileText: (options: { runId: string }) => Promise<LingguangFileTextResult>;

    /**
     * 根据平台文件 ID 或纯 Base64 数据保存文件。
     * @param options - 配置对象
     * @param options.fileId - 平台文件 ID，通常由 uploadFile 返回
     * @param options.data - 纯 Base64 字符串；与 fileId 必须且只能传一个
     * @param options.fileName - 期望保存的文件名，可选，建议包含与文件内容匹配的扩展名
     * @returns Promise，成功时返回保存结果，失败时 reject
     */
    saveFile: (options: { fileId: string; data?: never; fileName?: string } | { data: string; fileId?: never; fileName?: string }) => Promise<{
      success: boolean;
    }>;

    /**
     * 读取本地文件内容。支持多种编码格式，可以读取文本文件或二进制文件
     * @param options - 配置对象
     * @param options.filePath - 文件路径，通常由 chooseFile 返回的 filePath
     * @param options.encoding - 编码格式，支持以下值：
     *   - 'utf8': UTF-8 编码
     *   - 'ascii': ASCII 编码
     *   - 'base64': Base64 编码
     * @returns Promise，成功时返回文件数据，失败时 reject
     */
    readFile: (options: { filePath: string; encoding: 'utf8' | 'ascii' | 'base64' }) => Promise<{
      data?: string | ArrayBuffer;
    }>;

    /**
     * AI 相关 API
     */
    ai: {
      /**
       * AI图像生成能力，根据文本描述生成指定尺寸的图像
       * @param params - 请求参数对象
       * @param params.query - 图像生成的文本描述
       * @param params.width - 生成图像的宽度（像素）
       * @param params.height - 生成图像的高度（像素）
       * @returns Promise，成功时返回包含图像 URL 的对象，失败时 reject
       */
      imageGeneration: (params: { query: string; width: number; height: number }) => Promise<{
        url: string;
      }>;

      /**
       * 多模态理解能力的大语言模型，主要用于图像理解，支持图像和文本的混合输入
       * @param params - 请求参数对象
       * @param params.content - 内容数组，可包含图像和文本
       * @returns Promise，成功时返回包含模型理解结果的对象，失败时 reject
       */
      vllm: (params: {
        content: Array<{
          type: 'image' | 'text';
          content: string;
        }>;
      }) => Promise<{
        content: string;
      }>;

      /**
       * 流式大模型 API，提供实时输出片段的能力，调用方可以边生成边展示内容
       * @param options - 流式 LLM 配置选项
       * @returns Promise<void>，流式生成完成后 resolve
       */
      llmStream: (options: LingguangLLMStreamOptions) => Promise<void>;

      /**
       * Agentic 流式生成（搜索 + LLM），通过 agentic_fr_agent 处理，返回富文本 HTML
       * @param options - Agentic 流式生成配置选项
       * @returns Promise<void>，流式生成完成后 resolve
       */
      agenticStream: (options: LingguangLLMStreamOptions) => Promise<void>;
    };

    /**
     * 应用相关 API
     */
    app: {
      /**
       * 调起客户端分享面板。推荐传 { content: [] } 使用默认分享面板形态。
       */
      share: (options: LingguangShareOptions) => Promise<LingguangShareResult>;
    };

    /**
     * 震动反馈 API
     * 提供设备震动/触觉反馈能力，可触发单次或节奏序列的震动提示
     * @param options - 震动配置选项（可选）
     */
    vibrate: (options?: {
      /**
       * 震动模式（默认 short）
       */
      mode?: 'short' | 'long';
      /**
       * 震动强度（默认 medium）
       */
      intensity?: 'light' | 'medium' | 'heavy';
    }) => void;

    /**
     * 陀螺仪 API
     * 用于读取设备陀螺仪数据，获取旋转角速度（x/y/z轴）和姿态变化
     */
    gyroscope: {
      /**
       * 开始监听陀螺仪数据
       * @param options - 配置选项（可选）
       * @param options.frequency - 采样频率，可选值：'low'（低）、'medium'（中）、'high'（高），默认值为 'high'
       * @param options.onReading - 必需：每次采样数据的回调
       * @returns Promise，成功时 resolve，失败时 reject（如无权限）
       */
      start: (options?: {
        frequency?: 'low' | 'medium' | 'high';
        onReading: (reading: { x: number; y: number; z: number; timestamp: number }) => void;
      }) => Promise<void>;

      /**
       * 停止监听陀螺仪数据
       * @returns Promise
       */
      stop: () => Promise<void>;
    };

    /**
     * 加速度 API
     * 用于监听设备加速度变化（x/y/z 轴）
     */
    startAccelerometer: (options?: AccelerometerStartOptions) => Promise<void>;
    stopAccelerometer: () => Promise<void>;
    onAccelerometerChange: (callback: (reading: AccelerometerReading) => void) => void;

    /**
     * 设备方向 API
     * 用于监听设备姿态变化（alpha/beta/gamma）
     */
    startDeviceMotionListening: (options?: DeviceMotionStartOptions) => Promise<void>;
    stopDeviceMotionListening: () => Promise<void>;
    onDeviceMotionChange: (callback: (reading: DeviceMotionReading) => void) => void;

    /**
     * 罗盘 API
     * 用于监听设备朝向变化
     */
    startCompass: (options?: CompassStartOptions) => Promise<void>;
    stopCompass: () => Promise<void>;
    onCompassChange: (callback: (reading: CompassReading) => void) => void;

    /**
     * ASR（实时语音转文字）API
     * 将用户语音实时转写为文本
     */
    asr: {
      /**
       * 开始语音识别
       * @param options - 配置选项
       * @param options.lang - 识别语言，如 "zh-CN"
       * @param options.interim - 是否输出临时结果（默认 true）
       * @param options.continuous - 是否连续识别（默认 false）
       * @param options.onText - 必需：识别文本更新回调（可直接覆盖 UI）
       * @param options.onError - 可选：识别过程异常回调（会导致会话结束）
       * @param options.onEnd - 可选：会话结束通知回调
       * @returns Promise，成功时 resolve，失败时 reject（如无权限）
       */
      start: (options: {
        lang?: string;
        interim?: boolean;
        continuous?: boolean;
        onText: (payload: { text: string; sessionId: string; seq?: number; isFinal?: boolean }) => void;
        onError?: (err: {
          error: 'not-allowed' | 'audio-capture' | 'no-speech' | 'network' | 'engine' | 'aborted' | 'unknown';
          message?: string;
          fatal?: boolean;
          sessionId: string;
          code?: string;
        }) => void;
        onEnd?: (reason: 'stop' | 'abort' | 'error', sessionId: string) => void;
      }) => Promise<void>;

      /**
       * 优雅停止识别（尽量产出最终文本后结束）
       * @returns Promise
       */
      stop: () => Promise<void>;

      /**
       * 立即停止识别（不保证最终文本）
       * @returns Promise
       */
      abort: () => Promise<void>;
    };
  }

  /**
   * 灵光轻应用全局 API（全局变量）
   */
  const lingguang: LingguangAPI;

  /**
   * 调用 LLM（大语言模型）全局函数
   * @param message - 消息内容
   * @param system_prompt_or_type - 系统提示词或类型标识（可选）
   *   - 如果为 "DATA_API_REQUEST"，则使用 DATA_API_REQUEST 类型
   *   - 如果为其他非空字符串，则作为 system_prompt 使用
   *   - 如果为 null 或 undefined，则不设置 system_prompt
   * @param timeout - 超时时间（毫秒），默认 60000
   * @returns Promise<any> - LLM 响应结果
   */
  const callLLM: (message: string, system_prompt_or_type?: string | null, timeout?: number) => Promise<any>;

  /**
   * AudioContext2 类，模拟 Web Audio API
   * 支持多振荡器、Gain 包络与定时 start/stop
   */
  const AudioContext2: new () => AudioContext2;

  /**
   * 高德地图加载器（全局函数）
   * 封装了高德地图的加载逻辑，包括安全配置、脚本动态加载和 AMapLoader 初始化
   * @returns Promise<AMap> 返回 AMap 实例
   */
  function loadMap(): Promise<AMap>;

  interface Window {
    /**
     * 灵光轻应用全局 API（可选，独立运行时不存在）
     */
    lingguang?: LingguangAPI;

    /**
     * 追踪 ID
     */
    trace_id?: string;

    /**
     * Flash App 会话 ID
     */
    _flashAppSessionId?: string;

    /**
     * 调用 LLM（大语言模型）
     * @param message - 消息内容
     * @param system_prompt_or_type - 系统提示词或类型标识（可选）
     *   - 如果为 "DATA_API_REQUEST"，则使用 DATA_API_REQUEST 类型
     *   - 如果为其他非空字符串，则作为 system_prompt 使用
     *   - 如果为 null 或 undefined，则不设置 system_prompt
     * @param timeout - 超时时间（毫秒），默认 60000
     * @returns Promise<any> - LLM 响应结果
     */
    callLLM: (message: string, system_prompt_or_type?: string | null, timeout?: number) => Promise<any>;

    /**
     * 播放文本转语音（TTS）
     * @param text - 要播放的文本内容
     * @param options - 可选配置项
     * @param options.lang - 语言代码，支持 'zh' | 'en' | 'yue' | 'jp' | 'ko' | 'fr' | 'es' | 'de' | 'ru' | 'ar' | 'it' | 'pt' | 'pl' | 'auto'
     * @param options.voiceType - 音色类型，支持 'fairy_tale' | 'short_play' | 'common'
     * @returns Promise<void> - 播放完成时 resolve
     */
    playTTS: (
      text: string,
      options?: {
        lang?: 'zh' | 'en' | 'yue' | 'jp' | 'ko' | 'fr' | 'es' | 'de' | 'ru' | 'ar' | 'it' | 'pt' | 'pl' | 'auto';
        voiceType?: 'fairy_tale' | 'short_play' | 'common';
      },
    ) => Promise<void>;

    /**
     * 停止所有正在播放的 TTS
     */
    stopAllTTS: () => void;

    /**
     * 高德地图加载器
     * 封装了高德地图的加载逻辑，包括安全配置、脚本动态加载和 AMapLoader 初始化
     * @returns Promise<AMap> 返回 AMap 实例
     */
    loadMap: () => Promise<AMap>;

    /**
     * AudioContext2 类，模拟 Web Audio API
     * 支持多振荡器、Gain 包络与定时 start/stop
     */
    AudioContext2: new () => AudioContext2;

    /**
     * 当前闪应用使用者的 DB 角色，由平台注入脚本写入。
     */
    _role?: string;

    /**
     * 当前闪应用使用者的 DB 角色。运行时会默认预取，失败时按 USER 处理。
     */
    currentRole?: DbRuntimeRole;

    /**
     * DB 角色预取完成 Promise。需要角色分流的 UI 先等待该 Promise。
     */
    currentRoleReady?: Promise<DbRuntimeRole>;
  }

  /**
   * 高德地图 AMap 类型
   * 高德地图 API 返回的 AMap 命名空间对象
   */
  interface AMap {
    /**
     * 地图类
     * @param container - 地图容器的 id 或 DOM 元素
     * @param options - 地图配置选项（可选）
     */
    Map: new (container: string | HTMLElement, options?: any) => any;
    [key: string]: any;
  }

  /**
   * AudioContext2 实例类型
   */
  interface AudioContext2 {
    /**
     * 音频输出目标节点
     */
    readonly destination: AudioDestinationNode;

    /**
     * 采样率（Hz），默认 44100
     */
    readonly sampleRate: number;

    /**
     * 当前音频上下文的时间（秒）
     */
    readonly currentTime: number;

    /**
     * 创建振荡器节点
     * @returns OscillatorNode 实例
     */
    createOscillator(): OscillatorNode;

    /**
     * 创建增益节点
     * @returns GainNode 实例
     */
    createGain(): GainNode;

    /**
     * 创建音频缓冲区源节点
     * @returns AudioBufferSourceNode 实例
     */
    createBufferSource(): AudioBufferSourceNode;

    /**
     * 创建音频缓冲区
     * @param numberOfChannels - 声道数
     * @param length - 缓冲区长度（采样帧数）
     * @param sampleRate - 采样率（Hz）
     * @returns AudioBuffer 实例
     */
    createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer;
  }

  /**
   * 音频参数类型
   */
  interface AudioParam {
    /**
     * 当前参数值
     */
    value: number;

    /**
     * 在指定时间设置参数值
     * @param value - 参数值
     * @param time - 时间（秒）
     */
    setValueAtTime(value: number, time: number): void;

    /**
     * 线性渐变到指定值
     * @param value - 目标值
     * @param time - 到达目标值的时间（秒）
     */
    linearRampToValueAtTime(value: number, time: number): void;

    /**
     * 指数渐变到指定值
     * @param value - 目标值
     * @param time - 到达目标值的时间（秒）
     */
    exponentialRampToValueAtTime(value: number, time: number): void;

    /**
     * 取消指定时间之后的调度值（仅 GainNode.gain 支持）
     * @param time - 时间（秒）
     */
    cancelScheduledValues?(time: number): void;
  }

  /**
   * 音频目标节点类型
   */
  interface AudioDestinationNode {
    /**
     * 连接到目标节点（空实现）
     */
    connect(): void;
  }

  /**
   * 振荡器节点类型
   */
  interface OscillatorNode {
    /**
     * 节点 ID
     */
    readonly id: number;

    /**
     * 频率参数
     */
    readonly frequency: AudioParam;

    /**
     * 振荡器类型：'sine' | 'square' | 'sawtooth' | 'triangle'
     */
    type: string;

    /**
     * 连接到目标节点
     * @param destination - 目标节点（GainNode 或 AudioDestinationNode）
     * @returns 自身，支持链式调用
     */
    connect(destination?: GainNode | AudioDestinationNode): OscillatorNode;

    /**
     * 断开连接
     * @param destination - 目标节点（可选），不传则断开所有连接
     * @returns 自身，支持链式调用
     */
    disconnect(destination?: GainNode | AudioDestinationNode): OscillatorNode;

    /**
     * 开始播放
     * @param when - 开始时间（秒），可选，默认为当前时间
     */
    start(when?: number): void;

    /**
     * 停止播放
     * @param when - 停止时间（秒），可选，默认为当前时间
     */
    stop(when?: number): void;
  }

  /**
   * 增益节点类型
   */
  interface GainNode {
    /**
     * 节点 ID
     */
    readonly id: number;

    /**
     * 增益参数（支持 cancelScheduledValues）
     */
    readonly gain: AudioParam & {
      /**
       * 取消指定时间之后的调度值
       * @param time - 时间（秒）
       */
      cancelScheduledValues(time: number): void;
    };

    /**
     * 连接到目标节点
     * @param destination - 目标节点（GainNode 或 AudioDestinationNode）
     * @returns 自身，支持链式调用
     */
    connect(destination?: GainNode | AudioDestinationNode): GainNode;

    /**
     * 断开连接
     * @param destination - 目标节点（可选），不传则断开所有连接
     * @returns 自身，支持链式调用
     */
    disconnect(destination?: GainNode | AudioDestinationNode): GainNode;
  }

  /**
   * 音频缓冲区源节点类型
   */
  interface AudioBufferSourceNode {
    /**
     * 节点 ID
     */
    readonly id: number;

    /**
     * 音频缓冲区
     */
    buffer: AudioBuffer | null;

    /**
     * 是否循环播放
     */
    loop: boolean;

    /**
     * 循环开始位置（秒）
     */
    loopStart: number;

    /**
     * 循环结束位置（秒）
     */
    loopEnd: number;

    /**
     * 播放速率参数
     */
    readonly playbackRate: {
      /**
       * 播放速率值
       */
      value: number;
    };

    /**
     * 连接到目标节点
     * @param destination - 目标节点（GainNode 或 AudioDestinationNode）
     * @returns 自身，支持链式调用
     */
    connect(destination?: GainNode | AudioDestinationNode): AudioBufferSourceNode;

    /**
     * 断开连接
     * @param destination - 目标节点（可选），不传则断开所有连接
     * @returns 自身，支持链式调用
     */
    disconnect(destination?: GainNode | AudioDestinationNode): AudioBufferSourceNode;

    /**
     * 开始播放
     * @param when - 开始时间（秒），可选，默认为当前时间
     * @param offset - 从缓冲区的哪个位置开始播放（秒），可选，默认为 0
     * @param duration - 播放时长（秒），可选
     */
    start(when?: number, offset?: number, duration?: number): void;

    /**
     * 停止播放
     * @param when - 停止时间（秒），可选，默认为当前时间
     */
    stop(when?: number): void;
  }

  /**
   * 音频缓冲区类型
   */
  interface AudioBuffer {
    /**
     * 采样率（Hz）
     */
    readonly sampleRate: number;

    /**
     * 缓冲区长度（采样帧数）
     */
    readonly length: number;

    /**
     * 声道数
     */
    readonly numberOfChannels: number;

    /**
     * 持续时间（秒）
     */
    readonly duration: number;

    /**
     * 获取指定声道的音频数据
     * @param channel - 声道索引（0 开始）
     * @returns Float32Array 音频数据
     */
    getChannelData(channel: number): Float32Array;

    /**
     * 从指定声道复制数据
     * @param destination - 目标数组
     * @param channelNumber - 源声道索引
     * @param startInChannel - 从源声道的哪个位置开始复制，可选，默认为 0
     */
    copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void;

    /**
     * 复制数据到指定声道
     * @param source - 源数组
     * @param channelNumber - 目标声道索引
     * @param startInChannel - 从目标声道的哪个位置开始复制，可选，默认为 0
     */
    copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void;
  }
}

export {};
