const {
  buildAssignmentList,
  buildAttendanceList,
} = require('../lib/share');

describe('email content formatting', () => {
  test('builds a readable assignment list with subject, date, and status', () => {
    const list = buildAssignmentList([{
      title: 'Lab report',
      description: 'Include the experiment results.',
      subjectId: { name: 'Physics' },
      deadline: '2026-11-04T10:00:00.000Z',
      status: 'pending',
    }]);

    expect(list).toContain('Lab report (Physics)');
    expect(list).toContain('[Pending]');
    expect(list).toContain('Details: Include the experiment results.');
  });

  test('builds an attendance summary for manual sharing', () => {
    expect(buildAttendanceList({
      overallPresent: 7,
      overallTotal: 10,
      overallPercent: 70,
      subjects: [{ subject: { name: 'Physics', code: 'PHY' }, present: 7, total: 10, percent: 70 }],
    })).toContain('Physics (PHY): 7/10 present (70%)');
  });
});
