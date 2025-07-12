/**
 * ADK Email Tool - SMTP Integration
 * Implements ADK tool pattern for email functionality
 */

import { ADKTool, ToolConfig, ToolResult } from './ADKTool';

export class ADKEmailTool extends ADKTool {
  private nodemailer: any = null;
  private transporter: any = null;

  constructor() {
    const config: ToolConfig = {
      name: 'email-sender',
      description: 'Send emails using SMTP configuration',
      category: 'communication',
      parameters: [
        {
          name: 'to',
          type: 'string',
          description: 'Recipient email address',
          required: true
        },
        {
          name: 'subject',
          type: 'string',
          description: 'Email subject line',
          required: true
        },
        {
          name: 'content',
          type: 'string',
          description: 'Email content (text or HTML)',
          required: true
        },
        {
          name: 'html',
          type: 'boolean',
          description: 'Whether content is HTML format',
          required: false,
          default: false
        }
      ],
      requiredPermissions: ['email_send']
    };

    super(config);
    this.initializeEmailer();
  }

  /**
   * Initialize email transport
   */
  private async initializeEmailer(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        this.nodemailer = require('nodemailer');
        
        const emailConfig = {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        };

        if (emailConfig.auth.user && emailConfig.auth.pass) {
          this.transporter = this.nodemailer.createTransport(emailConfig);
          console.log('📧 ADK Email Tool initialized with SMTP');
        } else {
          console.warn('⚠️ ADK Email Tool: SMTP credentials not configured');
        }
      }
    } catch (error) {
      console.warn('⚠️ ADK Email Tool: Failed to initialize nodemailer', error);
    }
  }

  /**
   * Execute email sending
   */
  async execute(parameters: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate parameters
      this.validateParameters(parameters);

      const {
        to,
        subject,
        content,
        html = false
      } = parameters;

      console.log(`📧 ADK Email: Sending to ${to}`);

      // Check if email is available
      if (!this.transporter) {
        return this.createResult(
          false,
          undefined,
          'Email service not configured. Please set SMTP environment variables.',
          {
            executionTime: Date.now() - startTime,
            cost: 0,
            tokensUsed: 0
          }
        );
      }

      // Prepare email options
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        ...(html ? { html: content } : { text: content })
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      const executionTime = Date.now() - startTime;

      console.log(`✅ ADK Email sent successfully: ${info.messageId}`);

      return this.createResult(
        true,
        {
          messageId: info.messageId,
          to,
          subject,
          sentAt: new Date().toISOString()
        },
        undefined,
        {
          executionTime,
          cost: 0.01, // Simple cost model for email
          tokensUsed: subject.length + content.length
        }
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Email sending failed';
      
      console.error(`❌ ADK Email failed: ${errorMessage}`);

      return this.createResult(
        false,
        undefined,
        errorMessage,
        {
          executionTime,
          cost: 0,
          tokensUsed: 0
        }
      );
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return !!this.transporter;
  }

  /**
   * Health check for email service
   */
  async healthCheck(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract email addresses from text
   */
  static extractEmailFromText(text: string): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailRegex);
    return matches ? matches[0] : null;
  }
}