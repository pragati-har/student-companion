import { renderEmailTemplate } from '@/lib/emailTemplate';

describe('transactional email template', () => {
  test('renders a branded title and keeps assignment details readable', () => {
    const html = renderEmailTemplate({
      subject: 'Your assignment and task list',
      text: [
        'Here is the assignment list shared from Student Companion:',
        '',
        '- Lab report (Physics) — Nov 4, 2026 [Pending]',
        '  Details: Include results',
      ].join('\n'),
    });

    expect(html).toContain('<title>Your assignment and task list</title>');
    expect(html).toContain('<h1');
    expect(html).toContain('STUDENT COMPANION');
    expect(html).toContain('Lab report (Physics)');
    expect(html).toContain('Details: Include results');
    expect(html).toContain('Shared from Student Companion');
  });

  test('renders attendance and reminder text without changing its content', () => {
    const attendance = renderEmailTemplate({
      subject: 'Your attendance summary',
      text: 'Overall attendance: 8/10 present (80%)\n- Physics (PHY): 4/5 present (80%)',
    });
    const reminder = renderEmailTemplate({
      subject: 'Reminder: Lab report is due soon',
      text: 'This is a reminder about the assignment "Lab report".\nSubject: Physics\nDeadline: Nov 4, 2026',
    });

    expect(attendance).toContain('Overall attendance: 8/10 present (80%)');
    expect(attendance).toContain('Physics (PHY): 4/5 present (80%)');
    expect(reminder).toContain('This is a reminder about the assignment &quot;Lab report&quot;.');
    expect(reminder).toContain('Deadline: Nov 4, 2026');
  });

  test('escapes subject and body content to prevent HTML injection', () => {
    const html = renderEmailTemplate({
      subject: '<script>subject</script>',
      text: '<img src=x onerror=alert(1)> & "quoted"',
    });

    expect(html).toContain('&lt;script&gt;subject&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quoted&quot;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
  });
});
