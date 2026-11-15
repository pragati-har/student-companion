function formatDeadline(deadline) {
  return new Date(deadline).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function buildAssignmentList(assignments) {
  return assignments.map((assignment) => {
    const subject = assignment.subjectId?.name || 'Unknown subject';
    const status = assignment.status === 'completed'
      ? 'Completed'
      : new Date(assignment.deadline) < new Date()
        ? 'Overdue'
        : 'Pending';
    const description = assignment.description ? `\n  Details: ${assignment.description}` : '';
    return `- ${assignment.title} (${subject}) — ${formatDeadline(assignment.deadline)} [${status}]${description}`;
  }).join('\n');
}

export function buildAttendanceList(summary) {
  const lines = (summary?.subjects || []).map(({ subject, present, total, percent }) =>
    `- ${subject.name}${subject.code ? ` (${subject.code})` : ''}: ${present}/${total} present (${percent}%)`
  );
  lines.unshift(`Overall attendance: ${summary?.overallPresent ?? 0}/${summary?.overallTotal ?? 0} present (${summary?.overallPercent ?? 0}%)`);
  return lines.join('\n');
}
