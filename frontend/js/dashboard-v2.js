// Dashboard v2 Page Logic

// Safe DOM manipulation helpers
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}

function setWidth(id, value) {
    const el = document.getElementById(id);
    if (el) el.style.width = value;
}

function addClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.classList.add(className);
}

function removeClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.classList.remove(className);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize user info
    const email = window.api ? window.api.userEmail : (localStorage.getItem('userEmail') || 'demo@studywise.com');
    setText('userEmail', email);
    setText('userEmailSidebar', email);
    setText('userName', email.split('@')[0] || 'Student');
    setText('userAvatar', (email[0] || 'S').toUpperCase());

    // Load dashboard data
    await loadDashboardStats();
    await loadRecentActivity();
});

async function loadDashboardStats() {
    try {
        const data = await window.api.getDashboardStats();
        const stats = data.stats || {};

        // Update stats with fallbacks
        setText('totalUploads', stats.total_uploads || 0);
        setText('totalTopics', stats.total_topics || 0);
        setText('avgScore', stats.avg_quiz_score ? `${stats.avg_quiz_score}%` : '-');

        // Update progress
       
        // Update trends
        setText('uploadsTrend', stats.uploads_trend || '-');
        setText('topicsTrend', stats.topics_trend || '-');
        setText('scoreTrend', stats.score_trend || '-');

    } catch (error) {
        console.log('Dashboard stats not available yet:', error.message);
        
        // Set defaults on error
        setText('totalUploads', '0');
        setText('totalTopics', '0');
        setText('avgScore', '-');
        setText('completionRate', '0%');
        setWidth('progressFill', '0%');
        setText('uploadsTrend', '-');
        setText('topicsTrend', '-');
        setText('scoreTrend', '-');
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentOverview');
    if (!container) return;

    try {
        const data = await window.api.getDashboardOverview();
        const overview = data.overview || {};
        const recentUploads = overview.recent_uploads || [];
        const recentQuizzes = overview.recent_quizzes || [];

        if (recentUploads.length === 0 && recentQuizzes.length === 0) {
            setHTML('recentOverview', `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <div class="empty-title">No activity yet</div>
                    <div class="empty-message">Upload a syllabus or take a quiz to see progress here</div>
                    <a href="upload.html" class="btn btn-primary" style="margin-top: 1rem;">Upload Syllabus</a>
                </div>
            `);
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

        // Recent uploads
        if (recentUploads.length > 0) {
            html += '<div><h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Recent Uploads</h3>';
            recentUploads.forEach(upload => {
                html += `
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600;">${upload.subject || 'Untitled'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-tertiary);">
                            ${upload.topics_count || 0} topics • ${formatDate(upload.uploaded_at || new Date())}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Recent quizzes
        if (recentQuizzes.length > 0) {
            html += '<div><h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Recent Quizzes</h3>';
            recentQuizzes.forEach(quiz => {
                const score = quiz.score || 0;
                const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                html += `
                    <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600;">${quiz.topic_name || 'Quiz'}</div>
                                <div style="font-size: 0.875rem; color: var(--text-tertiary);">
                                    ${formatDateTime(quiz.completed_at || new Date())}
                                </div>
                            </div>
                            <div style="font-weight: 700; font-size: 1.25rem; color: ${scoreColor};">
                                ${score}%
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        setHTML('recentOverview', html);

    } catch (error) {
        console.log('Recent activity not available yet:', error.message);
        setHTML('recentOverview', `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-title">No activity yet</div>
                <div class="empty-message">Upload a syllabus or take a quiz to see progress here</div>
                <a href="upload.html" class="btn btn-primary" style="margin-top: 1rem;">Upload Syllabus</a>
            </div>
        `);
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