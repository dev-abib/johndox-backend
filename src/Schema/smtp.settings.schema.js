const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const smtpSettingsSchema = new Schema(
  {
    mail_mailer: {
      type: String,
      required: [true, "Mailer name is required"],
      default: null,
    },
    mail_host: {
      type: String,
      required: [true, "Mail host is required"],
      default: null,
    },
    mail_port: {
      type: Number,
      required: [true, "Mail Port is required"],
      default: null,
    },
    mail_user_name: {
      type: String,
      required: [true, "Mail user name required"],
      default: null,
    },
    mail_password: {
      type: String,
      required: [true, "mail password is required"],
      default: null,
    },
    mail_encryption: {
      type: String,
      required: [true, "Mail encryption info is required"],
      default: null,
    },
    mail_from_name: {
      type: String,
      required: [true, "Mail from name is required"],
      default: null,
    },

    mail_from_address: {
      type: String,
      required: [true, "Mail from address is required"],
      default: null,
    },
    super_admin_mail: {
      type: String,
      required: [true, "super admin email address is required"],
      default: null,
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
