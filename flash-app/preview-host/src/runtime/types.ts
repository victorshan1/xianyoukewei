export type CandyJarSuccessCallback = (result: unknown) => void;
export type CandyJarErrorCallback = (error: unknown) => void;

export type CandyJar = {
  call: (
    namespace: string,
    method: string,
    params: unknown,
    successCallback?: CandyJarSuccessCallback,
    errorCallback?: CandyJarErrorCallback,
  ) => void;
};

declare global {
  interface Window {
    CandyJar?: CandyJar;
  }
}
