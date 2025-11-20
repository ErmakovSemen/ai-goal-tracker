import React, { useState } from 'react';
import './ReportForm.css';

interface ReportFormProps {
  goalId: number;
  onSubmit: (content: string) => void;
}

const ReportForm: React.FC<ReportFormProps> = ({ goalId, onSubmit }) => {
  const [reportContent, setReportContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportContent.trim()) {
      onSubmit(reportContent);
      setReportContent('');
    }
  };

  return (
    <div className="report-form">
      <h3>Daily Report</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="report-content">What did you do today?</label>
          <textarea
            id="report-content"
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="Describe your progress today..."
            rows={4}
          />
        </div>
        <button type="submit" className="submit-button">
          Submit Report
        </button>
      </form>
    </div>
  );
};

export default ReportForm;