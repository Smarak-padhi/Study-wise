// Study Plan Page Logic - Production Ready

// Helper function for safe DOM access
const $ = (id) => document.getElementById(id);

let currentPlan = null;

document.addEventListener('DOMContentLoaded', async () => {
    const uploadSelect = $('uploadSelect');
    
    if (!uploadSelect) {
        console.log('Not on plan page');
        return;
    }

    console.log('✅ Plan page initialized');

    initUserInfo();
    await loadUploads();
    setupEventListeners();
    await loadStudyPlan();
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

async function loadUploads() {
    const uploadSelect = $('uploadSelect');
    const generateBtn = $('generatePlanBtn');
    
    if (!uploadSelect) {
        console.warn('⚠️ uploadSelect not found');
        return;
    }

    uploadSelect.innerHTML = '<option value="">Loading...</option>';
    uploadSelect.disabled = true;
    if (generateBtn) generateBtn.disabled = true;

    try {
        console.log('🔍 Fetching uploads for plan page...');
        
        const response = await window.api.getUploads();
        
        // Handle response shape: could be array or {uploads: array}
        let uploads = [];
        if (Array.isArray(response)) {
            uploads = response;
        } else if (response && Array.isArray(response.uploads)) {
            uploads = response.uploads;
        }

        console.log(`📦 Loaded ${uploads.length} uploads`);

        if (uploads.length === 0) {
            uploadSelect.innerHTML = '<option value="">No uploads - Upload syllabus first</option>';
            uploadSelect.disabled = true;
            if (generateBtn) generateBtn.disabled = true;
            
            if (typeof toast !== 'undefined') {
                toast.info('Upload a syllabus to create study plans');
            }
            return;
        }

        uploadSelect.innerHTML = '<option value="">Choose a syllabus...</option>' +
            uploads.map(u => {
                const subject = u.subject || u.filename || 'Untitled';
                const count = u.topics_count || 0;
                return `<option value="${u.id}">${subject} (${count} topics)</option>`;
            }).join('');

        uploadSelect.disabled = false;

    } catch (error) {
        console.error('❌ Load uploads error:', error);
        uploadSelect.innerHTML = '<option value="">Error loading</option>';
        uploadSelect.disabled = true;
        if (generateBtn) generateBtn.disabled = true;
    }
}

function setupEventListeners() {
    const uploadSelect = $('uploadSelect');
    const generateBtn = $('generatePlanBtn');
    const hoursPerDay = $('hoursPerDay');
    const targetDate = $('targetDate');

    if (uploadSelect && generateBtn) {
        uploadSelect.addEventListener('change', () => {
            generateBtn.disabled = !uploadSelect.value;
        });

        generateBtn.addEventListener('click', generatePlan);
    }

    if (hoursPerDay) {
        hoursPerDay.addEventListener('input', () => {
            let val = parseInt(hoursPerDay.value);
            if (val < 1) hoursPerDay.value = 1;
            if (val > 12) hoursPerDay.value = 12;
        });
    }

    if (targetDate && !targetDate.value) {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        targetDate.value = date.toISOString().split('T')[0];
    }
}

async function generatePlan() {
    const uploadSelect = $('uploadSelect');
    const hoursPerDay = $('hoursPerDay');
    const targetDate = $('targetDate');
    const generateBtn = $('generatePlanBtn');

    if (!uploadSelect || !hoursPerDay || !targetDate || !generateBtn) return;

    const uploadId = uploadSelect.value;
    const hours = parseInt(hoursPerDay.value) || 2;
    const target = targetDate.value;

    if (!uploadId) {
        if (typeof toast !== 'undefined') toast.warning('Please select a syllabus');
        return;
    }

    if (!target) {
        if (typeof toast !== 'undefined') toast.warning('Please select a target date');
        return;
    }

    generateBtn.disabled = true;
    const originalText = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';

    try {
        console.log(`📅 Generating plan: upload=${uploadId}, hours=${hours}, date=${target}`);

        const response = await window.api.generatePlan(uploadId, hours, target);

        console.log('✅ Plan response:', response);

        if (response.success && response.schedule) {
            currentPlan = response;
            
            // Display immediately from response (no re-fetch needed)
            displayPlan(response);
            
            if (typeof toast !== 'undefined') {
                toast.success(`Study plan created with ${response.total_days || response.schedule.length} days!`);
            }
        } else {
            throw new Error(response.error || 'Generation failed');
        }

    } catch (error) {
        console.error('❌ Plan generation error:', error);
        if (typeof toast !== 'undefined') {
            toast.error(error.message || 'Failed to generate plan');
        } else {
            alert('Failed to generate plan: ' + error.message);
        }
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
    }
}

function displayPlan(plan) {
    const planContent = $('studyPlanContent');
    
    if (!planContent) return;

    if (!plan.schedule || plan.schedule.length === 0) {
        showEmptyPlanState();
        return;
    }

    let html = '';

    plan.schedule.forEach((day, index) => {
        html += `
            <div style="margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: 0.5rem; border-left: 4px solid var(--primary-600);">
                <h3 style="font-weight: 600; margin-bottom: 1rem; color: var(--primary-600);">
                    Day ${day.day || index + 1} - ${formatDate(day.date)}
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${(day.topics || []).map(topic => `
                        <li style="padding: 0.75rem; background: var(--bg-primary); border-radius: 0.375rem; margin-bottom: 0.5rem;">
                            <strong>${escapeHtml(topic.name)}</strong>
                            ${topic.hours ? `<span style="color: var(--text-tertiary); margin-left: 0.5rem;">(${topic.hours}h)</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    });

    planContent.innerHTML = html;

    console.log(`✅ Displayed ${plan.schedule.length} days`);
}

async function loadStudyPlan() {
    const planContent = $('studyPlanContent');
    
    if (!planContent) return;

    planContent.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);">Loading...</div>';

    try {
        const response = await window.api.getStudyPlan();

        console.log('📅 Study plan fetch:', response);

        if (response.success && response.schedule) {
            currentPlan = response;
            displayPlan(response);
        } else {
            showEmptyPlanState();
        }

    } catch (error) {
        console.log('📅 Plan fetch result:', error.message);

        // Handle 404 as normal empty state
        if (error.message && error.message.toLowerCase().includes('no study plan found')) {
            console.log('ℹ️ No plan exists yet (expected)');
            showEmptyPlanState();
        } else {
            // Real errors
            console.error('❌ Unexpected error:', error);
            
            planContent.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: #ef4444;">⚠️</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Failed to load</h3>
                    <p style="color: var(--text-tertiary); margin-bottom: 1rem;">${error.message}</p>
                    <button onclick="loadStudyPlan()" class="btn btn-secondary">Retry</button>
                </div>
            `;
            
            if (typeof toast !== 'undefined') {
                toast.error('Failed to load study plan');
            }
        }
    }
}

function showEmptyPlanState() {
    const planContent = $('studyPlanContent');
    
    if (!planContent) return;
    
    planContent.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                No study plan yet
            </h3>
            <p style="color: var(--text-tertiary);">
                Generate a study plan to get started
            </p>
        </div>
    `;
}

// Make loadStudyPlan globally accessible
window.loadStudyPlan = loadStudyPlan;

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}