/**
 * Tests for attendance calculation logic.
 * Pure functions — no DB or network required.
 */

// ─── Helper: compute attendance stats ─────────────────────────────────────
function computeStats(records) {
  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const percent = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
  return { total, present, percent };
}

function computeOverall(subjectStats) {
  const totalPresent = subjectStats.reduce((s, r) => s + r.present, 0);
  const totalClasses = subjectStats.reduce((s, r) => s + r.total, 0);
  const percent = totalClasses > 0
    ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
    : 0;
  return { totalPresent, totalClasses, percent };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Attendance calculation', () => {
  test('100% when all present', () => {
    const records = [
      { status: 'present' },
      { status: 'present' },
      { status: 'present' },
    ];
    const { total, present, percent } = computeStats(records);
    expect(total).toBe(3);
    expect(present).toBe(3);
    expect(percent).toBe(100);
  });

  test('0% when all absent', () => {
    const records = [{ status: 'absent' }, { status: 'absent' }];
    const { percent } = computeStats(records);
    expect(percent).toBe(0);
  });

  test('50% when half present', () => {
    const records = [{ status: 'present' }, { status: 'absent' }];
    const { percent } = computeStats(records);
    expect(percent).toBe(50);
  });

  test('0% when no records (no division by zero)', () => {
    const { total, present, percent } = computeStats([]);
    expect(total).toBe(0);
    expect(present).toBe(0);
    expect(percent).toBe(0);
  });

  test('correctly rounds to 1 decimal place', () => {
    // 2/3 = 66.666... → 66.7
    const records = [{ status: 'present' }, { status: 'present' }, { status: 'absent' }];
    const { percent } = computeStats(records);
    expect(percent).toBe(66.7);
  });

  test('overall attendance aggregates across subjects correctly', () => {
    const stats = [
      { present: 8, total: 10 },  // 80%
      { present: 4, total: 10 },  // 40%
    ];
    const { totalPresent, totalClasses, percent } = computeOverall(stats);
    expect(totalPresent).toBe(12);
    expect(totalClasses).toBe(20);
    expect(percent).toBe(60);
  });

  test('overall 0% when no records across all subjects', () => {
    const stats = [{ present: 0, total: 0 }, { present: 0, total: 0 }];
    const { percent } = computeOverall(stats);
    expect(percent).toBe(0);
  });
});
