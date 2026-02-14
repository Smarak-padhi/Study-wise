// Dashboard Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Display user email
    document.getElementById('userEmailDisplay').textContent = api.userEmail;

    // Load all dashboard data
    await Promise.all([
        loadStats(),
        loadOverview()
    ]);
});

async function loadStats() {
    const statsGrid = document.getElementById('statsGrid');
    showLoading('statsGrid');

    try {
        const { stats } = await api.getDashboardStats();

        statsGrid.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.total_uploads}</div>
                <div class="stat-label">Uploaded Syllabi</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.total_topics}</div>
                <div class="stat-label">Total Topics</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.total_quizzes}</div>
                <div class="stat-label">Quizzes Taken</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.avg_quiz_score}%</div>
                <div class="stat-label">Avg Quiz Score</div>
            </div>
        `;

        // Add progress card
        const progressHTML = `
            <div class="card" style="margin-top: 2rem;">
                <div class="card-header">
                    <h2 class="card-title">Overall Progress</h2>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Completion</span>
                            <span style="font-weight: 600;">${stats.progress.completion_percentage}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" style="width: ${stats.progress.completion_percentage}%"></div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1.5rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--secondary);">${stats.progress.completed}</div>
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">Completed</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--accent);">${stats.progress.in_progress}</div>
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">In Progress</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--text-tertiary);">${stats.progress.not_started}</div>
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">Not Started</div>
                        </div>
                    </div>
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">
                            ⏱️ ${stats.study_hours} hours studied
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        statsGrid.insertAdjacentHTML('afterend', progressHTML);

    } catch (error) {
        showError('statsGrid', 'Failed to load statistics');
    }
}

async function loadOverview() {
    try {
        const { overview } = await api.getDashboardOverview();

        // Load recent uploads
        loadRecentUploads(overview.recent_uploads);

        // Load recent quizzes
        loadRecentQuizzes(overview.recent_quizzes);

        // Load upcoming topics
        loadUpcomingTopics(overview.upcoming_topics);

    } catch (error) {
        console.error('Failed to load overview:', error);
    }
}

function loadRecentUploads(uploads) {
    const container = document.getElementById('recentUploads');

    if (!uploads || uploads.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📄</div>
                <div class="empty-text">No uploads yet</div>
                <a href="upload.html" class="btn btn-primary mt-2">Upload Syllabus</a>
            </div>
        `;
        return;
    }

    container.innerHTML = uploads.map(upload => `
        <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${upload.subject || 'General'}</div>
                <div style="font-size: 0.875rem; color: var(--text-tertiary);">${upload.filename}</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                    ${formatDate(upload.uploaded_at)} • ${upload.topics_count || 0} topics
                </div>
            </div>
            <a href="plan.html?upload=${upload.id}" class="btn btn-secondary" style="padding: 0.5rem 1rem;">View</a>
        </div>
    `).join('');
}

function loadRecentQuizzes(quizzes) {
    const container = document.getElementById('recentQuizzes');

    if (!quizzes || quizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-text">No quizzes taken yet</div>
            </div>
        `;
        return;
    }

    container.innerHTML = quizzes.map(quiz => {
        const scoreColor = quiz.percentage >= 70 ? 'var(--secondary)' : quiz.percentage >= 50 ? 'var(--accent)' : 'var(--danger)';
        return `
            <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${quiz.title}</div>
                        <div style="font-size: 0.875rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                            ${formatDateTime(quiz.date)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: ${scoreColor};">
                            ${quiz.percentage}%
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">
                            ${quiz.score}/${quiz.total}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadUpcomingTopics(topics) {
    const container = document.getElementById('upcomingTopics');

    if (!topics || topics.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-text">No upcoming topics</div>
                <p style="color: var(--text-tertiary); font-size: 0.875rem;">Generate a study plan to get started</p>
            </div>
        `;
        return;
    }

    container.innerHTML = topics.map(topic => {
        const statusColors = {
            'not_started': 'badge-info',
            'in_progress': 'badge-warning'
        };
        return `
            <div class="topic-card">
                <div class="topic-header">
                    <div class="topic-name">${topic.name}</div>
                    <span class="badge ${statusColors[topic.status]}">${topic.status.replace('_', ' ')}</span>
                </div>
                <div class="topic-meta">
                    <span>⏱️ ${topic.hours_spent}h / ${topic.estimated_hours}h</span>
                </div>
            </div>
        `;
    }).join('');
}