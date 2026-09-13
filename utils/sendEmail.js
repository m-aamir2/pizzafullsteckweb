const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
  };

  // Local mail catchers (used by the Docker development stack) do not need
  // credentials. Real SMTP providers still receive authenticated transport.
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    };
  }

  transporter = nodemailer.createTransport(config);

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_HOST) {
    console.warn(`[email] SMTP host not configured — skipping email to ${to}: "${subject}"`);
    return;
  }

  const mailTransporter = getTransporter();

  await mailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'Slice House <noreply@slicehouse.local>',
    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;
