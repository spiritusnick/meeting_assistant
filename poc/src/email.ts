import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email configuration interface
interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user?: string;
    pass?: string;
  }
}

// Email data interface
interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  textContent: string;
  htmlContent: string;
  customMessage?: string;
}

// Email settings interface
interface EmailSettings {
  service?: string;
  host?: string;
  port?: string | number;
  secure?: boolean;
  user?: string;
  password?: string;
}

// Default email settings
const defaultSettings: EmailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

/**
 * Create a transporter for sending emails
 * @param settings - Custom email settings (optional)
 * @returns Nodemailer transporter
 */
function createTransporter(settings: Partial<EmailConfig> = {}): nodemailer.Transporter {
  // Merge default settings with custom settings
  const config: EmailConfig = { ...defaultSettings, ...settings };
  
  // Check if required auth credentials exist
  if (!config.auth.user || !config.auth.pass) {
    throw new Error('Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in your .env file.');
  }
  
  return nodemailer.createTransport(config);
}

/**
 * Send an email with meeting summary
 * @param emailData - Email data
 * @returns Promise that resolves with the send result
 */
export async function sendMeetingSummary(emailData: EmailData): Promise<{ success: boolean; messageId: string }> {
  try {
    // Create email transporter
    const transporter = createTransporter();
    
    // Format custom message if present
    const customMessageHtml = emailData.customMessage 
      ? `<p>${emailData.customMessage.replace(/\n/g, '<br>')}</p><hr/>` 
      : '';
    
    const customMessageText = emailData.customMessage 
      ? `${emailData.customMessage}\n\n------------------------\n\n` 
      : '';
    
    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailData.to.join(', '),
      cc: emailData.cc && emailData.cc.length > 0 ? emailData.cc.join(', ') : undefined,
      subject: emailData.subject,
      text: customMessageText + emailData.textContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${customMessageHtml}
          ${emailData.htmlContent}
          <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
            This email was sent from Meeting Assistant application.
          </p>
        </div>
      `
    };
    
    // Send the email
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Save email configuration settings
 * @param config - Email configuration
 * @returns Promise that resolves when settings are saved
 */
export async function saveEmailSettings(config: EmailSettings): Promise<boolean> {
  try {
    // Validate required fields
    if (!config.user || !config.password) {
      throw new Error('Email username and password are required');
    }
    
    // Create a sanitized config to save (without sensitive data directly in env file)
    const emailConfig = {
      EMAIL_SERVICE: config.service || 'gmail',
      EMAIL_HOST: config.host || '',
      EMAIL_PORT: config.port ? config.port.toString() : '',
      EMAIL_SECURE: config.secure ? 'true' : 'false',
      EMAIL_USER: config.user,
      EMAIL_PASS: config.password
    };
    
    // Create a string representation for the .env file
    const envContent = Object.entries(emailConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Save to .env file or to a separate email config file
    const envPath = path.join(__dirname, '../.env');
    let currentEnv = '';
    
    // Read current .env if it exists
    if (fs.existsSync(envPath)) {
      currentEnv = fs.readFileSync(envPath, 'utf8');
    }
    
    // Replace or add email settings
    const envLines = currentEnv.split('\n');
    const updatedLines = envLines.filter(line => !line.startsWith('EMAIL_'));
    
    // Add new email settings
    const updatedEnv = [...updatedLines, envContent].join('\n');
    
    // Write back to .env file
    fs.writeFileSync(envPath, updatedEnv);
    
    // Update environment variables in memory
    Object.entries(emailConfig).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    return true;
  } catch (error) {
    console.error('Error saving email settings:', error);
    throw error;
  }
}

/**
 * Get current email settings
 * @returns Current email settings
 */
export function getEmailSettings(): EmailSettings {
  return {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || '',
    port: process.env.EMAIL_PORT || '',
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || ''
  };
}

// For backward compatibility
module.exports = {
  sendMeetingSummary,
  saveEmailSettings,
  getEmailSettings
};
