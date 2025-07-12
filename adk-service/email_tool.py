# Email sender tool
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

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
        error_msg = str(e)
        if "Application-specific password required" in error_msg:
            return {
                "success": False,
                "error": "Gmail requires an app-specific password. Please:\n1. Enable 2FA on Gmail\n2. Generate app-specific password\n3. Update SMTP_PASS in .env file",
                "to": to
            }
        else:
            return {
                "success": False,
                "error": f"Failed to send email: {error_msg}",
                "to": to
            }