import React, { useState } from 'react';

interface SummaryProps {
  summary: any;
  onEdit?: (summary: any) => void; // Making this optional since it's not used
  onSave?: (summary: any) => void;
  onEmail?: (summary: any) => void;
  isEditable?: boolean;
  isSaving?: boolean;
  showEmailButton?: boolean;
}

/**
 * Component to display meeting summary with sections for key points, action items, and decisions
 */
const Summary: React.FC<SummaryProps> = ({ 
  summary, 
  onEdit,  // Now optional
  onSave, 
  onEmail,
  isEditable = true,
  isSaving = false,
  showEmailButton = true
}) => {
  // State for the meeting title and editable summary sections
  const [title, setTitle] = useState(summary?.title || 'Untitled Meeting');
  const [overallSummary, setOverallSummary] = useState(summary?.['Overall Summary'] || '');
  const [keyPoints, setKeyPoints] = useState(summary?.['Key Points'] || []);
  const [actionItems, setActionItems] = useState(summary?.['Action Items'] || []);
  const [decisions, setDecisions] = useState(summary?.['Decisions Made'] || []);
  
  // Function to add a new bullet point to a section
  const addBulletPoint = (section: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter([...section, '']);
  };
  
  // Function to update a specific bullet point
  const updateBulletPoint = (section: string[], index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const updatedSection = [...section];
    updatedSection[index] = value;
    setter(updatedSection);
  };
  
  // Function to remove a bullet point
  const removeBulletPoint = (section: string[], index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const updatedSection = [...section];
    updatedSection.splice(index, 1);
    setter(updatedSection);
  };
  
  // Function to compile the edited summary
  const getEditedSummary = () => {
    return {
      title,
      'Overall Summary': overallSummary,
      'Key Points': keyPoints.filter(item => item.trim().length > 0),
      'Action Items': actionItems.filter(item => item.trim().length > 0),
      'Decisions Made': decisions.filter(item => item.trim().length > 0)
    };
  };
  
  // Handler for save button
  const handleSave = () => {
    if (onSave) {
      onSave(getEditedSummary());
    }
  };
  
  // Handler for email button
  const handleEmail = () => {
    if (onEmail) {
      onEmail(getEditedSummary());
    }
  };
  
  // Render a editable or readonly list of items
  const renderList = (
    items: string[], 
    updateFn: (index: number, value: string) => void, 
    removeFn: (index: number) => void, 
    addFn?: () => void
  ) => {
    if (!items || items.length === 0) {
      return isEditable ? (
        <div className="empty-list">
          <p>No items. {addFn && <button onClick={addFn}>Add Item</button>}</p>
        </div>
      ) : (
        <div className="empty-list">
          <p>No items.</p>
        </div>
      );
    }
    
    return (
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {isEditable ? (
              <div className="editable-item">
                <input 
                  type="text" 
                  value={item} 
                  onChange={(e) => updateFn(index, e.target.value)} 
                  placeholder="Enter item..." 
                />
                <button 
                  onClick={() => removeFn(index)} 
                  className="remove-btn"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span>{item}</span>
            )}
          </li>
        ))}
        {isEditable && addFn && (
          <li className="add-item">
            <button onClick={addFn}>+ Add Item</button>
          </li>
        )}
      </ul>
    );
  };
  
  return (
    <div className="summary-container">
      <div className="summary-header">
        <h2>Meeting Summary</h2>
        {isEditable && (
          <div className="title-container">
            <label htmlFor="meeting-title">Meeting Title:</label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter meeting title..."
            />
          </div>
        )}
      </div>
      
      <div className="summary-section">
        <h3>Overall Summary</h3>
        {isEditable ? (
          <textarea
            value={overallSummary}
            onChange={(e) => setOverallSummary(e.target.value)}
            placeholder="Enter a brief summary of the meeting..."
            rows={4}
          />
        ) : (
          <p>{overallSummary || 'No summary available.'}</p>
        )}
      </div>
      
      <div className="summary-section">
        <h3>Key Points</h3>
        {renderList(
          keyPoints,
          (index, value) => updateBulletPoint(keyPoints, index, value, setKeyPoints),
          (index) => removeBulletPoint(keyPoints, index, setKeyPoints),
          () => addBulletPoint(keyPoints, setKeyPoints)
        )}
      </div>
      
      <div className="summary-section">
        <h3>Action Items</h3>
        {renderList(
          actionItems,
          (index, value) => updateBulletPoint(actionItems, index, value, setActionItems),
          (index) => removeBulletPoint(actionItems, index, setActionItems),
          () => addBulletPoint(actionItems, setActionItems)
        )}
      </div>
      
      <div className="summary-section">
        <h3>Decisions Made</h3>
        {renderList(
          decisions,
          (index, value) => updateBulletPoint(decisions, index, value, setDecisions),
          (index) => removeBulletPoint(decisions, index, setDecisions),
          () => addBulletPoint(decisions, setDecisions)
        )}
      </div>
      
      <div className="summary-actions">
        {isEditable && onSave && (
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="save-btn"
          >
            {isSaving ? 'Saving...' : 'Save Summary'}
          </button>
        )}
        
        {showEmailButton && onEmail && (
          <button 
            onClick={handleEmail}
            className="email-btn"
          >
            Email Summary
          </button>
        )}
      </div>
    </div>
  );
};

export default Summary;
