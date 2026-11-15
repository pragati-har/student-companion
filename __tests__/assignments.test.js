/**
 * Tests for assignment-related business logic.
 * Pure functions — no DB or network required.
 */

// ─── Helpers (mirrors server-side logic) ──────────────────────────────────

function isOverdue(deadline, status) {
  return status === 'pending' && new Date(deadline) < new Date();
}

function isUpcoming(deadline, status) {
  return status === 'pending' && new Date(deadline) >= new Date();
}

function canCreateReminderNotification(assignment) {
  return (
    assignment.remindMe === true &&
    assignment.reminderNotified === false &&
    assignment.status === 'pending' &&
    new Date(assignment.deadline) > new Date() &&
    new Date(assignment.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Assignment status logic', () => {
  test('past-deadline pending assignment is overdue', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(isOverdue(past, 'pending')).toBe(true);
  });

  test('future-deadline pending assignment is NOT overdue', () => {
    const future = new Date(Date.now() + 60 * 60000).toISOString();
    expect(isOverdue(future, 'pending')).toBe(false);
  });

  test('completed assignment is NOT overdue regardless of deadline', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(isOverdue(past, 'completed')).toBe(false);
  });

  test('future-deadline pending assignment is upcoming', () => {
    const future = new Date(Date.now() + 60 * 60000).toISOString();
    expect(isUpcoming(future, 'pending')).toBe(true);
  });

  test('past-deadline assignment is NOT upcoming', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(isUpcoming(past, 'pending')).toBe(false);
  });
});

describe('Reminder eligibility', () => {
  const base = {
    remindMe:     true,
    reminderNotified: false,
    status:       'pending',
    deadline:     new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h from now
  };

  test('eligible when remindMe=true, not sent, pending, within 24h', () => {
    expect(canCreateReminderNotification(base)).toBe(true);
  });

  test('NOT eligible when remindMe=false', () => {
    expect(canCreateReminderNotification({ ...base, remindMe: false })).toBe(false);
  });

  test('NOT eligible when already sent', () => {
    expect(canCreateReminderNotification({ ...base, reminderNotified: true })).toBe(false);
  });

  test('NOT eligible when completed', () => {
    expect(canCreateReminderNotification({ ...base, status: 'completed' })).toBe(false);
  });

  test('NOT eligible when deadline is more than 24h away', () => {
    const far = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(canCreateReminderNotification({ ...base, deadline: far })).toBe(false);
  });

  test('NOT eligible when deadline has already passed', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(canCreateReminderNotification({ ...base, deadline: past })).toBe(false);
  });
});
