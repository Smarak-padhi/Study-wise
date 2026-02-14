// Quiz Page Logic

let currentQuiz = null;
let userAnswers = [];
let allUploads = [];
let allTopics = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadSubjects();
    loadQuizHistory();

    document.getElementById('subjectSelect').addEventListener('change', handleSubjectChange);
    document.getElementById('generateQuizBtn').addEventListener('click', generateQuiz);
    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
    document.getElementById('cancelQuizBtn').addEventListener('click', cancelQuiz);
});

async function loadSubjects() {
    try {
        const { uploads } = await api.getUploads();
        allUploads = uploads;

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
    const topicSelect = document.getElementById('topicSelect');
    const generateBtn = document.getElementById('generateQuizBtn');

    if (!uploadId) {
        topicSelect.disabled = true;
        topicSelect.innerHTML = '<option value="">First select a subject...</option>';
        generateBtn.disabled = true;
        return;
    }

    try {
        const { topics } = await api.getTopics(uploadId, false);
        allTopics = topics;

        if (!topics || topics.length === 0) {
            topicSelect.innerHTML = '<option value="">No topics available for this subject</option>';
            topicSelect.disabled = true;
            generateBtn.disabled = true;
            return;
        }

        topicSelect.innerHTML = '<option value="">Choose a topic...</option>' +
            topics.map(t => `<option value="${t.id}">${t.topic_name}</option>`).join('');
        
        topicSelect.disabled = false;
        topicSelect.addEventListener('change', () => {
            generateBtn.disabled = !topicSelect.value;
        });

    } catch (error) {
        console.error('Failed to load topics:', error);
    }
}

async function generateQuiz() {
    const topicId = document.getElementById('topicSelect').value;
    const numQuestions = parseInt(document.getElementById('numQuestions').value);

    if (!topicId) return;

    const btn = document.getElementById('generateQuizBtn');
    btn.disabled = true;
    btn.textContent = 'Generating Quiz...';

    try {
        const result = await api.generateQuiz(topicId, numQuestions);
        
        currentQuiz = result;
        userAnswers = new Array(result.questions.length).fill(-1);

        displayQuiz(result);

    } catch (error) {
        alert('Failed to generate quiz: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Quiz';
    }
}

function displayQuiz(quiz) {
    document.getElementById('generationSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('quizTitle').textContent = quiz.title;

    const quizContent = document.getElementById('quizContent');
    quizContent.innerHTML = quiz.questions.map((q, index) => `
        <div class="question-card">
            <div class="question-number">Question ${index + 1} of ${quiz.questions.length}</div>
            <div class="question-text">${q.question}</div>
            <ul class="options-list">
                ${q.options.map((option, optIndex) => `
                    <li class="option-item" onclick="selectAnswer(${index}, ${optIndex})">
                        <input type="radio" name="q${index}" value="${optIndex}" style="margin-right: 0.5rem;">
                        ${option}
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

function selectAnswer(questionIndex, optionIndex) {
    userAnswers[questionIndex] = optionIndex;
    
    // Update UI
    const questionCard = document.querySelectorAll('.question-card')[questionIndex];
    const options = questionCard.querySelectorAll('.option-item');
    
    options.forEach((opt, idx) => {
        opt.classList.remove('selected');
        if (idx === optionIndex) {
            opt.classList.add('selected');
            opt.querySelector('input').checked = true;
        }
    });
}

async function submitQuiz() {
    if (userAnswers.includes(-1)) {
        if (!confirm('Some questions are unanswered. Submit anyway?')) {
            return;
        }
    }

    const btn = document.getElementById('submitQuizBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        const result = await api.submitQuiz(currentQuiz.quiz_id, userAnswers);
        displayResults(result);
        await loadQuizHistory();

    } catch (error) {
        alert('Failed to submit quiz: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Quiz';
    }
}

function displayResults(result) {
    document.getElementById('quizSection').style.display = 'none';
    
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';

    const scoreColor = result.percentage >= 70 ? 'var(--secondary)' : 
                      result.percentage >= 50 ? 'var(--accent)' : 'var(--danger)';

    resultsSection.innerHTML = `
        <div class="results-summary">
            <h2 style="margin-bottom: 1rem;">Quiz Results</h2>
            <div class="score-display" style="color: white;">${result.percentage}%</div>
            <div class="score-label">You scored ${result.score} out of ${result.total}</div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Answer Review</h2>
            </div>
            <div class="card-body">
                ${result.results.map(r => `
                    <div class="question-card">
                        <div class="question-number">Question ${r.question_number}</div>
                        <div class="question-text">${r.question}</div>
                        <div style="margin-top: 1rem;">
                            <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                                <div>
                                    <strong>Your answer:</strong> 
                                    <span class="${r.is_correct ? 'badge-success' : 'badge-danger'} badge">
                                        ${r.user_answer >= 0 ? currentQuiz.questions[r.question_number - 1].options[r.user_answer] : 'Not answered'}
                                    </span>
                                </div>
                                ${!r.is_correct ? `
                                    <div>
                                        <strong>Correct answer:</strong> 
                                        <span class="badge badge-success">
                                            ${currentQuiz.questions[r.question_number - 1].options[r.correct_answer]}
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                            ${r.explanation ? `
                                <div style="background: var(--bg-tertiary); padding: 0.75rem; border-radius: 0.5rem; margin-top: 0.5rem;">
                                    <strong>Explanation:</strong> ${r.explanation}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <button onclick="resetQuiz()" class="btn btn-primary" style="margin-top: 1rem;">
            Take Another Quiz
        </button>
    `;
}

function resetQuiz() {
    currentQuiz = null;
    userAnswers = [];
    
    document.getElementById('generationSection').style.display = 'block';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    
    document.getElementById('topicSelect').value = '';
    document.getElementById('generateQuizBtn').disabled = true;
}

function cancelQuiz() {
    if (confirm('Are you sure you want to cancel this quiz?')) {
        resetQuiz();
    }
}

async function loadQuizHistory() {
    const container = document.getElementById('quizHistory');
    showLoading('quizHistory');

    try {
        const { history } = await api.getQuizHistory();

        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">No quizzes taken yet</div>
                    <p style="color: var(--text-tertiary); font-size: 0.875rem;">
                        Generate and take your first quiz to see it here
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(quiz => {
            const scoreColor = quiz.percentage >= 70 ? 'var(--secondary)' : 
                              quiz.percentage >= 50 ? 'var(--accent)' : 'var(--danger)';
            
            return `
                <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${quiz.quiz_title}</div>
                        <div style="font-size: 0.875rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                            ${formatDateTime(quiz.completed_at)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${scoreColor};">
                            ${quiz.percentage}%
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">
                            ${quiz.score}/${quiz.total}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        showError('quizHistory', 'Failed to load quiz history');
    }
}