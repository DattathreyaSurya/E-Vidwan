import React, { useState, useRef, useEffect } from "react";
import "./CourseLearning.css";
import QuizAttempt from "./QuizAttempt.tsx";
import AssignmentUpload from "./AssignmentUpload.tsx";
import ForumSection from "../communication/ForumSection.tsx";
import { forumService } from "../../services/forumService.ts";
import { quizService } from "../../services/quizService.ts";
import { assignmentService } from "../../services/assignmentService.ts";
import { updateCourseProgress } from "../../services/analyticsService.ts";
 
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}
 
interface QuizData {
  questions: QuizQuestion[];
  passingScore: number;
}
 
interface CourseContent {
  _id?: string;
  type: 'Video' | 'Youtube Url' | 'Quiz' | 'Assignment' | 'Resource';
  title: string;
  description: string;
  videoUrl?: string;
  url?: string;
  quizData?: QuizData;
  completionDays?: number;
}
 
interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  content: CourseContent[];
  createdAt: string;
  enrolledStudents: Array<{
    _id: string;
    enrolledAt: string;
  }>;
}
 
interface CourseLearningProps {
  course: Course;
  onClose: () => void;
  userRole: 'Student' | 'Instructor';
  currentUserId?: string;
}
 
const CourseLearning: React.FC<CourseLearningProps> = ({
  course,
  onClose,
  userRole,
  currentUserId
}) => {
  const [completedSections, setCompletedSections] = useState<boolean[]>(() => {
    const key = `course_${course._id}_completedSections`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : Array(course.content?.length || 0).fill(false);
  });
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [notesHtml, setNotesHtml] = useState<string>("");
  const notesRef = useRef<HTMLDivElement>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [postAnnouncementError, setPostAnnouncementError] = useState<string | null>(null);
 
  const tabs = userRole === 'Student'
    ? ["Overview", "Q&A", "Notes", "Announcements"]
    : ["Overview", "Q&A", "Announcements"];
 
  const toggleSection = (index: number) => {
    const section = course.content[index];
    if (section.type === 'Quiz' || section.type === 'Assignment') return; // Prevent manual toggling for Quiz and Assignment
    if (userRole !== 'Student') return; // Only students can mark sections as complete
    const updated = [...completedSections];
    updated[index] = !updated[index];
    setCompletedSections(updated);
 
    const key = `course_${course._id}_completedSections`;
    localStorage.setItem(key, JSON.stringify(updated));
  };
 
  const markSectionComplete = (sectionIndex: number) => {
    const updated = [...completedSections];
    updated[sectionIndex] = true; // Mark the section as complete
    setCompletedSections(updated);
 
    const key = `course_${course._id}_completedSections`;
    localStorage.setItem(key, JSON.stringify(updated));
  };
 
  const handleStyle = (style: "bold" | "italic" | "underline") => {
    document.execCommand(style);
  };
 
  const handleNotesInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (notesRef.current) {
      setNotesHtml(notesRef.current.innerHTML);
    }
  };
 
  const getYoutubeEmbedUrl = (url: string) => {
    try {
      // Handle different YouTube URL formats
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
     
      if (match && match[2].length === 11) {
        // Return embed URL
        return `https://www.youtube.com/embed/${match[2]}`;
      }
     
      // If no match found, return original URL
      return url;
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return url;
    }
  };
 
  const calculateDueDate = (enrolledAt: string | undefined, completionDays: number | undefined) => {
    console.log(`Calculating due date with enrolledAt: ${enrolledAt}, completionDays: ${completionDays}`);
    if (!enrolledAt || !completionDays) return null;
   
    const date = new Date(enrolledAt);
    date.setDate(date.getDate() + completionDays);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
 
  const renderSectionContent = () => {
    if (selectedSection === null) {
      return (
        <div style={{ textAlign: "center", color: "#888", marginTop: "2rem" }}>
          <em>Select a section to view its content.</em>
        </div>
      );
    }
 
    const section = course.content[selectedSection];
 
    switch (section.type) {
      case "Video":
        return (
          <div>
            <video
              controls
              style={{ width: "100%", maxHeight: "400px" }}
              src={section.videoUrl}
              controlsList={userRole === 'Student' ? "nodownload" : undefined}
              onContextMenu={(e) => userRole === 'Student' && e.preventDefault()}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
 
      case "Youtube Url":
        return (
          <div className="video-play">
            <div className="video-container">
              <iframe
                src={getYoutubeEmbedUrl(section.url || '')}
                title={section.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", aspectRatio: "16/9", height: "400px"  }}
              ></iframe>
            </div>
          </div>
        );
 
      case "Resource":
        return (
          <div>
            <h4>{section.title}</h4>
            <a href={section.url} target="_blank" rel="noopener noreferrer">
              {section.url}
            </a>
            <p>{section.description}</p>
          </div>
        );
 
      case "Quiz":
        if (!section.quizData) return null;
        if (userRole === 'Instructor') {
          return (
            <div className="quiz-preview">
              <h4>{section.title}</h4>
              <p>{section.description}</p>
              <div className="quiz-questions">
                {section.quizData.questions.map((q, idx) => (
                  <div key={idx} className="question-preview">
                    <p><strong>Q{idx + 1}:</strong> {q.question}</p>
                    <ul>
                      {q.options.map((opt, i) => (
                        <li key={i} className={opt === q.correctAnswer ? 'correct-answer' : ''}>
                          {opt} {opt === q.correctAnswer && ' ✓'}
                        </li>
                      ))}
                    </ul>
                    <p className="points">Points: {q.points}</p>
                  </div>
                ))}
                <p><strong>Passing Score:</strong> {section.quizData.passingScore}%</p>
              </div>
            </div>
          );
        }
        return (
          <QuizAttempt
            courseId={course._id}
            quizContent={{
              _id: section._id || selectedSection.toString(),
              title: section.title,
              quizData: section.quizData,
            }}
            onQuizPassed={() => markSectionComplete(selectedSection)}
            onPreviousSubmissionChecked={(hasPassed) => {
              if (hasPassed) markSectionComplete(selectedSection);
            }}
          />
        );
 
      case "Assignment":
        const studentEnrollment = course.enrolledStudents.find(student => student._id === currentUserId);
        const dueDate = calculateDueDate(studentEnrollment?.enrolledAt, section.completionDays);
        const isPastDueDate = dueDate ? new Date(dueDate) < new Date() : false;
        console.log(`Due Date: ${dueDate}, Current Date: ${new Date()}, Is Past Due: ${isPastDueDate}`);
        if (userRole === 'Instructor') {
          return (
            <div className="assignment-preview">
              <h4>{section.title}</h4>
              {section.completionDays && (
                <div style={{
                  color: '#666',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>Completion Window:</span>
                  <span style={{ fontWeight: 500 }}>{section.completionDays} days</span>
                </div>
              )}
              <p>{section.description}</p>
              <div className="instructor-note">
                Students will be able to upload their assignments here.
              </div>
            </div>
          );
        }
        return (
          <AssignmentUpload
            courseId={course._id}
            assignmentContent={section}
            dueDate={dueDate}
            onAssignmentSubmitted={() => markSectionComplete(selectedSection)}
            onPreviousSubmissionChecked={(hasSubmission) => {
              if (hasSubmission) markSectionComplete(selectedSection);
            }}
            onAssignmentAutoCompleted={() => markSectionComplete(selectedSection)} // Handle auto-completion
          />
        );
 
      default:
        return null;
    }
  };
 
  const fetchAnnouncements = () => {
    setAnnouncementsLoading(true);
    setAnnouncementsError(null);
    forumService.getAnnouncements(course._id)
      .then(res => setAnnouncements(res.data))
      .catch(err => setAnnouncementsError(err.response?.data?.message || "Failed to load announcements"))
      .finally(() => setAnnouncementsLoading(false));
  };
 
  useEffect(() => {
    if (activeTab === "Announcements") {
      fetchAnnouncements();
    }
  }, [activeTab, course._id]);
 
  useEffect(() => {
    const fetchCompletionStatus = async () => {
      const updatedSections = [...completedSections];
 
      for (let i = 0; i < course.content.length; i++) {
        const section = course.content[i];
 
        if (section.type === 'Quiz') {
          try {
            const response = await quizService.getQuizAttempt(section._id || '');
            if (response.data && response.data.quizId === section._id) {
              const attempt = response.data;
              const hasPassed = attempt.score !== undefined && attempt.maxScore !== undefined &&
                (attempt.score / attempt.maxScore) * 100 >= section.quizData?.passingScore;
 
              updatedSections[i] = hasPassed;
            }
          } catch (err) {
            console.error(`Error fetching quiz attempt for section ${i}:`, err);
          }
        } else if (section.type === 'Assignment') {
          try {
            const response = await assignmentService.getAssignmentSubmission(section._id || '');
            if (response.data) {
              updatedSections[i] = true;
            }
          } catch (err) {
            console.error(`Error fetching assignment submission for section ${i}:`, err);
          }
        }
      }
 
      setCompletedSections(updatedSections);
    };
 
    fetchCompletionStatus();
  }, [course.content]);
 
  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostingAnnouncement(true);
    setPostAnnouncementError(null);
    try {
      await forumService.createAnnouncement({
        courseId: course._id,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
      });
      setShowAnnouncementForm(false);
      setNewAnnouncement({ title: '', content: '' });
      fetchAnnouncements();
    } catch (err: any) {
      setPostAnnouncementError(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setPostingAnnouncement(false);
    }
  };
 
  const totalSections = course.content.length;
  const completedCount = completedSections.filter(Boolean).length;
  const completionPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
 
  useEffect(() => {
    if (userRole === "Student" && totalSections > 0) {
      updateCourseProgress(course._id, completionPercent);
    }
  }, [completionPercent, course._id, userRole, totalSections]);
 
  return (
    <div className="learning-page">
      <nav className="learning-navbar">
        <button className="back-btn" onClick={onClose}>
          &#8592;
        </button>
        <span className="navbar-title">{course.title}</span>
        {userRole === 'Instructor' && (
          <span className="instructor-badge">Instructor View</span>
        )}
      </nav>
      <div className="top-content">
        <div className="video-area">
          {renderSectionContent()}
        </div>
 
        <div className="sidebar scrollable-content">
          <h3>Course Content</h3>
          {userRole === 'Student' && (
            <div
              style={{
                marginBottom: "0.5rem",
                color: "#1976d2",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
              }}
            >
              Progress: {completionPercent}%
              <i
                className="bi bi-info-circle"
                style={{
                  marginLeft: 8,
                  cursor: "pointer",
                  color: "#929aab",
                  fontSize: "1.1em",
                }}
                title={`How is progress calculated?\n` +
                  `• Resource, Video, Youtube Url: You must check it manually.\n` +
                  `• Quiz: Checked automatically after you pass the quiz.\n` +
                  `• Assignment: Checked after you successfully submit.`}
                aria-label="Progress Info"
              />
            </div>
          )}
          <ul>
            {course.content.map((section, index) => (
              <li
                key={index}
                style={{
                  background: selectedSection === index ? "#e3f2fd" : undefined,
                  borderRadius: "6px",
                  cursor: "pointer",
                  marginBottom: "0.5rem",
                  padding: "0.5rem",
                }}
                onClick={() => setSelectedSection(index)}
              >
                {userRole === "Student" && (
                  <label
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={completedSections[index]}
                      onChange={() => toggleSection(index)}
 
                      disabled={section.type === "Quiz" || section.type === "Assignment"} // Disable for Quiz and Assignment
                      style={{ marginRight: 8 }}
                    />
                  </label>
                )}
                <div style={{ flex: 1, marginLeft: userRole === "Student" ? 8 : 0 }}>
                  <strong>{section.title}</strong>
                  <div style={{ fontSize: "0.95em", color: "#666" }}>
                  </div>
                  <div>
                    <span
                      style={{
                        color:
                          section.type === "Video"
                            ? "#1976d2"
                            : section.type === "Youtube Url"
                            ? "#388e3c"
                            : section.type === "Quiz"
                            ? "#fbc02d"
                            : section.type === "Assignment"
                            ? "#d32f2f"
                            : "#666",
                      }}
                    >
                      {section.type}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
 
      <div className="bottom-tabs">
        <div className="tab-buttons">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
 
        <div className="tab-content scrollable-content">
          {activeTab === "Overview" && (
            <div>
              <h4>Course Overview</h4>
              <p>{course.description}</p>
              <h5>Course Sections</h5>
              <ul>
                {course.content.map((section, idx) => (
                  <li key={idx}>
                    <strong>{section.title}</strong> - {section.description}
                    {section.type === "Quiz" && section.quizData && (
                      <div>
                        <em>
                          Quiz: {section.quizData.questions.length} questions, Passing Score: {section.quizData.passingScore}%
                        </em>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === "Q&A" && (
            <ForumSection courseId={course._id} userRole={userRole} />
          )}
          {activeTab === "Notes" && userRole === 'Student' && (
            <div>
              <div style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => handleStyle("bold")}
                  style={{
                    fontWeight: "bold",
                    background: "#fff",
                    border: "1px solid #ccc",
                    marginRight: 4,
                    borderRadius: 4,
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  B
                </button>
                <button
                  onClick={() => handleStyle("italic")}
                  style={{
                    fontStyle: "italic",
                    background: "#fff",
                    border: "1px solid #ccc",
                    marginRight: 4,
                    borderRadius: 4,
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  I
                </button>
                <button
                  onClick={() => handleStyle("underline")}
                  style={{
                    textDecoration: "underline",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  U
                </button>
              </div>
              <div
                ref={notesRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  minHeight: "120px",
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  marginTop: "0.5rem",
                  background: "#f9f9f9",
                  color: "#222",
                  resize: "vertical"
                }}
                onInput={handleNotesInput}
                dangerouslySetInnerHTML={notesHtml ? undefined : { __html: "" }}
                data-placeholder="Write your notes here..."
                className="notes-input"
              />
            </div>
          )}
          {activeTab === "Announcements" && (
            <div>
              <h4>Course Announcements</h4>
              {userRole === 'Instructor' && (
                <div style={{ marginBottom: '1rem' }}>
                  {!showAnnouncementForm ? (
                    <button className="new-post-button" onClick={() => setShowAnnouncementForm(true)}>
                      + New Announcement
                    </button>
                  ) : (
                    <form onSubmit={handleAnnouncementSubmit} className="new-post-form">
                      <input
                        type="text"
                        placeholder="Announcement Title"
                        value={newAnnouncement.title}
                        onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        required
                      />
                      <textarea
                        placeholder="Write your announcement here..."
                        value={newAnnouncement.content}
                        onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        required
                        rows={4}
                      />
                      <div className="form-actions">
                        <button type="submit" className="submit-button" disabled={postingAnnouncement}>
                          {postingAnnouncement ? 'Posting...' : 'Post Announcement'}
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => {
                            setShowAnnouncementForm(false);
                            setNewAnnouncement({ title: '', content: '' });
                            setPostAnnouncementError(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {postAnnouncementError && <div className="error-message">{postAnnouncementError}</div>}
                    </form>
                  )}
                </div>
              )}
              {announcementsLoading ? (
                <div>Loading announcements...</div>
              ) : announcementsError ? (
                <div style={{ color: 'red' }}>{announcementsError}</div>
              ) : announcements.length === 0 ? (
                <div>No announcements yet.</div>
              ) : (
                <ul style={{ padding: 0, listStyle: 'none' }}>
                  {announcements.map(a => (
                    <li key={a._id} style={{ marginBottom: '1.5rem', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#393e46' }}>{a.title}</div>
                      <div style={{ color: '#393e46', margin: '0.5rem 0' }}>{a.content}</div>
                      <div style={{ fontSize: '0.95em', color: '#929aab' }}>By {a.author?.name || 'Instructor'} on {new Date(a.createdAt).toLocaleDateString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
 
export default CourseLearning;