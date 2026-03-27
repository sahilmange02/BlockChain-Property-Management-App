import nodemailer from "nodemailer";
import { logger } from "./logger.js";

// Create transporter for sending emails
// For development/testing: uses Ethereal Email service (fake email)
// For production: configure SMTP credentials in .env
const getTransporter = () => {
    const emailService = process.env.EMAIL_SERVICE || "gmail";
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        logger.warn("Email credentials not configured. Using Ethereal test account.");
        // Return a mock transporter for development
        return {
            sendMail: async (options: any) => {
                logger.info(`[EMAIL STUB] Would send email to: ${options.to}`);
                logger.info(`[EMAIL STUB] Subject: ${options.subject}`);
                logger.info(`[EMAIL STUB] HTML: ${options.html?.substring(0, 100)}...`);
                return { messageId: "stub-message-id" };
            },
        };
    }

    return nodemailer.createTransport({
        service: emailService,
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
};

export const emailService = {
    transporter: getTransporter(),

    async sendVerificationEmail(email: string, verificationToken: string) {
        const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER || "noreply@landregistry.com",
                to: email,
                subject: "Verify Your Email - Land Registry",
                html: `
                    <h2>Email Verification</h2>
                    <p>Thank you for registering with Land Registry!</p>
                    <p>Please click the link below to verify your email address:</p>
                    <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email
                    </a>
                    <p>Or paste this link in your browser:</p>
                    <p>${verificationLink}</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you did not register for an account, please ignore this email.</p>
                `,
            });

            logger.info(`Verification email sent to ${email}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send verification email to ${email}:`, error);
            return false;
        }
    },

    async sendKycApprovalEmail(email: string, userName: string) {
        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER || "noreply@landregistry.com",
                to: email,
                subject: "KYC Verified - Land Registry",
                html: `
                    <h2>KYC Verification Approved</h2>
                    <p>Dear ${userName},</p>
                    <p>Your KYC (Know Your Customer) verification has been approved by the government authority.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Register properties</li>
                        <li>Transfer properties</li>
                        <li>View your property details</li>
                    </ul>
                    <p>Thank you for your trust in Land Registry.</p>
                `,
            });

            logger.info(`KYC approval email sent to ${email}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send KYC approval email to ${email}:`, error);
            return false;
        }
    },

    async sendKycRejectionEmail(email: string, userName: string, reason: string) {
        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER || "noreply@landregistry.com",
                to: email,
                subject: "KYC Verification Status - Land Registry",
                html: `
                    <h2>KYC Verification Update</h2>
                    <p>Dear ${userName},</p>
                    <p>Your KYC (Know Your Customer) verification has been reviewed, and we need some clarification:</p>
                    <p><strong>Reason:</strong> ${reason}</p>
                    <p>Please review your submitted documents and resubmit if necessary.</p>
                    <p>For assistance, please contact our support team.</p>
                `,
            });

            logger.info(`KYC rejection email sent to ${email}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send KYC rejection email to ${email}:`, error);
            return false;
        }
    },
};
