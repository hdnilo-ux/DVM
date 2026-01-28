
export interface Trip {
  id: string;
  groupId: string; // ID único para agrupar técnicos na mesma viagem
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string;   // ISO format YYYY-MM-DD
  destination?: string;
  color: string;     // Hex color code
}

export interface Technician {
  id: string;
  name: string;
  trips: Trip[];
}

export interface DayInfo {
  date: Date;
  dayNumber: number;
  isSunday: boolean;
  isToday: boolean;
}

export interface WeekInfo {
  weekNumber: number;
  days: DayInfo[];
}

export interface MonthInfo {
  name: string;
  year: number;
  weeks: WeekInfo[];
}

export interface GroupedTrip {
  groupId: string;
  startDate: string;
  endDate: string;
  destination: string;
  color: string;
  technicians: { id: string, name: string }[];
}
