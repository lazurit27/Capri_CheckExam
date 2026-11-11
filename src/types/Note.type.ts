export type NoteType = 'Owner' | 'Fault' | 'Refuel' | 'Critical' | 'Test';

export interface Note {
  id: string;
  carId: string;
  carName: string;
  description: string;
  price: number | null;
  fuelAdded: number | null;
  date: string;
  type: NoteType;
  editable: boolean;
}
