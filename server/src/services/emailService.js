const nodemailer = require('nodemailer');
const settingsService = require('./settingsService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }
  
  async initialize() {
    try {
      // Get email settings from settings service
      const smtpHost = await settingsService.getSettingValue('smtp_host') || '';
      const smtpPort = await settingsService.getSettingValue('smtp_port') || '587';
      const smtpUser = await settingsService.getSettingValue('smtp_user') || '';
      const smtpPass = await settingsService.getSettingValue('smtp_password') || '';
      const emailFrom = await settingsService.getSettingValue('email_from') || 'noreply@webssh.example.com';
      
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      
      this.emailFrom = emailFrom;
      this.initialized = true;
      
      console.log('Email service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return false;
    }
  }
  
  async sendPasswordResetEmail(to, resetLink, username) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }
    
    const siteName = await settingsService.getSettingValue('site_name') || 'IntelliSSH';
    
    const mailOptions = {
      from: this.emailFrom,
      to,
      subject: `Password Reset Request - ${siteName}`,
      text: `
Hello ${username},

You recently requested to reset your password for your ${siteName} account. Click the link below to reset it:

${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email or contact an administrator if you have concerns.

Thanks,
The ${siteName} Team
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
  <h2 style="color: #4F46E5;">Password Reset Request</h2>
  <p>Hello <strong>${username}</strong>,</p>
  <p>You recently requested to reset your password for your ${siteName} account. Click the button below to reset it:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Your Password</a>
  </p>
  <p>This link will expire in 1 hour.</p>
  <p>If you did not request a password reset, please ignore this email or contact an administrator if you have concerns.</p>
  <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    Thanks,<br>
    The ${siteName} Team
  </p>
  <p style="font-size: 12px; color: #999;">If the button above doesn't work, copy and paste this link into your browser: ${resetLink}</p>
</div>
      `
    };
    
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }
  
  // Test email configuration
  async testEmailConfig() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }
    
    try {
      const result = await this.transporter.verify();
      return { success: true, message: 'Email configuration verified successfully' };
    } catch (error) {
      console.error('Email configuration verification failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
