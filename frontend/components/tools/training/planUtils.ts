export const PLAN_TYPES = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'custom'] as const;

export const PLAN_TYPE_COLORS: Record<string, string> = {
  push: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pull: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  legs: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  upper: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  lower: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  full_body: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  custom: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
};

export function planTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
