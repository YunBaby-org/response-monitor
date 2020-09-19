export type StatusResult = 'Success' | 'Failed';

export interface Response {
  Response: ResponseType;
  id: string;
  Status: StatusResult;
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
  | 'SetReportInterval'
  | 'ScanWifiSignal_Resolved'
  | 'ScanWifiSignal_Resolved_Failure';
