import React, { useState, useEffect } from 'react';
import { assignmentService } from '../../services/assignmentService.ts';
import './AssignmentUpload.css';

interface AssignmentContent {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
}

interface AssignmentUploadProps {
  courseId: string;
  assignmentContent: AssignmentContent;
  dueDate?: string;
  onAssignmentSubmitted?: () => void;
  onPreviousSubmissionChecked?: (hasSubmission: boolean) => void;
  onAssignmentAutoCompleted?: () => void;
}

const AssignmentUpload: React.FC<AssignmentUploadProps> = ({
  courseId,
  assignmentContent,
  dueDate,
  onAssignmentSubmitted,
  onPreviousSubmissionChecked,
  onAssignmentAutoCompleted
}) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousSubmission, setPreviousSubmission] = useState<any>(null);
  const [fetchingSubmission, setFetchingSubmission] = useState(false);

  // Check if the current date is past the due date
  const isPastDueDate = dueDate ? new Date(dueDate) < new Date() : false;

  useEffect(() => {
    const checkPreviousSubmission = async () => {
      setFetchingSubmission(true);
      try {
        const response = await assignmentService.getAssignmentSubmission(assignmentContent._id);
        if (response.data) {
          setPreviousSubmission(response.data);
          setSubmitted(true);
          onPreviousSubmissionChecked?.(true); // Notify parent component
        } else {
          setPreviousSubmission(null);
          setSubmitted(false);
          onPreviousSubmissionChecked?.(false); // Notify parent component
        }
      } catch (err) {
        console.warn('No previous submission found or error fetching submission:', err);
        setPreviousSubmission(null);
        setSubmitted(false);
        onPreviousSubmissionChecked?.(false); // Notify parent component
      } finally {
        setFetchingSubmission(false);
      }
    };

    // Reset states when assignmentContent._id changes
    setPreviousSubmission(null);
    setSubmitted(false);

    checkPreviousSubmission();

    // Automatically mark the assignment as completed if the due date has passed
    if (isPastDueDate) {
      setSubmitted(true);
      onAssignmentAutoCompleted?.(); // Notify parent component
    }
  }, [assignmentContent._id, isPastDueDate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const File = e.target.files?.[0];
    if (File) {
      try {
        setLoading(true);
        const { fileUrl } = await assignmentService.uploadAssignmentFile(File, (progress) => {
          setUploadProgress(progress);
        });
        if (!fileUrl || typeof fileUrl !== 'string') {
          throw new Error('Invalid file URL generated. Please try again.');
        }
        setFileUrl(fileUrl);
        setLoading(false);
        setUploadProgress(0);
      } catch (err: any) {
        console.error('Error uploading file:', err);
        setError(err.message || 'Failed to upload file. Please try again.');
        setLoading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleSubmit = async () => {
    if (!fileUrl) {
      setError('No file uploaded. Please upload a file first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assignmentService.submitAssignment(courseId, assignmentContent._id, fileUrl);
      setPreviousSubmission(response.data);
      setSubmitted(true);
      onAssignmentSubmitted?.(); // Call the callback
    } catch (err: any) {
      console.error('Error during assignment submission:', err);
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setLoading(false);
      setFileUrl(null);
    }
  };

  if (fetchingSubmission) {
    return (
      <div className="assignment-upload loading">
        <h3>Loading assignment details...</h3>
      </div>
    );
  }

  if (previousSubmission) {
    return (
      <div className="assignment-submission">
        <h3>Submission Status</h3>
        <div className="submission-details">
          <p><strong>Submitted on:</strong> {new Date(previousSubmission.submittedAt).toLocaleString()}</p>
          <p><strong>File:</strong> <a href={previousSubmission.fileUrl} target="_blank" rel="noopener noreferrer">View Submission</a></p>
          {previousSubmission.grade !== undefined && (
            <>
              <p><strong>Grade:</strong> {previousSubmission.grade}</p>
              {previousSubmission.feedback && (
                <div className="feedback">
                  <strong>Feedback:</strong>
                  <p>{previousSubmission.feedback}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (isPastDueDate) {
    return (
      <div className="assignment-upload past-due">
        <h3>{assignmentContent.title}</h3>
        <p>{assignmentContent.description}</p>
        <div className="due-date-message">
          Time completed: The due date for this assignment has passed.
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-upload">
      <h3>{assignmentContent.title}</h3>
      <p>{assignmentContent.description}</p>
      {dueDate && (
        <div className="due-date">
          Due Date: {dueDate}
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {!submitted ? (
        <div className="upload-section">
          <div className="file-input">
            <input
              type="file"
              onChange={handleFileChange}
              className="form-control"
              disabled={loading}
            />
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress">
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${uploadProgress}%` }}
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {uploadProgress}%
              </div>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!fileUrl || loading}
            className="btn btn-primary"
          >
            {loading ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      ) : (
        <p className="alert alert-success">Assignment submitted successfully!</p>
      )}
    </div>
  );
};

export default AssignmentUpload;