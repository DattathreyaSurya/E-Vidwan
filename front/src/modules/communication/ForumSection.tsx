import React, { useState, useEffect } from 'react';
import { forumService } from '../../services/forumService.ts';
import './ForumSection.css';
 
interface ForumSectionProps {
  courseId: string;
  userRole: 'Student' | 'Instructor';
}
 
interface Reply {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
}
 
interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  title: string;
  content: string;
  category: string;
  replies: Reply[];
  createdAt: string;
}
 
const ForumSection: React.FC<ForumSectionProps> = ({ courseId, userRole }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'Question',
    tags: [] as string[]
  });
 
  // Check authentication on component mount
  useEffect(() => {
    fetchPosts();
  }, [courseId, currentPage, selectedCategory, searchTerm]);
 
  // Fetch posts with authentication
  const fetchPosts = async () => {
    const token = window.sessionStorage.getItem('token');
    if (!token) {
      setError('Please log in to access the forum.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await forumService.getCourseDiscussions(
        courseId,
        currentPage,
        10,
        selectedCategory,
        searchTerm
      );
      setPosts(response.data);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch posts');
      }
    } finally {
      setLoading(false);
    }
  };
 
  // Create new post with authentication
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = window.sessionStorage.getItem('token');
      if (!token) {
        setError('Please log in to create a post.');
        return;
      }
 
      await forumService.createPost({
        courseId,
        ...newPost
      });
      setShowNewPostForm(false);
      setNewPost({ title: '', content: '', category: 'Question', tags: [] });
      fetchPosts();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to create post');
      }
    }
  };
 
  // Handle reply submission
  const handleReply = async (postId: string) => {
    try {
      const token = window.sessionStorage.getItem('token');
      if (!token) {
        setError('Please log in to reply.');
        return;
      }
 
      if (!replyContent.trim()) {
        setError('Reply cannot be empty');
        return;
      }
 
      await forumService.addReply(postId, {
        content: replyContent
      });
      setReplyContent('');
      setSelectedPost(null);
      fetchPosts();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to add reply');
      }
    }
  };
 
  if (error === 'Please log in to access the forum.' || error === 'Your session has expired. Please log in again.') {
    return (
      <div className="forum-section">
        <div className="auth-error">
          <h3>Authentication Required</h3>
          <p>{error}</p>
          <button
            className="login-button"
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
 
  return (
    <div className="forum-section">
      <div className="forum-header">
        <h2>Course Q&A Forum</h2>
        <div className="forum-actions">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="">All Categories</option>
              <option value="Question">Questions</option>
              <option value="General">General Discussion</option>
            </select>
          </div>
          {userRole === 'Instructor' ? null : (
            <button
              className="new-post-button"
              onClick={() => setShowNewPostForm(true)}
            >
              New Question
            </button>
          )}
        </div>
      </div>
 
      {error && <div className="error-message">{error}</div>}
 
      {showNewPostForm && userRole !== 'Instructor' && (
        <div className="new-post-form">
          <h3>Ask a Question</h3>
          <form onSubmit={handleCreatePost}>
            <input
              type="text"
              placeholder="Title"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Write your question here..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              required
              rows={5}
            />
            <div className="form-actions">
              <button type="submit" className="submit-button">
                Post Question
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowNewPostForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
 
      {loading ? (
        <div className="loading">Loading discussions...</div>
      ) : (
        <div className="posts-list">
          {posts.length === 0 ? (
            <div className="no-posts">
              No discussions yet. Be the first to ask a question!
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="post-card">
                <div className="post-header">
                  <h3>{post.title}</h3>
                  <span className="post-category">{post.category}</span>
                </div>
                <div className="post-content">{post.content}</div>
                <div className="post-footer">
                  <div className="post-meta">
                    <span className="author">By {post.author.name}</span>
                    <span className="date">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
 
                {/* Replies Section */}
                <div className="replies-section">
                  <h4>Replies ({post.replies.length})</h4>
                  {post.replies.map((reply) => {
                    const isInstructor = reply.author.role?.toLowerCase() === 'instructor';
                    const isAuthor = reply.author._id === post.author._id;
                    return (
                      <div
                        key={reply._id}
                        className={`reply ${isInstructor ? 'instructor-reply' : ''}`}
                      >
                        <div className="reply-content">{reply.content}</div>
                        <div className="reply-meta">
                          <span className="author">
                            {reply.author.name}
                            {isInstructor && (
                              <span className="instructor-badge">Instructor</span>
                            )}
                            {isAuthor && (
                              <span className="author-badge">Author</span>
                            )}
                          </span>
                          <span className="date">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
 
                  {/* Reply Form */}
                  {selectedPost === post._id ? (
                    <div className="reply-form">
                      <textarea
                        placeholder="Write your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                      />
                      <div className="reply-actions">
                        <button
                          className="submit-reply"
                          onClick={() => handleReply(post._id)}
                        >
                          Submit Reply
                        </button>
                        <button
                          className="cancel-reply"
                          onClick={() => {
                            setSelectedPost(null);
                            setReplyContent('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="reply-button"
                      onClick={() => setSelectedPost(post._id)}
                    >
                      Reply to this question
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
 
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
 
export default ForumSection;