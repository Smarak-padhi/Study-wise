/**
 * StudyWise API Client - Production Ready
 * Handles all backend communication with proper error handling
 */

// ✅ Auto-detect environment and set correct base URL
const API_BASE_URL = (function() {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:5000/api';
    }
    
    // Production - Railway backend
    return 'https://study-wise-production.up.railway.app/api';
})();

console.log('🌐 API Base URL:', API_BASE_URL);

/**
 * User Management - Single Source of Truth
 */
function getUserEmail() {
    let email = localStorage.getItem('userEmail');
    if (!email) {
        email = prompt('Enter your email:') || 'demo@studywise.com';
        localStorage.setItem('userEmail', email);
    }
    return email;
}

/**
 * AI Mode Management
 */
const AIMode = {
    get current() {
        return localStorage.getItem('aiMode') || 'free';
    },
    set(mode) {
        localStorage.setItem('aiMode', mode);
    },
    modes: {
        FREE: 'free',
        OLLAMA: 'ollama',
        CLOUD: 'cloud'
    }
};

/**
 * Main API Client Class
 */
class StudyWiseAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.userEmail = getUserEmail();
    }

    /**
     * Generic request handler with comprehensive error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            // Try to parse JSON response
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error(`Invalid JSON response from server: ${response.statusText}`);
            }

            // Handle error responses
            if (!response.ok) {
                const errorMessage = data.error || data.message || `HTTP ${response.status}`;
                console.error(`❌ API Error [${endpoint}]:`, errorMessage);
                throw new Error(errorMessage);
            }

            console.log(`✅ API Success [${endpoint}]`);
            return data;

        } catch (error) {
            console.error(`❌ API Error [${endpoint}]:`, error.message);
            throw error;
        }
    }

    /**
     * Normalize uploads response to always return array
     */
    normalizeUploads(response) {
        if (Array.isArray(response)) {
            return response;
        }
        if (response && Array.isArray(response.uploads)) {
            return response.uploads;
        }
        console.warn('⚠️ Unexpected uploads response format:', response);
        return [];
    }

    /**
     * Get all uploads for current user
     * Returns: Array of upload objects
     */
    async getUploads() {
        try {
            const data = await this.request(`/upload/uploads/${encodeURIComponent(this.userEmail)}`);
            return this.normalizeUploads(data);
        } catch (error) {
            console.error('getUploads failed:', error);
            return [];
        }
    }

    /**
     * Get topics for a specific upload
     * Returns: Array of topic objects
     */
    async getTopics(uploadId) {
        try {
            const data = await this.request(`/upload/topics/${uploadId}`);
            
            if (Array.isArray(data)) {
                return data;
            }
            if (data && Array.isArray(data.topics)) {
                return data.topics;
            }
            return [];
        } catch (error) {
            console.error('getTopics failed:', error);
            return [];
        }
    }

    /**
     * Upload syllabus PDF
     * Uses FormData for multipart upload
     */
    async uploadSyllabus(file, subject) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);
        formData.append('email', this.userEmail);
        formData.append('ai_mode', AIMode.current);

        console.log('📤 Uploading syllabus:', { subject, file: file.name });

        const response = await fetch(`${this.baseURL}/upload/syllabus`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type - browser sets it with boundary
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        console.log('✅ Syllabus uploaded successfully');
        return data;
    }

    /**
     * Upload PYQ (Previous Year Questions) PDF
     */
    async uploadPYQ(file, uploadId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_id', uploadId);
        formData.append('email', this.userEmail);

        console.log('📤 Uploading PYQ:', { upload_id: uploadId, file: file.name });

        const response = await fetch(`${this.baseURL}/upload/pyq`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'PYQ upload failed');
        }

        console.log('✅ PYQ uploaded successfully');
        return data;
    }

    /**
     * Generate quiz for a specific topic
     * @param {string} topicId - Topic UUID
     * @param {number} numQuestions - Number of questions (1-20)
     * Returns: { success, quiz_id, questions, total_questions }
     */
    async generateQuiz(topicId, numQuestions) {
        return this.request('/quiz/generate', {
            method: 'POST',
            body: JSON.stringify({
                topic_id: topicId,
                num_questions: numQuestions,
                email: this.userEmail,
                ai_mode: AIMode.current
            }),
        });
    }

    /**
     * Submit quiz answers
     * @param {string} quizId - Quiz UUID
     * @param {object} answers - Dictionary of question_index: answer_index
     * Returns: { success, score, correct, total, correct_answers }
     */
    async submitQuiz(quizId, answers) {
        return this.request('/quiz/submit', {
            method: 'POST',
            body: JSON.stringify({
                quiz_id: quizId,
                answers: answers,
                email: this.userEmail,
            }),
        });
    }

    /**
     * Get quiz history for current user
     * Returns: { history: [...] } or Array
     */
    async getQuizHistory() {
        return this.request(`/quiz/history/${encodeURIComponent(this.userEmail)}`);
    }

    /**
     * Generate study plan
     * @param {string} uploadId - Upload UUID
     * @param {number} hoursPerDay - Study hours per day (1-12)
     * @param {string} endDate - Target completion date (YYYY-MM-DD)
     * Returns: { success, plan_id, schedule: [...] }
     */
    async generatePlan(uploadId, hoursPerDay, endDate) {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];

        console.log('📅 Generating study plan:', {
            upload_id: uploadId,
            start_date: startDate,
            end_date: endDate,
            hours_per_day: hoursPerDay
        });

        return this.request('/plan/generate', {
            method: 'POST',
            body: JSON.stringify({
                email: this.userEmail,
                upload_id: uploadId,
                start_date: startDate,
                end_date: endDate,
                hours_per_day: hoursPerDay
            }),
        });
    }

    /**
     * Get existing study plan for current user
     * Returns: { success, schedule: [...] }
     */
    async getStudyPlan() {
        return this.request(`/plan/${encodeURIComponent(this.userEmail)}`);
    }

    /**
     * Get dashboard statistics
     * Returns: { stats: { total_uploads, total_topics, ... } }
     */
    async getDashboardStats() {
        return this.request(`/dashboard/stats/${encodeURIComponent(this.userEmail)}`);
    }

    /**
     * Get dashboard overview
     * Returns: { overview: { recent_uploads, recent_quizzes, ... } }
     */
    async getDashboardOverview() {
        return this.request(`/dashboard/overview/${encodeURIComponent(this.userEmail)}`);
    }

    /**
     * Get timetable for current user
     * Returns: { classes: [...] }
     */
    async getTimetable() {
        return this.request(`/timetable?email=${encodeURIComponent(this.userEmail)}`);
    }

    /**
     * Add class to timetable
     */
    async addTimetable(dayOfWeek, startTime, endTime, title) {
        return this.request('/timetable', {
            method: 'POST',
            body: JSON.stringify({
                email: this.userEmail,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                title: title
            })
        });
    }

    /**
     * Delete class from timetable
     */
    async deleteTimetable(id) {
        return this.request(`/timetable/${id}?email=${encodeURIComponent(this.userEmail)}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get notes for current user
     * Returns: Array of notes
     */
    async getNotes() {
        return this.request(`/notes?email=${encodeURIComponent(this.userEmail)}`);
    }

    /**
     * Save or update note
     */
    async saveNote(subject, content, noteId = null) {
        return this.request('/notes', {
            method: 'POST',
            body: JSON.stringify({
                email: this.userEmail,
                subject: subject,
                content: content,
                note_id: noteId
            })
        });
    }

    /**
     * Delete note
     */
    async deleteNote(id) {
        return this.request(`/notes/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Health check endpoint
     * Returns: { status, message }
     */
    async healthCheck() {
        return this.request('/health');
    }
}

/**
 * Global Exports
 */
window.api = new StudyWiseAPI();
window.AIMode = AIMode;
window.getUserEmail = getUserEmail;
window.API_BASE_URL = API_BASE_URL;

/**
 * Utility Functions
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export utilities to global scope
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.escapeHtml = escapeHtml;

// Log initialization
console.log('✅ StudyWise API initialized');
console.log('📧 User:', window.api.userEmail);
console.log('🤖 AI Mode:', AIMode.current);