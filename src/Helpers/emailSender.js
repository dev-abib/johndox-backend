require("dotenv").config();

const nodemailer = require("nodemailer");
const {
  PasswordResetTemplate,
  AccountVerificationTemplate,
  RequestTourEmailTemplate,
  ContactFormEmailTemplate,
  UserMailTemplate,
  AccountBannedTemplate,
  AccountUnbannedTemplate,
  AccountDeletedTemplate,
  AccountSelfDeletionTemplate,
  AccountVerificationStatusTemplate,
} = require("./email.template");

const mailSender = async ({ type, name, emailAdress, subject, otp, data }) => {
  try {
    // ── Resend SMTP with alternative port (bypasses common blocks) ────────
    const transporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 2465, 
      secure: true, 
      auth: {
        user: "resend", 
        pass: process.env.RESEND_API_KEY, 
      },

      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    let html;

    // Email template selection based on type (unchanged from your original)
    if (type === "otp") {
      html = PasswordResetTemplate(name, otp, emailAdress);
    }

    if (type === "verify-account") {
      html = AccountVerificationTemplate(name, otp, emailAdress);
    }

    if (type === "request-tour") {
      if (!data) {
        throw new Error("Data is missing for 'request-tour'");
      }
      html = RequestTourEmailTemplate({
        sellerName: data.sellerName,
        propertyName: data.propertyName,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        phoneNumber: data.buyerPhone,
        message: data.message,
        date: data.date,
      });
    }

    if (type === "contact") {
      if (!data) {
        throw new Error("Data is missing for 'contact'");
      }
      html = ContactFormEmailTemplate({
        fullName: data?.fullName,
        email: data?.email,
        phoneNumber: data?.phoneNumber,
        subject: data?.subject,
        message: data?.message,
        submittedAt: data?.createdAt,
      });
    }

    if (type === "admin-mail") {
      if (!data) {
        throw new Error("Data is missing for 'admin-mail'");
      }
      html = UserMailTemplate({
        firstName: data?.firstName,
        lastName: data?.lastName,
        subject: data?.subject,
        message: data?.message,
        sentAt: Date.now(),
      });
    }

    if (type === "account-banned") {
      if (!data) {
        throw new Error("Data is missing for 'account-banned'");
      }
      html = AccountBannedTemplate(data?.name, data?.email, data?.reason);
    }

    if (type === "account-unbanned") {
      if (!data) {
        throw new Error("Data is missing for 'account-unbanned'");
      }
      html = AccountUnbannedTemplate(data?.name, data?.email);
    }

    if (type === "account-delete") {
      if (!data) {
        throw new Error("Data is missing for 'account-delete'");
      }
      html = AccountDeletedTemplate(data?.name, data?.email);
    }

    if (type === "account-delete-self") {
      if (!data) {
        throw new Error("Data is missing for 'account-delete-self'");
      }
      html = AccountSelfDeletionTemplate(data?.name, data?.email);
    }

    if (type === "account-verification-status") {
      if (!data) {
        throw new Error("Data is missing for 'account-verification-status'");
      }
      html = AccountVerificationStatusTemplate(
        data?.name,
        data?.email,
        data?.isVerified
      );
    }

    // Safety check
    if (!html) {
      throw new Error(`Unsupported email type: ${type}`);
    }

    // Prepare mail options
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME || "Your App Name"}" <${process.env.MAIL_FROM_ADDRESS || "onboarding@resend.dev"}>`,
      to: emailAdress || process.env.SITE_OWNER_MAIL,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via Resend:", info.messageId);
    return info;
  } catch (error) {
    console.error(
      "Email sending failed:",
      error.stack || error.message || error
    );
    throw error;
  }
};

module.exports = { mailSender };
