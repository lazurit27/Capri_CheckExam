import type { CarStatus } from './Fault.type';
export type { CarStatus };

export interface Car {
  id: string;
  name: string;
  tankCapacity: number; 
  status: CarStatus;
}
