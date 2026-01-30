const PasswordResetTemplate = (name, otp, email) => {
  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #333333;
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          color: #4A90E2;
          margin: 20px 0;
          text-align: center;
          padding: 15px;
          border: 2px dashed #4A90E2;
          border-radius: 5px;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 25px;
          font-size: 16px;
          color: #ffffff;
          background-color: #4A90E2;
          text-decoration: none;
          border-radius: 5px;
          text-align: center;
          margin-top: 20px;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #357ABD;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
        .footer a {
          color: #4A90E2;
          text-decoration: none;
        }
      </style>
    </head>
    <body>

      <div class="container">
        <h2>Hello ${name},</h2>
        <p>We received a request to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>

        <div class="otp">${otp}</div>

        <p>This OTP is valid for 2 minutes. If you did not request this, please ignore this email.</p>

       <p class="footer">This email was sent to: <strong>${email}</strong>. If you did not request a password reset, please <a href="<%= contactSupportLink %>">contact support</a>.</p>
      </div>

    </body>
  </html>
  `;
};

const AccountVerificationTemplate = (name, otp, email) => {
  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #333333;
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          color: #28a745;
          margin: 20px 0;
          text-align: center;
          padding: 15px;
          border: 2px dashed #28a745;
          border-radius: 5px;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 25px;
          font-size: 16px;
          color: #ffffff;
          background-color: #28a745;
          text-decoration: none;
          border-radius: 5px;
          text-align: center;
          margin-top: 20px;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #1f7a36;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
        .footer a {
          color: #28a745;
          text-decoration: none;
        }
      </style>
    </head>
    <body>

      <div class="container">
        <h2>Welcome ${name},</h2>
        <p>Thank you for signing up! To complete your registration, please verify your email address by entering the OTP below:</p>

        <div class="otp">${otp}</div>

        <p>This OTP is valid for 2 minutes. Please do not share it with anyone.</p>

        <p class="footer">This verification email was sent to: <strong>${email}</strong>.  
        If you didn’t create an account, just simple ignore it.</p>
      </div>
    </body>
  </html>
  `;
};

const RequestTourEmailTemplate = ({
  sellerName,
  propertyName,
  buyerName,
  buyerEmail,
  phoneNumber,
  message,
  date,
}) => {
  const formattedDate = date ? new Date(date).toDateString() : "Not selected";

  const safe = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeSellerName = safe(sellerName || "there");
  const safePropertyName = safe(propertyName || "your property");
  const safeBuyerName = safe(buyerName || "-");
  const safeBuyerEmail = safe(buyerEmail || "-");
  const safePhone = safe(phoneNumber || "-");
  const safeMessage = safe(message || "-").replace(/\n/g, "<br/>");
  const safeFormattedDate = safe(formattedDate);

  const cleanPhoneForTel = phoneNumber
    ? String(phoneNumber).replace(/\s+/g, "")
    : "";

  const mailtoLink = `mailto:${encodeURIComponent(
    buyerEmail || ""
  )}?subject=${encodeURIComponent(
    `Tour request for: ${propertyName || "Property"}`
  )}&body=${encodeURIComponent(
    `Hi ${buyerName || ""},\n\nThanks for your tour request.\n\nProperty: ${
      propertyName || ""
    }\nPreferred date: ${formattedDate}\nPhone: ${phoneNumber || ""}\n\n—`
  )}`;

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>New Tour Request</title>
      <style>
        /* Some clients strip head styles, but keeping minimal helps in Gmail/Web */
        @media (max-width: 600px) {
          .container { width: 100% !important; }
          .px { padding-left: 16px !important; padding-right: 16px !important; }
          .btn { display: block !important; width: 100% !important; }
          .btn + .btn { margin-top: 10px !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#f3f5f9;">
      <!-- Preheader (hidden preview text) -->
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        A buyer requested a tour for ${safePropertyName}. View details and reply quickly.
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f9; padding:24px 0;">
        <tr>
          <td align="center" style="padding:0 12px;">
            <table role="presentation" class="container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px; max-width:640px;">
              <!-- Top brand bar -->
              <tr>
                <td style="padding:0 0 14px 0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="left" style="font-family:Arial, sans-serif; font-size:12px; letter-spacing:1px; color:#2563eb; font-weight:700; text-transform:uppercase;">
                        Terralink
                      </td>
                      <td align="right" style="font-family:Arial, sans-serif; font-size:12px; color:#94a3b8;">
                        Tour Request
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Card -->
              <tr>
                <td style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(2,6,23,0.10);">
                  
                  <!-- Header -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);">
                    <tr>
                      <td class="px" style="padding:22px 24px; font-family:Arial, sans-serif; color:#ffffff;">
                        <div style="font-size:18px; font-weight:800; margin:0 0 6px 0;">
                          New tour request received
                        </div>
                        <div style="font-size:13px; line-height:1.6; opacity:0.95;">
                          Hi ${safeSellerName}, a buyer requested a tour for
                          <span style="font-weight:700;">${safePropertyName}</span>.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Body -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td class="px" style="padding:20px 24px; font-family:Arial, sans-serif;">
                        
                        <!-- Buyer details title -->
                        <div style="font-size:12px; font-weight:800; letter-spacing:0.6px; color:#475569; text-transform:uppercase; margin-bottom:10px;">
                          Buyer details
                        </div>

                        <!-- Details table -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e7ecf5; border-radius:12px; overflow:hidden;">
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; width:160px; font-size:13px; color:#64748b; font-family:Arial, sans-serif;">Name</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700; font-family:Arial, sans-serif;">${safeBuyerName}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; width:160px; font-size:13px; color:#64748b; font-family:Arial, sans-serif;">Email</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700; font-family:Arial, sans-serif;">${safeBuyerEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; width:160px; font-size:13px; color:#64748b; font-family:Arial, sans-serif;">Phone</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700; font-family:Arial, sans-serif;">${safePhone}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; width:160px; font-size:13px; color:#64748b; font-family:Arial, sans-serif;">Preferred date</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700; font-family:Arial, sans-serif;">${safeFormattedDate}</td>
                          </tr>
                        </table>

                        <!-- Message -->
                        <div style="font-size:12px; font-weight:800; letter-spacing:0.6px; color:#475569; text-transform:uppercase; margin:18px 0 10px;">
                          Message
                        </div>

                        <div style="background:#f8fafc; border:1px solid #e7ecf5; border-radius:12px; padding:14px; font-size:14px; line-height:1.7; color:#334155; font-family:Arial, sans-serif;">
                          ${safeMessage}
                        </div>

                        <!-- Buttons -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
                          <tr>
                            <td>
                              <a class="btn" href="${mailtoLink}"
                                 style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 16px; border-radius:12px; font-family:Arial, sans-serif; font-size:14px; font-weight:800;">
                                Reply to buyer
                              </a>
                              ${
                                phoneNumber
                                  ? `<a class="btn" href="tel:${cleanPhoneForTel}"
                                       style="display:inline-block; margin-left:10px; background:#ffffff; color:#0f172a; text-decoration:none; padding:12px 16px; border-radius:12px; font-family:Arial, sans-serif; font-size:14px; font-weight:800; border:1px solid #e7ecf5;">
                                        Call buyer
                                     </a>`
                                  : ""
                              }
                            </td>
                          </tr>
                        </table>

                        <!-- Small helper note -->
                        <div style="margin-top:14px; font-size:12px; color:#64748b; line-height:1.6; font-family:Arial, sans-serif;">
                          Tip: You can reply directly from your email client — set <b>Reply-To</b> to the buyer’s email for fastest communication.
                        </div>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="border-top:1px solid #eef2f7; padding:16px 24px; font-family:Arial, sans-serif; font-size:12px; color:#94a3b8; line-height:1.6;">
                        This request was sent from your Terralink listing.<br/>
                        <span style="color:#cbd5e1;">If you didn’t expect this email, you can safely ignore it.</span>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Bottom spacing -->
              <tr><td style="height:16px;"></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const ContactFormEmailTemplate = ({
  fullName,
  email,
  phoneNumber,
  subject,
  message,
  submittedAt,
}) => {
  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
    : "Just now";

  // Safe HTML escaping
  const safe = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeFullName = safe(fullName || "Visitor");
  const safeEmail = safe(email || "-");
  const safePhone = safe(phoneNumber || "-");
  const safeSubject = safe(subject || "(No subject)");
  const safeMessage = safe(message || "-").replace(/\n/g, "<br/>");
  const safeFormattedDate = safe(formattedDate);

  // Clean phone for tel: link
  const cleanPhoneForTel = phoneNumber
    ? String(phoneNumber)
        .replace(/\s+/g, "")
        .replace(/[^\d+]/g, "")
    : "";

  // Mailto reply link
  const mailtoLink = `mailto:${encodeURIComponent(
    email || ""
  )}?subject=${encodeURIComponent(
    `Re: ${subject || "Your message to us"}`
  )}&body=${encodeURIComponent(
    `Hi ${
      fullName || "there"
    },\n\nThank you for reaching out! We'll get back to you soon.\n\nYour original message:\n"${
      subject ? subject + "\n\n" : ""
    }${message || ""}"\n\nBest regards,\nThe Team`
  )}`;

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>New Contact Message</title>
      <style>
        @media (max-width: 600px) {
          .container { width: 100% !important; }
          .px { padding-left: 16px !important; padding-right: 16px !important; }
          .btn { display: block !important; width: 100% !important; box-sizing: border-box; }
          .btn + .btn { margin-top: 12px !important; margin-left: 0 !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#f3f5f9;">
      <!-- Hidden preheader text -->
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
        New message from ${safeFullName} via contact form: "${safeSubject}"
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f9; padding:24px 0;">
        <tr>
          <td align="center" style="padding:0 12px;">
            <table role="presentation" class="container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px; max-width:640px;">
              <!-- Top brand bar -->
              <tr>
                <td style="padding:0 0 14px 0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="left" style="font-family:Arial, sans-serif; font-size:12px; letter-spacing:1px; color:#2563eb; font-weight:700; text-transform:uppercase;">
                        Terralink
                      </td>
                      <td align="right" style="font-family:Arial, sans-serif; font-size:12px; color:#94a3b8;">
                        Contact Form Submission
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Card -->
              <tr>
                <td style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(2,6,23,0.10);">
                  
                  <!-- Header -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);">
                    <tr>
                      <td class="px" style="padding:22px 24px; font-family:Arial, sans-serif; color:#ffffff;">
                        <div style="font-size:18px; font-weight:800; margin:0 0 6px 0;">
                          New message received
                        </div>
                        <div style="font-size:13px; line-height:1.6; opacity:0.95;">
                          Someone just submitted the contact form on your website.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Body -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td class="px" style="padding:20px 24px; font-family:Arial, sans-serif;">
                        
                        <!-- Sender details title -->
                        <div style="font-size:12px; font-weight:800; letter-spacing:0.6px; color:#475569; text-transform:uppercase; margin-bottom:10px;">
                          Sender details
                        </div>

                        <!-- Details table -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e7ecf5; border-radius:12px; overflow:hidden;">
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; width:160px; font-size:13px; color:#64748b; font-family:Arial, sans-serif;">Name</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700; font-family:Arial, sans-serif;">${safeFullName}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; font-size:13px; color:#64748b;">Email</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700;">${safeEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; font-size:13px; color:#64748b;">Phone</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700;">${safePhone}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; font-size:13px; color:#64748b;">Subject</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700;">${safeSubject}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 14px; background:#f8fafc; font-size:13px; color:#64748b;">Submitted</td>
                            <td style="padding:12px 14px; font-size:14px; color:#0f172a; font-weight:700;">${safeFormattedDate}</td>
                          </tr>
                        </table>

                        <!-- Message -->
                        <div style="font-size:12px; font-weight:800; letter-spacing:0.6px; color:#475569; text-transform:uppercase; margin:18px 0 10px;">
                          Message
                        </div>

                        <div style="background:#f8fafc; border:1px solid #e7ecf5; border-radius:12px; padding:16px; font-size:14px; line-height:1.7; color:#334155; font-family:Arial, sans-serif;">
                          ${safeMessage}
                        </div>

                        <!-- Action Buttons -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
                          <tr>
                            <td>
                              <a class="btn" href="${mailtoLink}"
                                 style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:14px 20px; border-radius:12px; font-family:Arial, sans-serif; font-size:14px; font-weight:800;">
                                Reply via Email
                              </a>
                              ${
                                phoneNumber
                                  ? `<a class="btn" href="tel:${cleanPhoneForTel}"
                                       style="display:inline-block; margin-left:12px; background:#ffffff; color:#0f172a; text-decoration:none; padding:14px 20px; border-radius:12px; font-family:Arial, sans-serif; font-size:14px; font-weight:800; border:1px solid #e7ecf5;">
                                        Call Sender
                                     </a>`
                                  : ""
                              }
                            </td>
                          </tr>
                        </table>

                        <!-- Tip -->
                        <div style="margin-top:16px; font-size:12px; color:#64748b; line-height:1.6; font-family:Arial, sans-serif;">
                          <strong>Tip:</strong> Click "Reply via Email" to respond directly — it pre-fills a polite thank-you template.
                        </div>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="border-top:1px solid #eef2f7; padding:18px 24px; font-family:Arial, sans-serif; font-size:12px; color:#94a3b8; line-height:1.6;">
                        This message was sent via the contact form on your website.<br/>
                        <span style="color:#cbd5e1;">If this looks like spam, feel free to ignore or mark it.</span>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Bottom spacing -->
              <tr><td style="height:16px;"></td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const UserMailTemplate = ({
  firstName,
  lastName,
  subject,
  message,
  sentAt,
}) => {
  const formattedDate = sentAt
    ? new Date(sentAt).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
    : "Just now";

  const safe = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeName =
    safe(`${firstName || ""} ${lastName || ""}`.trim()) || "there";
  const safeSubject = safe(subject || "Message from our team");
  const safeMessage = safe(message || "").replace(/\n/g, "<br/>");
  const safeDate = safe(formattedDate);

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeSubject}</title>
      <style>
        @media (max-width: 600px) {
          .container { width: 100% !important; }
          .px { padding-left: 16px !important; padding-right: 16px !important; }
        }
      </style>
    </head>

    <body style="margin:0; padding:0; background:#f3f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
        <tr>
          <td align="center">

            <table class="container" width="600" cellpadding="0" cellspacing="0"
              style="background:#ffffff; border-radius:16px; box-shadow:0 12px 32px rgba(2,6,23,0.08); overflow:hidden;">

              <!-- Header -->
              <tr>
                <td class="px"
                  style="padding:26px 24px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#ffffff; font-family:Arial, sans-serif;">
                  <div style="font-size:18px; font-weight:800; margin-bottom:6px;">
                    ${safeSubject}
                  </div>
                  <div style="font-size:13px; opacity:0.95;">
                    A message from the Terralink team
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td class="px" style="padding:26px 24px; font-family:Arial, sans-serif; color:#0f172a;">

                  <p style="font-size:14px; line-height:1.7; margin:0 0 14px;">
                    Hello <strong>${safeName}</strong>,
                  </p>

                  <div
                    style="background:#f8fafc; border:1px solid #e7ecf5; border-radius:12px; padding:16px; font-size:14px; line-height:1.8; color:#334155;">
                    ${safeMessage}
                  </div>

                  <p style="font-size:13px; color:#64748b; margin-top:18px;">
                    Sent on ${safeDate}
                  </p>

                  <p style="font-size:14px; margin-top:22px;">
                    If you have any questions or need further help, feel free to reply to this email.
                  </p>

                  <p style="font-size:14px; margin-top:20px;">
                    Warm regards,<br/>
                    <strong>Terralink Support Team</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td
                  style="border-top:1px solid #eef2f7; padding:16px 24px; font-family:Arial, sans-serif; font-size:12px; color:#94a3b8;">
                  This email was sent by Terralink. Please do not share sensitive information via email.
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const AccountBannedTemplate = (
  name,
  email,
  reason = "a violation of our terms"
) => {
  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #d9534f;
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
        }
        .alert {
          background-color: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
          text-align: center;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hello ${name},</h2>

        <p>We regret to inform you that your account has been temporarily restricted.</p>

        <div class="alert">
          Your account has been banned due to ${reason}.
        </div>

        <p>If you believe this was a mistake or need further clarification, please contact our support team.</p>

        <p class="footer">
          This notification was sent to <strong>${email}</strong>.
        </p>
      </div>
    </body>
  </html>
  `;
};

const AccountUnbannedTemplate = (name, email) => {
  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #28a745;
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
          text-align: center;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Good news ${name},</h2>

        <div class="success">
          Your account has been successfully reactivated.
        </div>

        <p>You now have full access to your account again. Please make sure to follow our community guidelines going forward.</p>

        <p class="footer">
          This notification was sent to <strong>${email}</strong>.
        </p>
      </div>
    </body>
  </html>
  `;
};

const AccountDeletedTemplate = (name, email) => {
  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #dc3545;
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
        }
        .notice {
          background-color: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
          text-align: center;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hello ${name},</h2>

        <div class="notice">
          Your account has been permanently deleted and you're permanently restricted from this site. For violating our policies multiple time.
        </div>

        <p>
          This action means that your account and all associated data have been removed from our system and can no longer be recovered.
        </p>

        <p>
          If you believe this action was taken in error or you need further assistance, please contact our support team as soon as possible.
        </p>

        <p class="footer">
          This notification was sent to <strong>${email}</strong>.
        </p>
      </div>
    </body>
  </html>
  `;
};

const AccountSelfDeletionTemplate = (name, email) => {
  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #dc3545;
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
          line-height: 1.5;
        }
        .notice {
          background-color: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
          text-align: center;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
        a {
          color: #dc3545;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hello ${name},</h2>

        <div class="notice">
          Your account has been permanently deleted as per your request.
        </div>

        <p>
          All your account data, including profile information, messages, properties, and other associated data, has been removed from our system and cannot be recovered.
        </p>

        <p>
          If you did not request this deletion or believe this was a mistake, please contact our support team</a> immediately.
        </p>

        <p class="footer">
          This notification was sent to <strong>${email}</strong>. Thank you for using our service.
        </p>
      </div>
    </body>
  </html>
  `;
};

const AccountVerificationStatusTemplate = (name, email, isVerified) => {
  const statusText = isVerified ? "verified" : "unverified";
  const statusColor = isVerified ? "#28a745" : "#dc3545"; 
  const statusMessage = isVerified
    ? "Congratulations! Your account has been successfully verified."
    : "Your account verification has been removed by the admin.";

  return `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: ${statusColor};
          font-size: 24px;
        }
        p {
          font-size: 16px;
          color: #555555;
          line-height: 1.5;
        }
        .status-box {
          font-size: 18px;
          font-weight: bold;
          color: ${statusColor};
          background-color: ${isVerified ? "#d4edda" : "#f8d7da"};
          padding: 15px;
          border-radius: 5px;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hello ${name},</h2>

        <div class="status-box">
          ${statusMessage}
        </div>

        <p>
          Your account is now marked as <strong>${statusText}</strong>. Please note that some features may depend on your verification status.
        </p>

        <p class="footer">
          This notification was sent to <strong>${email}</strong>.
        </p>
      </div>
    </body>
  </html>
  `;
};



module.exports = {
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
};
