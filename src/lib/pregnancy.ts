import { PREGNANCY_PHASES } from '../constants';
import type { Task } from '../types';

export type TaskPhase = Task['phase'];

const TASK_PHASE_ORDER: TaskPhase[] = ['Early', 'Mid', 'Late'];

const TASK_PHASE_END_WEEK: Record<TaskPhase, number> = {
  Early: 12,
  Mid: 34,
  Late: 40,
};

const TASK_PHASE_START_WEEK: Record<TaskPhase, number> = {
  Early: 1,
  Mid: 13,
  Late: 35,
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const normalizeDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const shiftDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return normalizeDate(next);
};

export const parseIsoDate = (value?: string) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return normalizeDate(new Date(year, month - 1, day));
};

export const toIsoDate = (date: Date) => normalizeDate(date).toISOString().split('T')[0];

export const formatIsoDate = (value?: string) => {
  const parsed = parseIsoDate(value);
  return parsed ? DATE_FORMATTER.format(parsed) : 'Sin fecha';
};

export const getCurrentPregnancyWeek = (
  dueDateStr?: string,
  startWeek?: number,
  startDays?: number,
  startDateStr?: string
) => {
  if (!dueDateStr) return { weeks: 0, days: 0 };

  const today = normalizeDate(new Date());

  if (startDateStr && startWeek !== undefined) {
    const startDate = parseIsoDate(startDateStr);
    if (!startDate) return { weeks: 0, days: 0 };

    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalDays = startWeek * 7 + (startDays || 0) + diffDays;

    return {
      weeks: Math.max(1, Math.min(42, Math.floor(totalDays / 7))),
      days: Math.max(0, totalDays % 7),
    };
  }

  const dueDate = parseIsoDate(dueDateStr);
  if (!dueDate) return { weeks: 0, days: 0 };

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const totalDaysPregnancy = 280;
  const currentTotalDays = totalDaysPregnancy - diffDays;

  return {
    weeks: Math.max(1, Math.min(42, Math.floor(currentTotalDays / 7))),
    days: Math.max(0, currentTotalDays % 7),
  };
};

export const getActivePhaseIndex = (week: number) => {
  const idx = PREGNANCY_PHASES.findIndex(
    (phase) => week >= phase.weekStart && week <= phase.weekEnd
  );

  return idx === -1 ? PREGNANCY_PHASES.length - 1 : idx;
};

export const getCurrentTaskPhase = (week: number): TaskPhase => {
  if (week <= 12) return 'Early';
  if (week <= 34) return 'Mid';
  return 'Late';
};

export const getTaskPhaseRank = (phase: TaskPhase) => TASK_PHASE_ORDER.indexOf(phase);

export const getTaskPhaseBucket = (phase: TaskPhase, currentWeek: number) => {
  const currentPhase = getCurrentTaskPhase(currentWeek);
  const diff = getTaskPhaseRank(phase) - getTaskPhaseRank(currentPhase);

  if (diff < 0) return 'past' as const;
  if (diff === 0) return 'current' as const;
  return 'future' as const;
};

export const calculateTaskDueDate = (dueDateStr?: string, phase: TaskPhase = 'Mid') => {
  const dueDate = parseIsoDate(dueDateStr);
  if (!dueDate) return undefined;

  if (phase === 'Late') {
    return toIsoDate(dueDate);
  }

  const phaseEndWeek = TASK_PHASE_END_WEEK[phase];
  const daysBeforeDueDate = (40 - phaseEndWeek) * 7 + 1;
  return toIsoDate(shiftDays(dueDate, -daysBeforeDueDate));
};

export const resolveTaskDueDate = (task: Pick<Task, 'phase' | 'dueDate'>, dueDateStr?: string) =>
  task.dueDate || calculateTaskDueDate(dueDateStr, task.phase);

export const getTaskPhaseDateRange = (phase: TaskPhase, dueDateStr?: string) =>
  getPhaseDateRange(dueDateStr, TASK_PHASE_START_WEEK[phase], TASK_PHASE_END_WEEK[phase]);

export const getPhaseDateRange = (
  dueDateStr: string | undefined,
  weekStart: number,
  weekEnd: number
) => {
  const dueDate = parseIsoDate(dueDateStr);
  if (!dueDate) return null;

  const startDate = shiftDays(dueDate, -(40 - weekStart + 1) * 7);
  const safeWeekEnd = Math.min(weekEnd, 40);
  const endDate =
    safeWeekEnd >= 40
      ? dueDate
      : shiftDays(dueDate, -((40 - safeWeekEnd) * 7 + 1));

  return {
    start: toIsoDate(startDate),
    end: toIsoDate(endDate),
  };
};

export const formatDateRange = (start?: string, end?: string) => {
  const parsedStart = parseIsoDate(start);
  const parsedEnd = parseIsoDate(end);

  if (!parsedStart || !parsedEnd) return 'Fechas no disponibles';

  return `${DATE_FORMATTER.format(parsedStart)} - ${DATE_FORMATTER.format(parsedEnd)}`;
};

export const getDaysUntilDueDate = (dueDateStr?: string) => {
  const dueDate = parseIsoDate(dueDateStr);
  if (!dueDate) return null;

  const today = normalizeDate(new Date());
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

export const isPastDate = (dateStr?: string) => {
  const parsed = parseIsoDate(dateStr);
  if (!parsed) return false;

  return parsed.getTime() < normalizeDate(new Date()).getTime();
};
