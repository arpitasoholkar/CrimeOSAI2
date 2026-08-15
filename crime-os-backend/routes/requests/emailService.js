import nodemailer from "nodemailer";

// =========================================================
// CREATE TRANSPORTER
// =========================================================
//
// Two modes:
//
// 1. REAL — if GMAIL_USER + GMAIL_APP_PASSWORD are set in
//    crime-os-backend/.env, we send through actual Gmail SMTP
//    and the request lands in the recipient's real inbox.
//
//    GMAIL_APP_PASSWORD must be a Google "App Password"
//    (Google Account -> Security -> 2-Step Verification ->
//    App Passwords), NOT your normal Gmail login password —
//    Gmail rejects normal passwords for SMTP.
//
// 2. MOCK (fallback) — if those env vars are missing, we fall
//    back to Ethereal, a fake SMTP service for testing. Nothing
//    is delivered; Nodemailer gives back a preview URL instead.
//    This keeps the app working out of the box with zero setup.
//

const isRealEmailConfigured = () =>
  Boolean(
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD
  );

const createTransporter = async () => {
  if (isRealEmailConfigured()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Create a temporary Ethereal test account.
  const testAccount = await nodemailer.createTestAccount();

  // Create the SMTP transporter.
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",

    port: 587,

    secure: false,

    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
};


// =========================================================
// SEND LEGAL REQUEST EMAIL
// =========================================================

const sendLegalRequestEmail = async ({
  to,
  subject,
  html,
}) => {
  const usingRealEmail = isRealEmailConfigured();

  const transporter = await createTransporter();

  // Send the email.
  const info = await transporter.sendMail({
    from: usingRealEmail
      ? `"Crime OS AI" <${process.env.GMAIL_USER}>`
      : '"Crime OS AI" <crime-os-ai@system.local>',

    to,

    subject,

    html,
  });

  // Ethereal test emails get a browser preview URL.
  // Real Gmail sends don't have one — the message actually
  // went to the recipient's inbox instead.
  const previewUrl = usingRealEmail
    ? null
    : nodemailer.getTestMessageUrl(info);

  if (usingRealEmail) {
    console.log("Real email sent via Gmail SMTP");
    console.log("Message ID:", info.messageId);
    console.log("Delivered to:", to);
  } else {
    console.log("Mock email sent (Ethereal — no GMAIL_USER/GMAIL_APP_PASSWORD set)");
    console.log("Message ID:", info.messageId);
    console.log("Preview URL:", previewUrl);
  }

  // Return dispatch information to the controller.
  return {
    messageId: info.messageId,
    previewUrl,
    delivered: usingRealEmail,
  };
};


// =========================================================
// EXPORT SERVICE
// =========================================================

export {
  sendLegalRequestEmail,
};