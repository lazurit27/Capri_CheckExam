export type Severity = 'Low' | 'Medium' | 'Critical';
export type CarStatus = 'Ok' | 'Warning' | 'Critical';

export interface FaultCode {
  id: number;
  code: string;
  description: string;
  severity: Severity;
}

export interface ActiveFault {
  faultCodeId: number;
  code: string;
  description: string;
  severity: Severity;
  isTest: boolean;
  detectedAt: string;
}

export interface CarFaultState {
  carId: string;
  status: CarStatus;
  activeFaults: ActiveFault[];
}

export type Level = 'ok' | 'warn' | 'crit';
