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
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: process.env.MAIL_ENCRYPTION === "SSL", 
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      connectionTimeout: 10000, 
    });

    let html;

    // Email template selection based on type
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

    // Prepare mail options
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: emailAdress || process.env.SITE_OWNER_MAIL,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
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
