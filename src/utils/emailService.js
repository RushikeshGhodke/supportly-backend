import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create reusable transporter with proper credentials
const transporter = nodemailer.createTransport({
    service: "gmail", // Or whatever email service you're using
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

// Email templates
const emailTemplates = {
    teamInvite: (data) => ({
        subject: `Invitation to join ${data.orgName} on AI Support`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0061A1;">Join ${data.orgName}</h1>
        <p>You've been invited to join ${data.orgName} on the AI Support platform.</p>
        <p>You can join in two ways:</p>
        
        <div style="margin: 20px 0;">
          <p><strong>Option 1:</strong> Click the button below to accept the invitation:</p>
          <a href="${data.inviteLink}" style="background-color: #0061A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
          <p><strong>Option 2:</strong> Enter this organization code during signup or in your account:</p>
          <p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${data.inviteCode}</p>
        </div>
        
        <p style="color: #666; font-size: 12px;">If you weren't expecting this invitation, you can ignore this email.</p>
      </div>
    `,
    }),
    otp: (otp) => ({
        subject: "Your Verification Code",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0061A1;">AI Support</h1>
            <p>Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
    `,
    }),
    // Other email templates (like OTP) can be added here
};

// Send email function
const sendEmail = async (to, templateType, data) => {
    try {
        const template = emailTemplates[templateType](data);

        const mailOptions = {
            from: `"AI Support" <${process.env.EMAIL_USER}>`,
            to,
            subject: template.subject,
            html: template.html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
};

export default sendEmail;