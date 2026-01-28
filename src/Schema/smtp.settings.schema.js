const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const smtpSettingsSchema = new Schema(
  {
    mail_mailer: {
      type: String,
      default: "smtp", // optional if only using SMTP
    },
    mail_host: {
      type: String,
      required: [true, "Mail host is required"],
    },
    mail_port: {
      type: String,
      required: [true, "Mail port is required"],
    },
    mail_user_name: {
      type: String,
      required: [true, "Mail user name is required"],
    },
    mail_password: {
      type: String,
      required: [true, "Mail password is required"],
    },
    mail_encryption: {
      type: String,
      required: [true, "Mail encryption is required"],
    },
    mail_from_name: {
      type: String,
      required: [true, "Mail from name is required"],
    },
    mail_from_address: {
      type: String,
      required: [true, "Mail from address is required"],
    },
    super_admin_mail: {
      type: String,
      default: null,
      required: [true, "Super admin email address is required"],
    },
  },
  {
    timestamps: true,
  }
);

const smtpSettings =
  models.smtpSettings || model("smtpSettings", smtpSettingsSchema);
module.exports = {
  smtpSettings,
};
