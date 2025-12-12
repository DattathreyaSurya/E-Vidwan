import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseService, CourseData, ContentItem } from "../../services/courseService.ts";
import Navbar from "../home/Navbar.tsx";
import "./CreateCourse.css";

interface ContentFormState {
  type: "" | ContentItem["type"];
  title: string;
  description: string;
  url: string;
  videoFile: File | null;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    points: number;
  }>;
  passingScore: number;
  completionDays?: number;
}

const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [courseData, setCourseData] = useState<CourseData>({
    title: "",
    description: "",
    category: "",
    thumbnail: "",
    content: []
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [contentForm, setContentForm] = useState<ContentFormState>({
    type: "",
    title: "",
    description: "",
    url: "",
    videoFile: null,
    questions: [],
    passingScore: 70,
    completionDays: undefined
  });

  const validateStep1 = () => {
    if (!courseData.title?.trim()) {
      setError("Course title is required");
      return false;
    }
    if (!courseData.description?.trim()) {
      setError("Course description is required");
      return false;
    }
    if (!courseData.category?.trim()) {
      setError("Course category is required");
      return false;
    }
    if (!courseData.thumbnail) {
      setError("Course thumbnail is required");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setError(null);
    setCurrentStep(1);
  };

  const handleUpdateCourseData = (data: Partial<CourseData>) => {
    setCourseData(prev => ({ ...prev, ...data }));
  };

  const handleContentSubmit = async () => {
    if (!contentForm.type) {
      setError("Please select a content type");
      return;
    }
    if (!contentForm.title.trim()) {
      setError("Content title is required");
      return;
    }
    if (!contentForm.description.trim()) {
      setError("Content description is required");
      return;
    }

    try {
      let newContent: ContentItem;
      const baseContent = {
        title: contentForm.title.trim(),
        description: contentForm.description.trim()
      };

      switch (contentForm.type) {
        case "Video":
          if (!contentForm.videoFile) {
            setError("Please select a video file");
            return;
          }
          setIsUploading(true);
          try {
            const { fileUrl } = await courseService.uploadVideo(
              contentForm.videoFile,
              (progress) => setUploadProgress(progress)
            );
            newContent = {
              ...baseContent,
              type: "Video",
              videoUrl: fileUrl
            };
          } catch (err) {
            setError("Failed to upload video. Please try again.");
            return;
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
          }
          break;

        case "Youtube Url":
          if (!contentForm.url.trim()) {
            setError("YouTube URL is required");
            return;
          }
          newContent = {
            ...baseContent,
            type: "Youtube Url",
            url: contentForm.url.trim()
          };
          break;

        case "Quiz":
          if (contentForm.questions.length === 0) {
            setError("At least one question is required");
            return;
          }
          newContent = {
            ...baseContent,
            type: "Quiz",
            quizData: {
              questions: contentForm.questions,
              passingScore: contentForm.passingScore
            }
          };
          break;

        case "Resource":
          if (!contentForm.url.trim()) {
            setError("Resource URL is required");
            return;
          }
          newContent = {
            ...baseContent,
            type: "Resource",
            url: contentForm.url.trim()
          };
          break;

        case "Assignment":
          if (!contentForm.completionDays || contentForm.completionDays <= 0) {
            setError("Please specify a valid number of days for completion");
            return;
          }
          newContent = {
            ...baseContent,
            type: "Assignment",
            completionDays: contentForm.completionDays
          };
          break;

        default:
          setError("Invalid content type");
          return;
      }

      setCourseData(prev => ({
        ...prev,
        content: [...(prev.content || []), newContent]
      }));

      // Reset content form
      setContentForm({
        type: "",
        title: "",
        description: "",
        url: "",
        videoFile: null,
        questions: [],
        passingScore: 70,
        completionDays: undefined
      });
      setError(null);
    } catch (err) {
      setError("Failed to add content. Please try again.");
    }
  };

  const handleSaveCourse = async () => {
    if (!courseData.content || courseData.content.length === 0) {
      setError("Please add at least one content item");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await courseService.createCourse(courseData);
      navigate("/instructor/course");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="course-landing-form">
      <div className="form-group">
        <label>Course Title *</label>
        <input
          type="text"
          className="form-control"
          value={courseData.title}
          onChange={e => handleUpdateCourseData({ title: e.target.value })}
          placeholder="Enter course title"
        />
      </div>

      <div className="form-group">
        <label>Description *</label>
        <textarea
          className="form-control"
          value={courseData.description}
          onChange={e => handleUpdateCourseData({ description: e.target.value })}
          placeholder="Enter course description"
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Category *</label>
        <select
          className="form-control"
          value={courseData.category}
          onChange={e => handleUpdateCourseData({ category: e.target.value })}
        >
          <option value="">Select a category</option>
          <option value="programming">Programming</option>
          <option value="design">Design</option>
          <option value="business">Business</option>
          <option value="marketing">Marketing</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Thumbnail *</label>
        <input
          type="file"
          className="form-control"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              try {
                setIsUploading(true);
                const { fileUrl } = await courseService.uploadThumbnail(
                  file,
                  (progress) => setUploadProgress(progress)
                );
                handleUpdateCourseData({ thumbnail: fileUrl });
              } catch (err) {
                setError("Failed to upload thumbnail. Please try again.");
              } finally {
                setIsUploading(false);
                setUploadProgress(0);
              }
            }
          }}
        />
        {isUploading && (
          <div className="progress mt-2">
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
        {courseData.thumbnail && (
          <img
            src={courseData.thumbnail}
            alt="Course thumbnail"
            className="thumbnail-preview"
          />
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="content-builder">
      <div className="content-list">
        <h4>Course Content</h4>
        {courseData.content && courseData.content.length > 0 ? (
          <ul className="list-group">
            {courseData.content.map((item, index) => (
              <li key={index} className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="badge bg-secondary me-2">{item.type}</span>
                    {item.title}
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setCourseData(prev => ({
                        ...prev,
                        content: prev.content.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No content added yet</p>
        )}
      </div>

      <div className="content-form mt-4">
        <h4>Add New Content</h4>
        <div className="form-group">
          <label>Content Type *</label>
          <select
            className="form-control"
            value={contentForm.type}
            onChange={e => setContentForm(prev => ({
              ...prev,
              type: e.target.value as ContentItem["type"]
            }))}
          >
            <option value="">Select content type</option>
            <option value="Youtube Url">YouTube URL</option>
            <option value="Video">Video File</option>
            <option value="Quiz">Quiz</option>
            <option value="Assignment">Assignment</option>
            <option value="Resource">Resource</option>
          </select>
        </div>

        {contentForm.type && (
          <>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                className="form-control"
                value={contentForm.title}
                onChange={e => setContentForm(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                placeholder="Enter content title"
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                className="form-control"
                value={contentForm.description}
                onChange={e => setContentForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Enter content description"
                rows={3}
              />
            </div>

            {contentForm.type === "Youtube Url" && (
              <div className="form-group">
                <label>YouTube URL *</label>
                <input
                  type="url"
                  className="form-control"
                  value={contentForm.url}
                  onChange={e => setContentForm(prev => ({
                    ...prev,
                    url: e.target.value
                  }))}
                  placeholder="Enter YouTube URL"
                />
              </div>
            )}

            {contentForm.type === "Video" && (
              <div className="form-group">
                <label>Video File *</label>
                <input
                  type="file"
                  className="form-control"
                  accept="video/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setContentForm(prev => ({
                        ...prev,
                        videoFile: file
                      }));
                    }
                  }}
                />
                {isUploading && (
                  <div className="progress mt-2">
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
              </div>
            )}

            {contentForm.type === "Quiz" && (
              <div className="quiz-form">
                <div className="form-group">
                  <label>Passing Score *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={contentForm.passingScore}
                    onChange={e => setContentForm(prev => ({
                      ...prev,
                      passingScore: parseInt(e.target.value)
                    }))}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="questions-list">
                  {contentForm.questions.map((q, index) => (
                    <div key={index} className="question-item card mb-3">
                      <div className="card-body">
                        <h6>Question {index + 1}</h6>
                        <input
                          type="text"
                          className="form-control mb-2"
                          value={q.question}
                          onChange={e => {
                            const newQuestions = [...contentForm.questions];
                            newQuestions[index].question = e.target.value;
                            setContentForm(prev => ({
                              ...prev,
                              questions: newQuestions
                            }));
                          }}
                          placeholder="Enter question"
                        />
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="option-item">
                            <input
                              type="text"
                              className="form-control mb-2"
                              value={opt}
                              onChange={e => {
                                const newQuestions = [...contentForm.questions];
                                newQuestions[index].options[optIndex] = e.target.value;
                                setContentForm(prev => ({
                                  ...prev,
                                  questions: newQuestions
                                }));
                              }}
                              placeholder={`Option ${optIndex + 1}`}
                            />
                          </div>
                        ))}
                        <select
                          className="form-control mb-2"
                          value={q.correctAnswer}
                          onChange={e => {
                            const newQuestions = [...contentForm.questions];
                            newQuestions[index].correctAnswer = e.target.value;
                            setContentForm(prev => ({
                              ...prev,
                              questions: newQuestions
                            }));
                          }}
                        >
                          <option value="">Select correct answer</option>
                          {q.options.map((opt, optIndex) => (
                            <option key={optIndex} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            const newQuestions = contentForm.questions.filter((_, i) => i !== index);
                            setContentForm(prev => ({
                              ...prev,
                              questions: newQuestions
                            }));
                          }}
                        >
                          Remove Question
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setContentForm(prev => ({
                      ...prev,
                      questions: [
                        ...prev.questions,
                        {
                          question: "",
                          options: ["", "", "", ""],
                          correctAnswer: "",
                          points: 1
                        }
                      ]
                    }));
                  }}
                >
                  Add Question
                </button>
              </div>
            )}

            {contentForm.type === "Resource" && (
              <div className="form-group">
                <label>Resource URL *</label>
                <input
                  type="url"
                  className="form-control"
                  value={contentForm.url}
                  onChange={e => setContentForm(prev => ({
                    ...prev,
                    url: e.target.value
                  }))}
                  placeholder="Enter resource URL"
                />
              </div>
            )}

            {contentForm.type === "Assignment" && (
              <div className="form-group">
                <label>Days to Complete *</label>
                <input
                  type="number"
                  className="form-control"
                  value={contentForm.completionDays || ''}
                  onChange={e => setContentForm(prev => ({ 
                    ...prev, 
                    completionDays: parseInt(e.target.value) || undefined 
                  }))}
                  min="1"
                  placeholder="Enter number of days to complete"
                />
                <small className="form-text text-muted">
                  Number of days students have to complete this assignment from their enrollment date
                </small>
              </div>
            )}

            <button
              className="btn btn-primary mt-3"
              onClick={handleContentSubmit}
              disabled={isUploading}
              style={{
                backgroundColor: '#393e46',
                borderColor: '#393e46',
                color: '#f7f7f7'
              }}
            >
              {isUploading ? "Uploading..." : "Add Content"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Navbar userRole="Instructor" />
      <div className="create-course-container">
        <h2 className="create-header">Create New Course</h2>

        <div className="step-indicator">
          <div className={`step ${currentStep === 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-title">Course Details</div>
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-title">Course Content</div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="step-content">
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </div>

        <div className="action-buttons">
          {currentStep === 2 && (
            <button 
              className="btn btn-secondary" 
              onClick={handlePrevious}
              style={{
                backgroundColor: '#929aab',
                borderColor: '#929aab',
                color: '#f7f7f7'
              }}
            >
              Previous
            </button>
          )}
          
          {currentStep === 1 ? (
            <button 
              className="btn btn-primary" 
              onClick={handleNext}
              style={{
                backgroundColor: '#393e46',
                borderColor: '#393e46',
                color: '#f7f7f7'
              }}
            >
              Next
            </button>
          ) : (
            <button 
              className="btn btn-success" 
              onClick={handleSaveCourse}
              disabled={isSubmitting || !courseData.content?.length}
              style={{
                backgroundColor: '#393e46',
                borderColor: '#393e46',
                color: '#f7f7f7'
              }}
            >
              {isSubmitting ? "Creating Course..." : "Create Course"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default CreateCourse;
