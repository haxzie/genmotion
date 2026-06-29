/** Builds the magic-link sign-in email (subject + html + text). */
export function magicLinkEmail(url: string) {
  const subject = "Your GenMotion sign-in link";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0a0c;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#141417;border:1px solid #1f1f24;border-radius:16px;padding:32px;">
            <tr><td style="font-size:20px;font-weight:600;color:#ededef;padding-bottom:8px;">GenMotion</td></tr>
            <tr><td style="font-size:15px;color:#8a8a93;line-height:1.6;padding-bottom:24px;">
              Click the button below to sign in. This link expires shortly and can only be used once.
            </td></tr>
            <tr><td style="padding-bottom:24px;">
              <a href="${url}" style="display:inline-block;background:#ededef;color:#0a0a0c;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">
                Sign in to GenMotion
              </a>
            </td></tr>
            <tr><td style="font-size:13px;color:#5a5a63;line-height:1.6;">
              If the button doesn't work, copy and paste this URL:<br/>
              <a href="${url}" style="color:#8a8a93;word-break:break-all;">${url}</a>
            </td></tr>
            <tr><td style="font-size:13px;color:#5a5a63;padding-top:24px;border-top:1px solid #1f1f24;margin-top:24px;">
              Didn't request this? You can safely ignore this email.
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Sign in to GenMotion

Use this link to sign in (it expires shortly and works once):
${url}

Didn't request this? You can safely ignore this email.`;

  return { subject, html, text };
}
