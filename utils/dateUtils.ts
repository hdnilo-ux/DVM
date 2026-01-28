
import { 
  format, 
  endOfMonth, 
  eachDayOfInterval, 
  isSunday, 
  isToday, 
  getWeek, 
  endOfWeek,
  addDays,
  isSameDay,
  isWithinInterval,
  differenceInCalendarDays,
} from 'date-fns';
// Fix for missing members in current environment by importing from subpaths
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { parseISO } from 'date-fns/parseISO';
import { ptBR } from 'date-fns/locale/pt-BR';
import { DayInfo, WeekInfo, MonthInfo } from '../types';

export const getMonthData = (year: number, month: number): MonthInfo => {
  const date = new Date(year, month);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  const daysInMonth = eachDayOfInterval({ start, end });
  
  const weeks: WeekInfo[] = [];
  let currentWeekDays: DayInfo[] = [];
  
  // Fill leading days from previous month to complete the first week
  const firstDay = daysInMonth[0];
  const firstDayOfWeek = startOfWeek(firstDay, { weekStartsOn: 0 }); // 0 = Sunday
  
  let currentPointer = firstDayOfWeek;
  while (!isSameDay(currentPointer, firstDay)) {
    currentWeekDays.push({
      date: currentPointer,
      dayNumber: currentPointer.getDate(),
      isSunday: isSunday(currentPointer),
      isToday: isToday(currentPointer)
    });
    currentPointer = addDays(currentPointer, 1);
  }

  daysInMonth.forEach((day) => {
    currentWeekDays.push({
      date: day,
      dayNumber: day.getDate(),
      isSunday: isSunday(day),
      isToday: isToday(day)
    });
    
    if (currentWeekDays.length === 7) {
      weeks.push({
        weekNumber: getWeek(currentWeekDays[0].date),
        days: [...currentWeekDays]
      });
      currentWeekDays = [];
    }
  });

  // Fill trailing days from next month to complete the last week
  if (currentWeekDays.length > 0) {
    const lastDay = daysInMonth[daysInMonth.length - 1];
    const lastDayOfWeek = endOfWeek(lastDay, { weekStartsOn: 0 });
    
    let endPointer = addDays(lastDay, 1);
    while (endPointer <= lastDayOfWeek) {
      currentWeekDays.push({
        date: endPointer,
        dayNumber: endPointer.getDate(),
        isSunday: isSunday(endPointer),
        isToday: isToday(endPointer)
      });
      endPointer = addDays(endPointer, 1);
    }
    
    weeks.push({
      weekNumber: getWeek(currentWeekDays[0].date),
      days: currentWeekDays
    });
  }

  return {
    name: format(date, 'MMMM', { locale: ptBR }),
    year,
    weeks
  };
};

export const isDateInTrip = (date: Date, startDateStr: string, endDateStr: string): boolean => {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  return isWithinInterval(date, { start, end });
};

export const calculateTripDuration = (startDateStr: string, endDateStr: string): number => {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  // Inclui o dia de retorno como dia trabalhado
  return Math.abs(differenceInCalendarDays(end, start)) + 1;
};

export const formatToBRL = (date: Date) => format(date, "dd/MM/yyyy");
