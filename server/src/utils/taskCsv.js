const CSV_COLUMNS = [
  ['Task ID', 'taskId'],
  ['Title', 'title'],
  ['Description', 'description'],
  ['Assigned Employee', 'assignedEmployeeName'],
  ['Department', 'department'],
  ['Priority', 'priority'],
  ['Status', 'status'],
  ['Start Date', 'startDate'],
  ['Due Date', 'dueDate'],
  ['Created Date', 'createdAt'],
  ['Completed Date', 'completedDate'],
  ['Overdue', 'isOverdue'],
];

function dateValue(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function taskValue(task, key) {
  if (['startDate', 'dueDate', 'createdAt', 'completedDate'].includes(key)) {
    return dateValue(task[key]);
  }
  return task[key] ?? '';
}

export function taskCsvHeader() {
  return `${CSV_COLUMNS.map(([label]) => csvCell(label)).join(',')}\r\n`;
}

export function taskCsvRow(task) {
  return `${CSV_COLUMNS.map(([, key]) => csvCell(taskValue(task, key))).join(',')}\r\n`;
}
