// api/register.js
//
// Vercel Serverless Function — works for a plain static site, no framework needed.
// Vercel automatically turns this file into a live endpoint at /api/register.
//
// This function sends two emails through Resend whenever the booking form on
// the website is submitted:
//   1. A notification to the admin, with every field the client filled in.
//   2. A confirmation email back to the client.
//
// Both email templates live in this same file, in the two sections marked
// "EDIT ADMIN EMAIL" and "EDIT CLIENT EMAIL" below, so the wording can be
// changed directly from GitHub (open this file, press the pencil/edit icon,
// change the text inside the marked section, commit). No other part of this
// file needs to be touched to change what the emails say.
//
// -----------------------------------------------------------------------
// REQUIRED ENVIRONMENT VARIABLES (set these in Vercel, never in this file):
//   RESEND_API_KEY   your Resend API key
//   ADMIN_EMAIL      the address that should receive admin notifications
// -----------------------------------------------------------------------

let Resend;
try {
  ({ Resend } = require('resend'));
} catch (err) {
  // This only happens if the "resend" package is missing from
  // package.json / node_modules. Logged here instead of crashing the
  // whole function, so the API can still return a clear JSON error below
  // instead of a raw platform error the frontend can't read.
  console.error('Could not load the "resend" package. Check that it is listed in package.json under "dependencies" and that package-lock.json is up to date.', err);
}

/* ============================================================================
   BRAND COLOURS
   Pulled from the site's own palette, used to style the email HTML below.
   Purely visual, safe to leave alone.
============================================================================ */
const COLOR_NAVY = '#1B2A4A';
const COLOR_TERRACOTTA = '#E8734A';
const COLOR_CREAM = '#FAF6F1';
const COLOR_IVORY = '#FFFDFA';
const COLOR_SLATE = '#5B6570';

/* ============================================================================
   SENDER ADDRESS
   Must be on a domain verified inside the Resend dashboard, or sending will
   fail. This is not a secret, so it is fine to keep in source code.
============================================================================ */
const FROM_ADDRESS = 'Shift and Soar <hello@shiftandsoar.co>';

// Escapes basic HTML characters so submitted text can never break the email markup.
const safe = (value) => (value ? String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');

/* ============================================================================
   SHARED EMAIL SHELL
   The header and footer wrapper used by both emails below. Editing the
   header bar or footer here changes it for both emails at once.
============================================================================ */
function emailShell({ eyebrow, bodyHtml }) {
  return `
  <div style="background:${COLOR_CREAM}; padding: 32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background:${COLOR_IVORY}; border-radius: 10px; overflow: hidden; border: 1px solid rgba(27,42,74,0.08);">
      <tr>
        <td style="background:${COLOR_NAVY}; padding: 28px 32px;">
          <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: ${COLOR_IVORY}; letter-spacing: 0.01em;">
            Shift <span style="color:${COLOR_TERRACOTTA}; font-style: italic;">&amp;</span> Soar
          </div>
          <div style="margin-top: 6px; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${COLOR_TERRACOTTA};">
            ${safe(eyebrow)}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 36px 32px 28px; color:${COLOR_NAVY};">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 32px 28px; border-top: 1px solid rgba(27,42,74,0.1);">
          <p style="margin:0; font-family: Arial, sans-serif; font-size: 12px; color:${COLOR_SLATE};">
            Shift and Soar &middot; Coaching for new and first time managers &middot;
            <a href="mailto:hello@shiftandsoar.co" style="color:${COLOR_SLATE};">hello@shiftandsoar.co</a>
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

/* ============================================================================
   ======================  EDIT ADMIN EMAIL — START  =========================
   This is the notification sent to ADMIN_EMAIL every time someone submits
   the form. Change the subject line or the wording below, then commit.
============================================================================ */

const ADMIN_EMAIL_SUBJECT = (name) => `New enquiry: ${name}`;

function adminEmailHtml({ name, email, organisation, support, preferred_contact }) {
  const row = (label, value) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid rgba(27,42,74,0.08); font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color:${COLOR_TERRACOTTA}; width: 160px; vertical-align: top;">
        ${safe(label)}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid rgba(27,42,74,0.08); font-family: Arial, sans-serif; font-size: 14px; color:${COLOR_NAVY};">
        ${value ? safe(value).replace(/\n/g, '<br>') : `<span style="color:${COLOR_SLATE};">Not provided</span>`}
      </td>
    </tr>`;

  const bodyHtml = `
    <h2 style="margin: 0 0 6px; font-weight: 400; font-size: 24px; color:${COLOR_NAVY};">New enquiry received</h2>
    <p style="margin: 0 0 24px; font-family: Arial, sans-serif; font-size: 14px; color:${COLOR_SLATE};">
      A new enquiry has just come in through the discovery call form on the Shift and Soar website. Details are below.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Full name', name)}
      ${row('Email address', email)}
      ${row('Phone / preferred contact', preferred_contact)}
      ${row('Organisation', organisation)}
      ${row('What they would like support with', support)}
    </table>
    <p style="margin: 24px 0 0; font-family: Arial, sans-serif; font-size: 13px; color:${COLOR_SLATE};">
      Reply directly to this email to respond, or copy the address above into a new message.
    </p>
  `;

  return emailShell({ eyebrow: 'Admin notification', bodyHtml });
}

/* ============================================================================
   =======================  EDIT ADMIN EMAIL — END  ==========================
============================================================================ */


/* ============================================================================
   ======================  EDIT CLIENT EMAIL — START  ========================
   This is the confirmation sent back to whoever filled in the form. Change
   the subject line or the wording below, then commit.
============================================================================ */

const CLIENT_EMAIL_SUBJECT = () => 'Thanks for reaching out to Shift and Soar';

function clientEmailHtml({ name, organisation, support, preferred_contact }) {
  const recapLine = (label, value) => value
    ? `<p style="margin: 0 0 6px; font-family: Arial, sans-serif; font-size: 13px; color:${COLOR_SLATE};"><strong style="color:${COLOR_NAVY};">${safe(label)}:</strong> ${safe(value)}</p>`
    : '';

  const bodyHtml = `
    <h2 style="margin: 0 0 6px; font-weight: 400; font-size: 26px; color:${COLOR_NAVY};">Thank you, ${safe(name)}.</h2>
    <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color:${COLOR_SLATE};">
      Your enquiry has been received, and it means a lot that you reached out. Fealicia will be in touch soon to arrange your discovery call, a free, no pressure conversation about where you are and where you want to be.
    </p>

    <div style="margin: 0 0 24px; padding: 18px 20px; background:${COLOR_CREAM}; border-left: 3px solid ${COLOR_TERRACOTTA}; border-radius: 4px;">
      <p style="margin: 0 0 8px; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color:${COLOR_TERRACOTTA};">
        What you shared
      </p>
      ${recapLine('Organisation', organisation)}
      ${recapLine('Preferred contact', preferred_contact)}
      ${recapLine('Support needed', support)}
    </div>

    <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color:${COLOR_SLATE};">
      In the meantime, feel free to reply directly to this email if anything else comes to mind.
    </p>

    <p style="margin: 28px 0 0; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 16px; color:${COLOR_NAVY};">
      Warmly,<br>Fealicia Greenland<br>
      <span style="font-style: normal; font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color:${COLOR_SLATE};">Founder, Shift and Soar</span>
    </p>
  `;

  return emailShell({ eyebrow: 'Booking confirmation', bodyHtml });
}

/* ============================================================================
   =======================  EDIT CLIENT EMAIL — END  =========================
============================================================================ */


/* ============================================================================
   REQUEST HANDLER
   Every response path below returns JSON, including failure cases, so the
   frontend always has something readable to show the visitor.
============================================================================ */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fail clearly and in JSON if the email library itself did not load.
  if (!Resend) {
    return res.status(500).json({
      error: 'Email service is not configured correctly on the server (the "resend" package is missing). Contact the site administrator.',
    });
  }

  // Fail clearly and in JSON if required environment variables are missing,
  // rather than letting the Resend SDK throw an unclear error later.
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set.');
    return res.status(500).json({ error: 'Email service is not configured (missing API key). Contact the site administrator.' });
  }
  if (!process.env.ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL is not set.');
    return res.status(500).json({ error: 'Email service is not configured (missing admin address). Contact the site administrator.' });
  }

  const { name, email, organisation, support, preferred_contact } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!looksLikeEmail) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const formData = { name, email, organisation, support, preferred_contact };

  try {
    const adminResult = await resend.emails.send({
      from: FROM_ADDRESS,
      to: process.env.ADMIN_EMAIL,          // <-- admin recipient, read from the ADMIN_EMAIL environment variable
      subject: ADMIN_EMAIL_SUBJECT(name),
      html: adminEmailHtml(formData),
    });

    const clientResult = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: CLIENT_EMAIL_SUBJECT(),
      html: clientEmailHtml(formData),
    });

    if (adminResult.error || clientResult.error) {
      console.error('Resend error:', adminResult.error, clientResult.error);
      const detail = (adminResult.error && adminResult.error.message) || (clientResult.error && clientResult.error.message);
      return res.status(502).json({
        error: detail ? `Email delivery failed: ${detail}` : 'One or more emails failed to send.',
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: err && err.message ? `Something went wrong: ${err.message}` : 'Something went wrong. Please try again.',
    });
  }
};
