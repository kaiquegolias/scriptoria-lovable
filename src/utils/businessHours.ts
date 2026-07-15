// Add business hours to a date.
// Business day: Mon-Fri, 09:00 - 18:00 (9h/day, skipping weekends).

// Add N business days (Mon-Fri), preserving the current time of day.
export function addBusinessDays(start: Date, days: number): Date {
  const date = new Date(start.getTime());
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

export function addBusinessHours(start: Date, hours: number): Date {
  const WORK_START = 9; // 09:00
  const WORK_END = 18; // 18:00
  const HOURS_PER_DAY = WORK_END - WORK_START; // 9

  const date = new Date(start.getTime());
  let remainingMs = hours * 60 * 60 * 1000;

  // Helper: clamp date to inside business window; if outside, move to next window start
  const moveIntoBusiness = (d: Date) => {
    while (true) {
      const day = d.getDay();
      if (day === 0) {
        // Sunday -> Monday 09:00
        d.setDate(d.getDate() + 1);
        d.setHours(WORK_START, 0, 0, 0);
        continue;
      }
      if (day === 6) {
        // Saturday -> Monday 09:00
        d.setDate(d.getDate() + 2);
        d.setHours(WORK_START, 0, 0, 0);
        continue;
      }
      const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
      if (h < WORK_START) {
        d.setHours(WORK_START, 0, 0, 0);
        continue;
      }
      if (h >= WORK_END) {
        d.setDate(d.getDate() + 1);
        d.setHours(WORK_START, 0, 0, 0);
        continue;
      }
      break;
    }
  };

  moveIntoBusiness(date);

  while (remainingMs > 0) {
    const endOfDay = new Date(date);
    endOfDay.setHours(WORK_END, 0, 0, 0);
    const availableMs = endOfDay.getTime() - date.getTime();

    if (remainingMs <= availableMs) {
      date.setTime(date.getTime() + remainingMs);
      remainingMs = 0;
    } else {
      remainingMs -= availableMs;
      // move to next business day start
      date.setDate(date.getDate() + 1);
      date.setHours(WORK_START, 0, 0, 0);
      moveIntoBusiness(date);
    }
  }

  return date;
}
