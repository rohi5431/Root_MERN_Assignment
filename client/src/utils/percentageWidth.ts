const percentageWidthClasses = [
  'w-0',
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
] as const;

export function getPercentageWidthClass(value: number) {
  const percentage = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const widthIndex = Math.round((percentage / 100) * (percentageWidthClasses.length - 1));
  return percentageWidthClasses[widthIndex];
}
