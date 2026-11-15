function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLine(line) {
  if (!line) return '<div style="height:12px;line-height:12px">&nbsp;</div>';

  if (line.startsWith('- ')) {
    return `<div style="display:flex;margin:0 0 10px;color:#334155;font-size:15px;line-height:24px"><span style="padding-right:10px;color:#2563eb">•</span><span>${escapeHtml(line.slice(2))}</span></div>`;
  }

  if (/^\s+/.test(line)) {
    return `<p style="margin:0 0 10px 16px;padding-left:12px;border-left:2px solid #cbd5e1;color:#64748b;font-size:14px;line-height:22px">${escapeHtml(line.trim())}</p>`;
  }

  return `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px">${escapeHtml(line)}</p>`;
}

export function renderEmailTemplate({ subject, text }) {
  const content = text.split(/\r?\n/).map(renderLine).join('');
  const title = escapeHtml(subject);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:24px 12px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <tr>
        <td style="padding:20px 28px;background-color:#1d4ed8;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.04em">STUDENT COMPANION</td>
      </tr>
      <tr>
        <td style="padding:28px">
          <h1 style="margin:0 0 22px;color:#0f172a;font-size:22px;line-height:30px">${title}</h1>
          <div>${content}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:18px">Shared from Student Companion</td>
      </tr>
    </table>
  </body>
</html>`;
}
