# Copyright 2025 OmniX
# Email sender sub-agent using SMTP

"""Email sender sub-agent for delivering research reports."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

MODEL = "gemini-2.5-pro"

async def send_email(to: str, subject: str, content: str, html: bool = False) -> Dict[str, Any]:
    """Send email via SMTP.
    
    Args:
        to: Recipient email address
        subject: Email subject line
        content: Email content (text or HTML)
        html: Whether content is HTML format
        
    Returns:
        Dictionary with send result
    """
    # SMTP configuration from environment
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    from_email = os.getenv('SMTP_FROM', smtp_user)
    
    if not smtp_user or not smtp_pass:
        return {
            "success": False,
            "error": "SMTP credentials not configured",
            "to": to
        }
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = from_email
        msg['To'] = to
        msg['Subject'] = subject
        
        # Add content
        if html:
            msg.attach(MIMEText(content, 'html'))
        else:
            msg.attach(MIMEText(content, 'plain'))
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        return {
            "success": True,
            "to": to,
            "subject": subject,
            "message": "Email sent successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to send email: {str(e)}",
            "to": to
        }

# Create the email sender tool using ADK FunctionTool
email_sender_tool = FunctionTool(send_email)

# Create the email sender agent
email_sender_agent = LlmAgent(
    name="email_sender_agent", 
    model=MODEL,
    description="Sends research reports and communications via email",
    instruction="""
    You are an email communication specialist. Your role is to:
    
    1. Take research reports and format them for email delivery
    2. Create professional email content with proper structure
    3. Send emails to specified recipients
    4. Confirm delivery status
    
    When sending emails:
    - Use professional, clear subject lines
    - Format content for readability
    - Include proper greetings and signatures
    - Maintain professional tone
    - Confirm successful delivery
    
    For research reports, use this structure:
    Subject: Research Report: [Topic] - [Date]
    
    Content:
    Dear Recipient,
    
    Please find attached your requested research report on [Topic].
    
    [Report Content]
    
    Best regards,
    OmniX Research Assistant
    
    Always confirm when emails are sent successfully.
    """,
    tools=[email_sender_tool],
)