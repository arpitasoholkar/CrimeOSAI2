import nodemailer from "nodemailer";

// =========================================================
// CREATE MOCK EMAIL TRANSPORTER
// =========================================================
//
// Nodemailer supports different email providers.
//
// Examples:
//
// Gmail
// Outlook
// SMTP server
// Ethereal
//
// For our hackathon backend, we use Ethereal.
//
// Ethereal is a fake SMTP service made specifically
// for testing emails.
//
// The email is NOT sent to a real bank.
// Instead, Nodemailer gives us a preview URL.
//

const createTransporter = async () => {
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
  // Create our mock email transporter.
  const transporter = await createTransporter();

  // Send the email.
  const info = await transporter.sendMail({
    from: '"Crime OS AI" <crime-os-ai@system.local>',

    to,

    subject,

    html,
  });

  // Nodemailer creates a browser preview URL
  // for Ethereal test emails.
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log("Mock email sent");
  console.log("Message ID:", info.messageId);
  console.log("Preview URL:", previewUrl);

  // Return dispatch information to the controller.
  return {
    messageId: info.messageId,
    previewUrl,
  };
};


// =========================================================
// EXPORT SERVICE
// =========================================================

export {
  sendLegalRequestEmail,
};