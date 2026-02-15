// Quiz Page Logic - Two-Step Selection (Subject → Topic)

const $ = (id) => document.getElementById(id);

let currentQuiz = null;
let currentQuestions = [];
let userAnswers = {};
let currentUploads = [];
let currentTopics = [];

document.addEventListener('DOMContentLoaded', async () => {
    const subjectSelect = $('subjectSelect');
    const topicSelect = $('topicSelect');
    
    if (!subjectSelect || !topicSelect) {
        console.log('Not on quiz page');
        return;
    }

    console.log('✅ Quiz page initialized');

    initUserInfo();
    await loadSubjects();
    setupEventListeners();
    await loadQuizHistory();
});

function initUserInfo() {
    const email = window.api.userEmail;
    const emailEl = $('userEmailSidebar');
    const nameEl = $('userName');
    const avatarEl = $('userAvatar');
    
    if (emailEl) emailEl.textContent = email;
    if (nameEl) nameEl.textContent = email.split('@')[0] || 'Student';
    if (avatarEl) avatarEl.textContent = (email[0] || 'S').toUpperCase();
}

// STEP 1: Load subjects (uploads)
async function loadSubjects() {
    const subjectSelect = $('subjectSelect');
    const topicSelect = $('topicSelect');
    const generateBtn = $('generateQuizBtn');
    
    if (!subjectSelect) return;

    subjectSelect.innerHTML = '<option value="">Loading subjects...</option>';
    subjectSelect.disabled = true;
    
    if (topicSelect) {
        topicSelect.innerHTML = '<option value="">Select a subject first</option>';
        topicSelect.disabled = true;
    }
    
    if (generateBtn) generateBtn.disabled = true;

    try {
        const uploads = await window.api.getUploads();
        currentUploads = uploads;

        console.log(`📦 Loaded ${uploads.length} subjects`);

        if (uploads.length === 0) {
            subjectSelect.innerHTML = '<option value="">No subjects - Upload syllabus first</option>';
            subjectSelect.disabled = true;
            return;
        }

        subjectSelect.innerHTML = '<option value="">Choose a subject...</option>' +
            uploads.map(u => {
                const subject = u.subject || u.filename || 'Untitled';
                const count = u.topics_count || 0;
                return `<option value="${u.id}">${subject} (${count} topics)</option>`;
            }).join('');

        subjectSelect.disabled = false;

    } catch (error) {
        console.error('Load subjects error:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
        subjectSelect.disabled = true;
    }
}

// STEP 2: Load topics for selected subject
async function loadTopics(uploadId) {
    const topicSelect = $('topicSelect');
    const generateBtn = $('generateQuizBtn');
    
    if (!topicSelect) return;

    console.log(`🔍 Loading topics for upload: ${uploadId}`);

    topicSelect.innerHTML = '<option value="">Loading topics...</option>';
    topicSelect.disabled = true;
    if (generateBtn) generateBtn.disabled = true;

    try {
        const topics = await window.api.getTopics(uploadId);
        currentTopics = topics;

        console.log(`📚 Loaded ${topics.length} topics`);

        if (topics.length === 0) {
            topicSelect.innerHTML = '<option value="">No topics found for this subject</option>';
            topicSelect.disabled = true;
            if (generateBtn) generateBtn.disabled = true;
            
            if (typeof toast !== 'undefined') {
                toast.warning('This subject has no topics. Try re-uploading the syllabus.');
            }
            return;
        }

        topicSelect.innerHTML = '<option value="">Choose a topic...</option>' +
            topics.map(t => `<option value="${t.id}">${t.topic_name}</option>`).join('');

        topicSelect.disabled = false;

    } catch (error) {
        console.error('Load topics error:', error);
        topicSelect.innerHTML = '<option value="">Error loading topics</option>';
        topicSelect.disabled = true;
        if (generateBtn) generateBtn.disabled = true;
    }
}

function setupEventListeners() {
    const subjectSelect = $('subjectSelect');
    const topicSelect = $('topicSelect');
    const generateBtn = $('generateQuizBtn');
    const submitBtn = $('submitQuizBtn');
    const numQuestions = $('numQuestions');

    // Subject selection triggers topic loading
    if (subjectSelect) {
        subjectSelect.addEventListener('change', async () => {
            const uploadId = subjectSelect.value;
            
            if (uploadId) {
                await loadTopics(uploadId);
            } else {
                if (topicSelect) {
                    topicSelect.innerHTML = '<option value="">Select a subject first</option>';
                    topicSelect.disabled = true;
                }
                if (generateBtn) generateBtn.disabled = true;
            }
        });
    }

    // Topic selection enables generate button
    if (topicSelect && generateBtn) {
        topicSelect.addEventListener('change', () => {
            generateBtn.disabled = !topicSelect.value;
        });

        generateBtn.addEventListener('click', generateQuiz);
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', submitQuiz);
    }

    if (numQuestions) {
        numQuestions.addEventListener('input', () => {
            let val = parseInt(numQuestions.value);
            if (val < 1) numQuestions.value = 1;
            if (val > 20) numQuestions.value = 20;
        });
    }
}

async function generateQuiz() {
    const topicSelect = $('topicSelect');
    const numQuestions = $('numQuestions');
    const generateBtn = $('generateQuizBtn');
    const quizContainer = $('quizContainer');

    if (!topicSelect || !numQuestions || !generateBtn) return;

    const topicId = topicSelect.value;  // ✅ Now using topic_id
    const num = parseInt(numQuestions.value) || 5;

    if (!topicId) {
        if (typeof toast !== 'undefined') toast.warning('Please select a topic');
        return;
    }

    generateBtn.disabled = true;
    const originalText = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';

    try {
        console.log(`🎯 Generating quiz: topic_id=${topicId}, questions=${num}`);

        const response = await window.api.generateQuiz(topicId, num);  // ✅ Sends topic_id

        console.log('✅ Quiz response:', response);

        if (response.success && response.questions) {
            currentQuiz = response;
            currentQuestions = response.questions;
            userAnswers = {};

            displayQuiz();

            if (quizContainer) {
                quizContainer.style.display = 'block';
                setTimeout(() => quizContainer.scrollIntoView({ behavior: 'smooth' }), 100);
            }

            if (typeof toast !== 'undefined') {
                toast.success(`Quiz ready with ${response.questions.length} questions!`);
            }
        } else {
            throw new Error(response.error || 'Generation failed');
        }

    } catch (error) {
        console.error('Quiz generation error:', error);
        if (typeof toast !== 'undefined') {
            toast.error(error.message || 'Failed to generate quiz');
        } else {
            alert('Failed to generate quiz: ' + error.message);
        }
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
    }
}

function displayQuiz() {
    const quizQuestions = $('quizQuestions');
    const quizTitle = $('quizTitle');
    const submitBtn = $('submitQuizBtn');

    if (!quizQuestions || !currentQuestions || currentQuestions.length === 0) return;

    if (quizTitle) {
        const topicSelect = $('topicSelect');
        if (topicSelect && topicSelect.selectedIndex > 0) {
            quizTitle.textContent = topicSelect.options[topicSelect.selectedIndex].text;
        }
    }

    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;
    }

    quizQuestions.innerHTML = currentQuestions.map((q, index) => `
        <div class="quiz-question" style="margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: 0.5rem;">
            <div style="font-weight: 600; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;">
                <span style="color: var(--primary-600);">Q${index + 1}.</span> ${escapeHtml(q.question)}
            </div>
            <div class="quiz-options" style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${q.options.map((option, optIndex) => `
                    <label class="quiz-option" style="display: flex; align-items: center; padding: 1rem; background: var(--bg-primary); border: 2px solid var(--border-color); border-radius: 0.5rem; cursor: pointer;">
                        <input 
                            type="radio" 
                            name="question_${index}" 
                            value="${optIndex}"
                            onchange="window.selectAnswer(${index}, ${optIndex})"
                            style="margin-right: 0.75rem; cursor: pointer;"
                        >
                        <span>${escapeHtml(option)}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function selectAnswer(questionIndex, optionIndex) {
    userAnswers[questionIndex] = optionIndex;
}

window.selectAnswer = selectAnswer;

async function submitQuiz() {
    const submitBtn = $('submitQuizBtn');
    
    if (!currentQuiz || !currentQuestions || currentQuestions.length === 0) {
        if (typeof toast !== 'undefined') toast.error('No quiz to submit');
        return;
    }

    const answered = Object.keys(userAnswers).length;
    const total = currentQuestions.length;
    const unanswered = total - answered;
    
    if (unanswered > 0) {
        if (!confirm(`${unanswered} unanswered. Submit anyway?`)) return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }

    try {
        const response = await window.api.submitQuiz(currentQuiz.quiz_id, userAnswers);

        if (response.success || response.score !== undefined) {
            displayResults(response);
            if (typeof toast !== 'undefined') toast.success(`Score: ${response.score || response.percentage}%`);
            await loadQuizHistory();
        } else {
            throw new Error(response.error || 'Submission failed');
        }

    } catch (error) {
        console.error('Submission error:', error);
        if (typeof toast !== 'undefined') toast.error(error.message);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Quiz';
        }
    }
}

function displayResults(results) {
    const quizQuestions = $('quizQuestions');
    const submitBtn = $('submitQuizBtn');
    
    if (!quizQuestions) return;

    const score = results.score || results.percentage || 0;
    const correct = results.correct || 0;
    const total = results.total || currentQuestions.length;
    const correctAnswers = results.correct_answers || results.results?.map(r => r.correct_answer) || [];

    let html = `
        <div style="text-align: center; padding: 3rem 2rem; margin-bottom: 2rem; background: linear-gradient(135deg, ${score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}, ${score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'}); color: white; border-radius: 1rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">${score >= 70 ? '🎉' : score >= 50 ? '👍' : '📚'}</div>
            <h2 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${score}%</h2>
            <p style="font-size: 1.25rem; opacity: 0.9;">${correct}/${total} correct</p>
        </div>
    `;

    html += currentQuestions.map((q, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = correctAnswers[index];
        const isCorrect = userAnswer === correctAnswer;

        return `
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: 0.5rem; border-left: 4px solid ${isCorrect ? '#10b981' : '#ef4444'};">
                <div style="font-weight: 600; margin-bottom: 1rem;">
                    Q${index + 1}. ${escapeHtml(q.question)}
                    ${isCorrect ? '<span style="color: #10b981;">✓</span>' : '<span style="color: #ef4444;">✗</span>'}
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: #dcfce7; border-radius: 0.375rem;">
                    <strong style="color: #166534;">✓ Correct:</strong> ${escapeHtml(q.options[correctAnswer])}
                </div>
                ${userAnswer !== undefined && !isCorrect ? `
                    <div style="margin-top: 0.75rem; padding: 1rem; background: #fee2e2; border-radius: 0.375rem;">
                        <strong style="color: #991b1b;">✗ Your answer:</strong> ${escapeHtml(q.options[userAnswer])}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    quizQuestions.innerHTML = html;

    if (submitBtn) submitBtn.style.display = 'none';
}

async function loadQuizHistory() {
    const historyContainer = $('quizHistory');
    if (!historyContainer) return;

    historyContainer.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);">Loading...</div>';

    try {
        const response = await window.api.getQuizHistory();
        const history = Array.isArray(response) ? response : (response.history || []);

        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No history yet</h3>
                    <p style="color: var(--text-tertiary);">Take your first quiz!</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = history.map(quiz => {
            const score = quiz.score || quiz.percentage || 0;
            const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
            
            return `
                <div style="padding: 1.5rem; background: var(--bg-secondary); border-radius: 0.5rem; margin-bottom: 1rem; border-left: 4px solid ${color};">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <h4 style="font-weight: 600; margin-bottom: 0.5rem;">${escapeHtml(quiz.topic_name || quiz.quiz_title || 'Quiz')}</h4>
                            <p style="font-size: 0.875rem; color: var(--text-tertiary);">${formatDateTime(quiz.completed_at || new Date())}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 2rem; font-weight: 700; color: ${color};">${score}%</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('History error:', error);
        historyContainer.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);">No history available</div>';
    }
}

window.loadQuizHistory = loadQuizHistory;

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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