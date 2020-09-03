export interface Response {
  Response: ResponseType;
  id: string;
  Status: string;
  Result: object;
}

export type ResponseType =
  | 'GetDeviceStatus'
  | 'GetPowerStatus'
  | 'GetVersion'
  | 'Ping'
  | 'ScanGPS'
  | 'ScanWifiSignal'
  | 'SetAutoReport'
  | 'SetPowerSaving'
  | 'SetReportInterval';
