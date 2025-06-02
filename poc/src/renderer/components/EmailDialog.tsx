import React, { useState, ChangeEvent } from 'react';
import { SummaryData, EmailData } from '../types/interfaces.js';

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => void;
  summary: SummaryData | null;
  isSending?: boolean;
}

/**
 * Email dialog component for sending meeting summaries via email
 */
const EmailDialog: React.FC<EmailDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSend, 
  summary, 
  isSending = false
}) => {
  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [subject, setSubject] = useState<string>(`Meeting Summary: ${summary?.title || 'Untitled Meeting'}`);
  const [message, setMessage] = useState<string>('');
  
  // If the dialog is not open, don't render anything
  if (!isOpen) {
    return null;
  }
  
  // Format summary into email-friendly HTML
  const formatSummaryHtml = (): string => {
    const summaryContent = summary || {} as SummaryData;
    const overallSummary = summaryContent['Overall Summary'] || '';
    const keyPoints = summaryContent['Key Points'] || [];
    const actionItems = summaryContent['Action Items'] || [];
    const decisions = summaryContent['Decisions Made'] || [];
    
    return `
      <h2>Meeting Summary: ${summaryContent.title ?? 'Untitled Meeting'}</h2>
      <h3>Overview</h3>
      <p>${overallSummary}</p>
      
      <h3>Key Points</h3>
      ${keyPoints.length > 0 
        ? `<ul>${keyPoints.map(point => `<li>${point}</li>`).join('')}</ul>` 
        : '<p>No key points recorded.</p>'}
      
      <h3>Action Items</h3>
      ${actionItems.length > 0 
        ? `<ul>${actionItems.map(item => `<li>${item}</li>`).join('')}</ul>` 
        : '<p>No action items recorded.</p>'}
      
      <h3>Decisions Made</h3>
      ${decisions.length > 0 
        ? `<ul>${decisions.map(decision => `<li>${decision}</li>`).join('')}</ul>` 
        : '<p>No decisions recorded.</p>'}
    `;
  };
  
  const formatSummaryText = (): string => {
    const summaryContent = summary || {} as SummaryData;
    const overallSummary = summaryContent['Overall Summary'] || '';
    const keyPoints = summaryContent['Key Points'] || [];
    const actionItems = summaryContent['Action Items'] || [];
    const decisions = summaryContent['Decisions Made'] || [];
    
    return [
      `Meeting Summary: ${summaryContent.title ?? 'Untitled Meeting'}`,
      '\nOVERVIEW',
      overallSummary,
      '\nKEY POINTS',
      ...keyPoints.map(point => `• ${point}`),
      keyPoints.length === 0 ? '• No key points recorded.' : '',
      '\nACTION ITEMS',
      ...actionItems.map(item => `• ${item}`),
      actionItems.length === 0 ? '• No action items recorded.' : '',
      '\nDECISIONS MADE',
      ...decisions.map(decision => `• ${decision}`),
      decisions.length === 0 ? '• No decisions recorded.' : '',
    ].join('\n');
  };
  
  // Handle send email button click
  const handleSend = (): void => {
    if (!to) {
      alert('Please enter at least one recipient email address.');
      return;
    }
    
    const emailData: EmailData = {
      to: to.split(',').map(email => email.trim()),
      cc: cc ? cc.split(',').map(email => email.trim()) : [],
      subject,
      textContent: formatSummaryText(),
      htmlContent: formatSummaryHtml(),
      customMessage: message
    };
    
    onSend(emailData);
  };
  
  return (
    <div className="email-dialog">
      <div className="email-dialog-content">
        <div className="email-dialog-header">
          <h3>Send Meeting Summary</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="email-form">
          <div>
            <label htmlFor="email-to">To:</label>
            <input
              id="email-to"
              type="text"
              value={to}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
              placeholder="recipient@example.com, another@example.com"
            />
          </div>
          
          <div>
            <label htmlFor="email-cc">CC:</label>
            <input
              id="email-cc"
              type="text"
              value={cc}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCc(e.target.value)}
              placeholder="cc@example.com (optional)"
            />
          </div>
          
          <div>
            <label htmlFor="email-subject">Subject:</label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="email-message">Personal Message (Optional):</label>
            <textarea
              id="email-message"
              value={message}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="Add a personal message to include at the beginning of the email..."
              rows={3}
            />
          </div>
          
          <div className="email-preview">
            <label>Preview:</label>
            <div className="email-preview-content">
              <pre>{formatSummaryText()}</pre>
            </div>
          </div>
        </div>
        
        <div className="email-form-actions">
          <button onClick={onClose}>Cancel</button>
          <button 
            onClick={handleSend} 
            disabled={isSending || !to}
            className="save-btn"
          >
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDialog;
