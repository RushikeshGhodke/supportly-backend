import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/**
 * Send invitation email to team members
 * @param {Object} data - Email data
 * @param {string} data.email - Recipient email
 * @param {string} data.inviteLink - Invitation link with token
 * @param {string} data.inviteCode - Organization invite code
 * @param {string} data.organizationName - Name of the organization
 * @param {string} data.inviterName - Name of the person sending the invite
 * @param {string} data.role - Role being assigned to the invitee
 */
export const sendInvitationEmail = async (data) => {
    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: `Invitation to join ${data.organizationName} on Customer Support`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0061A1;">Join ${data.organizationName}</h1>
        </div>
        
        <p>Hello,</p>
        <p>${data.inviterName} has invited you to join ${data.organizationName} on Customer Support as a <strong>${data.role}</strong>.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
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
    });
};

/**
 * Send verification email with OTP
 * @param {Object} data - Email data 
 * @param {string} data.email - Recipient email
 * @param {string} data.otp - One-time password
 */
export const sendVerificationEmail = async (data) => {
    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: "Verify Your Email - Customer Support",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0061A1;">Verify Your Email</h1>
        </div>
        
        <p>Hello,</p>
        <p>Thank you for registering with Customer Support. Please use the verification code below to complete your registration:</p>
        
        <div style="margin: 20px 0; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            ${data.otp}
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 10px;">This code will expire in 10 minutes.</p>
        </div>
        
        <p>If you did not request this verification, please ignore this email.</p>
      </div>
    `,
    });
};

export default {
    sendInvitationEmail,
    sendVerificationEmail
};