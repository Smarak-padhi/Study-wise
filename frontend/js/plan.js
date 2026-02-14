// Study Plan Page Logic

let selectedUploadId = null;
let currentTopics = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadSubjects();
    
    // Check if upload ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const uploadId = urlParams.get('upload');
    if (uploadId) {
        document.getElementById('subjectSelect').value = uploadId;
        await handleSubjectChange({ target: { value: uploadId } });
    }

    document.getElementById('subjectSelect').addEventListener('change', handleSubjectChange);
    document.getElementById('generatePlanBtn').addEventListener('click', generatePlan);

    // Set default dates
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    document.getElementById('endDate').value = nextMonth.toISOString().split('T')[0];
});

async function loadSubjects() {
    try {
        const { uploads } = await api.getUploads();

        const subjectSelect = document.getElementById('subjectSelect');
        
        if (!uploads || uploads.length === 0) {
            subjectSelect.innerHTML = '<option value="">No subjects available - Upload a syllabus first</option>';
            return;
        }

        subjectSelect.innerHTML = '<option value="">Choose a subject...</option>' +
            uploads.map(u => `<option value="${u.id}">${u.subject || u.filename}</option>`).join('');

    } catch (error) {
        console.error('Failed to load subjects:', error);
    }
}

async function handleSubjectChange(e) {
    const uploadId = e.target.value;
    const generateBtn = document.getElementById('generatePlanBtn');

    if (!uploadId) {
        generateBtn.disabled = true;
        document.getElementById('topicsList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <div class="empty-text">Select a subject to view topics</div>
            </div>
        `;
        return;
    }

    selectedUploadId = uploadId;
    generateBtn.disabled = false;

    await loadTopics(uploadId);
    await loadExistingPlan(uploadId);
}

async function loadTopics(uploadId) {
    const container = document.getElementById('topicsList');
    showLoading('topicsList');

    try {
        const { topics } = await api.getTopics(uploadId, true);
        currentTopics = topics;

        if (!topics || topics.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <div class="empty-text">No topics found</div>
                </div>
            `;
            return;
        }

        container.innerHTML = topics.map(topic => {
            const progress = topic.progress || { status: 'not_started', hours_spent: 0 };
            const statusColors = {
                'not_started': 'badge-info',
                'in_progress': 'badge-warning',
                'completed': 'badge-success'
            };

            return `
                <div class="topic-card">
                    <div class="topic-header">
                        <div>
                            <div class="topic-name">${topic.topic_name}</div>
                            ${topic.description ? `<div style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 0.25rem;">${topic.description}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span class="topic-difficulty difficulty-${topic.difficulty_level}">
                                ${topic.difficulty_level}
                            </span>
                            <span class="badge ${statusColors[progress.status]}">
                                ${progress.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <div class="topic-meta">
                        <span>⏱️ Estimated: ${topic.estimated_hours}h</span>
                        <span>📊 Spent: ${progress.hours_spent}h</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="updateTopicStatus('${topic.id}', 'in_progress')" 
                                class="btn btn-secondary" style="flex: 1; padding: 0.5rem;">
                            Start
                        </button>
                        <button onclick="updateTopicStatus('${topic.id}', 'completed')" 
                                class="btn btn-success" style="flex: 1; padding: 0.5rem;">
                            Complete
                        </button>
                        <button onclick="generateTopicQuiz('${topic.id}')" 
                                class="btn btn-primary" style="flex: 1; padding: 0.5rem;">
                            Quiz
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        showError('topicsList', 'Failed to load topics');
    }
}

async function updateTopicStatus(topicId, status) {
    try {
        // Prompt for hours if completing
        let hours = 0;
        if (status === 'completed') {
            const hoursInput = prompt('How many hours did you spend on this topic?');
            if (hoursInput === null) return;
            hours = parseFloat(hoursInput) || 0;
        }

        await api.updateProgress(topicId, status, hours);
        
        // Reload topics
        if (selectedUploadId) {
            await loadTopics(selectedUploadId);
        }

    } catch (error) {
        alert('Failed to update status: ' + error.message);
    }
}

async function generateTopicQuiz(topicId) {
    window.location.href = `quiz.html?topic=${topicId}`;
}

async function generatePlan() {
    if (!selectedUploadId) return;

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dailyHours = parseFloat(document.getElementById('dailyHours').value);

    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }

    const btn = document.getElementById('generatePlanBtn');
    btn.disabled = true;
    btn.textContent = 'Generating Plan...';

    try {
        const result = await api.generateStudyPlan(selectedUploadId, startDate, endDate, dailyHours);
        
        displayPlan(result.plan);

    } catch (error) {
        alert('Failed to generate study plan: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Study Plan';
    }
}

async function loadExistingPlan(uploadId) {
    try {
        const result = await api.getStudyPlan(uploadId);
        
        if (result.plan && result.plan.plan_data) {
            displayPlan(result.plan.plan_data);
        }

    } catch (error) {
        // No existing plan, that's okay
        document.getElementById('planSection').style.display = 'none';
    }
}

function displayPlan(planData) {
    if (!planData || !planData.weeks) {
        document.getElementById('planSection').style.display = 'none';
        return;
    }

    document.getElementById('planSection').style.display = 'block';

    const timeline = document.getElementById('planTimeline');
    const weeks = planData.weeks;

    timeline.innerHTML = Object.keys(weeks).sort().map(weekKey => {
        const week = weeks[weekKey];
        
        return `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="week-header">
                        ${weekKey.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 1rem;">
                        ${formatDate(week.start_date)} - ${formatDate(week.end_date)} • ${week.total_hours} hours
                    </div>
                    <ul class="topic-list">
                        ${week.topics.map(topic => `
                            <li class="topic-item">
                                <div>
                                    <div style="font-weight: 600;">${topic.topic_name}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                                        ${topic.hours} hours • ${topic.difficulty}
                                    </div>
                                    ${topic.tasks && topic.tasks.length > 0 ? `
                                        <ul style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); list-style: inside;">
                                            ${topic.tasks.map(task => `<li>${task}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }).join('');
}