// API Configuration and Wrapper
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000/api"
    : "https://study-wise.onrender.com/api"; // <-- your Render backend

// Get user email from localStorage (simple session management)
function getUserEmail() {
    let email = localStorage.getItem('userEmail');
    if (!email) {
        email = prompt('Enter your email:') || 'demo@studywise.com';
        localStorage.setItem('userEmail', email);
    }
    return email;
}

// AI Mode Management
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

// API wrapper class
class StudyWiseAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.userEmail = getUserEmail();
    }

    // Generic request handler
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Upload syllabus
    async uploadSyllabus(file, subject) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);
        formData.append('email', this.userEmail);
        formData.append('ai_mode', AIMode.current);

        const response = await fetch(`${this.baseURL}/upload/syllabus`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        return data;
    }

    // Upload PYQ
    async uploadPYQ(file, uploadId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_id', uploadId);
        formData.append('email', this.userEmail);

        const response = await fetch(`${this.baseURL}/upload/pyq`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'PYQ upload failed');
        }

        return data;
    }

    // Get uploads
    async getUploads() {
        return this.request(`/upload/uploads/${encodeURIComponent(this.userEmail)}`);
    }

    // Generate quiz
    async generateQuiz(topicId, numQuestions) {
        return this.request('/quiz/generate', {
            method: 'POST',
            body: JSON.stringify({
                topic_id: topicId,
                num_questions: numQuestions,
                email: this.userEmail,
            }),
        });
    }

    // Submit quiz
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

    // Get quiz history
    async getQuizHistory() {
        return this.request(`/quiz/history/${encodeURIComponent(this.userEmail)}`);
    }

    // Generate study plan
    async generatePlan(uploadId, hoursPerDay, targetDate) {
        return this.request('/plan/generate', {
            method: 'POST',
            body: JSON.stringify({
                upload_id: uploadId,
                hours_per_day: hoursPerDay,
                target_date: targetDate,
                email: this.userEmail,
            }),
        });
    }

    // Get study plan
    async getStudyPlan() {
        return this.request(`/plan/${encodeURIComponent(this.userEmail)}`);
    }

    // Get dashboard stats
    async getDashboardStats() {
        return this.request(`/dashboard/stats/${encodeURIComponent(this.userEmail)}`);
    }

    // Get dashboard overview
    async getDashboardOverview() {
        return this.request(`/dashboard/overview/${encodeURIComponent(this.userEmail)}`);
    }

    // Timetable methods
    async getTimetable() {
        return this.request(`/timetable?email=${encodeURIComponent(this.userEmail)}`);
    }

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

    async deleteTimetable(id) {
        return this.request(`/timetable/${id}?email=${encodeURIComponent(this.userEmail)}`, {
            method: 'DELETE'
        });
    }

    // Notes methods
    async getNotes() {
        return this.request(`/notes?email=${encodeURIComponent(this.userEmail)}`);
    }

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

    async deleteNote(id) {
        return this.request(`/notes/${id}`, {
            method: 'DELETE'
        });
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }

    // AI Mode Endpoints
    async checkOllamaStatus() {
        return this.request('/ai/status');
    }

    async checkCloudStatus() {
        return this.request('/ai/cloud-status');
    }

    async setAIMode(mode) {
        return this.request('/ai/mode', {
            method: 'POST',
            body: JSON.stringify({
                mode: mode,
                user_id: this.userEmail
            }),
        });
    }

    async getCurrentAIMode() {
        return this.request(`/ai/mode/${encodeURIComponent(this.userEmail)}`);
    }
}

// Global API instance and exports
window.api = new StudyWiseAPI();
window.AIMode = AIMode;
window.API_BASE_URL = API_BASE_URL;

// Utility functions
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="alert alert-error">${message}</div>`;
    }
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="alert alert-success">${message}</div>`;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get AI mode display name
function getAIModeName(mode) {
    const names = {
        'free': 'Free (Rule-based)',
        'ollama': 'Local AI (Ollama)',
        'cloud': 'Cloud AI (OpenAI)'
    };
    return names[mode] || mode;
}