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
const { smtpSettings } = require("../Schema/smtp.settings.schema");

const mailSender = async ({ type, name, emailAdress, subject, otp, data }) => {
  try {
    let smtpSetting = await smtpSettings.findOne();

    if (!smtpSetting) {
      console.warn(
        "No SMTP settings found in database. Falling back to .env variables."
      );
      smtpSetting = {
        mail_host: process.env.MAIL_HOST,
        mail_port: process.env.MAIL_PORT,
        mail_encryption: process.env.MAIL_ENCRYPTION,
        mail_user_name: process.env.MAIL_USERNAME,
        mail_password: process.env.MAIL_PASSWORD,
        mail_from_name: process.env.MAIL_FROM_NAME,
        mail_from_address: process.env.MAIL_FROM_ADDRESS,
        super_admin_mail: process.env.SITE_OWNER_MAIL,
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpSetting.mail_host,
      port: parseInt(smtpSetting.mail_port),
      secure: smtpSetting.mail_encryption === "SSL",
      auth: {
        user: smtpSetting.mail_user_name,
        pass: smtpSetting.mail_password,
      },
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
      html = UserMailTemplate({
        firstName: data?.firstName,
        lastName: data?.lastName,
        subject: data?.subject,
        message: data?.message,
        sentAt: Date.now(),
      });
    }

    if (type === "account-banned") {
      html = AccountBannedTemplate(data?.name, data?.email, data?.reason);
    }

    if (type === "account-unbanned") {
      html = AccountUnbannedTemplate(data?.name, data?.email);
    }

    if (type === "account-delete") {
      html = AccountDeletedTemplate(data?.name, data?.email);
    }

    if (type === "account-delete-self") {
      html = AccountSelfDeletionTemplate(data?.name, data?.email);
    }

    if (type === "account-verification-status") {
      html = AccountVerificationStatusTemplate(
        data?.name,
        data?.email,
        data?.isVerified
      );
    }

    // Prepare mail options
    const mailOptions = {
      from: `"${smtpSetting.mail_from_name}" <${smtpSetting.mail_from_address}>`,
      to:
        emailAdress ||
        smtpSetting.super_admin_mail ||
        process.env.SITE_OWNER_MAIL,
      subject,
      html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(
      "Email sending failed:",
      error || error.code || error.message
    );
    throw error;
  }
};

module.exports = { mailSender };
