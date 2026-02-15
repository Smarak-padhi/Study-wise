// Upload Page Logic - Production Ready

const $ = (id) => document.getElementById(id);

let currentUploads = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!$('syllabusFileInput')) {
        console.log('Not on upload page');
        return;
    }

    console.log('✅ Upload page initialized');

    initUserInfo();
    setupSyllabusUpload();
    setupPYQUpload();
    await loadUploads();
});

function initUserInfo() {
    const email = window.api.userEmail;
    const emailEl = $('userEmailSidebar');
    const nameEl = $('userName');
    const avatarEl = $('userAvatar');
    
    if (emailEl) emailEl.textContent = email;
    if (nameEl) nameEl.textContent = email.split('@')[0] || 'Student';
    if (avatarEl) avatarEl.textContent = (email[0] || 'U').toUpperCase();
}

function setupSyllabusUpload() {
    const fileInput = $('syllabusFileInput');
    const uploadZone = $('syllabusUploadZone');
    const uploadBtn = $('uploadSyllabusBtn');
    const subjectInput = $('subjectInput');

    if (!fileInput || !uploadZone || !uploadBtn || !subjectInput) return;

    uploadZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadBtn.disabled = false;
            uploadZone.innerHTML = `
                <div class="upload-icon">✅</div>
                <div class="upload-text">${file.name}</div>
                <div class="upload-hint">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
            `;
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const subject = subjectInput.value.trim();

        if (!file || !subject) {
            if (typeof toast !== 'undefined') {
                toast.error('Please select a file and enter a subject');
            }
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            const result = await window.api.uploadSyllabus(file, subject);
            
            if (typeof toast !== 'undefined') {
                toast.success(`Uploaded! Extracted ${result.topics_count || 0} topics`);
            }
            
            fileInput.value = '';
            subjectInput.value = '';
            uploadZone.innerHTML = `
                <div class="upload-icon">📄</div>
                <div class="upload-text"><strong>Click to upload</strong> or drag and drop</div>
                <div class="upload-hint">PDF files only (Max 30MB)</div>
            `;
            
            await loadUploads();
            
        } catch (error) {
            console.error('Upload error:', error);
            if (typeof toast !== 'undefined') {
                toast.error(error.message || 'Upload failed');
            }
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Syllabus';
        }
    });
}

function setupPYQUpload() {
    const fileInput = $('pyqFileInput');
    const uploadZone = $('pyqUploadZone');
    const uploadBtn = $('uploadPyqBtn');
    const subjectSelect = $('pyqSubjectSelect');

    if (!fileInput || !uploadZone || !uploadBtn || !subjectSelect) return;

    uploadZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const uploadId = subjectSelect.value;
            uploadBtn.disabled = !uploadId;
            uploadZone.innerHTML = `
                <div class="upload-icon">✅</div>
                <div class="upload-text">${file.name}</div>
                <div class="upload-hint">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
            `;
        }
    });

    subjectSelect.addEventListener('change', () => {
        uploadBtn.disabled = !subjectSelect.value || !fileInput.files[0];
    });

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const uploadId = subjectSelect.value;

        if (!file || !uploadId) {
            if (typeof toast !== 'undefined') {
                toast.error('Please select a file and subject');
            }
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            const result = await window.api.uploadPYQ(file, uploadId);
            
            if (typeof toast !== 'undefined') {
                toast.success('PYQ uploaded successfully!');
            }
            
            fileInput.value = '';
            uploadZone.innerHTML = `
                <div class="upload-icon">📝</div>
                <div class="upload-text"><strong>Click to upload PYQ</strong> or drag and drop</div>
                <div class="upload-hint">PDF files only (Max 30MB)</div>
            `;
            
        } catch (error) {
            console.error('PYQ upload error:', error);
            if (typeof toast !== 'undefined') {
                toast.error(error.message || 'PYQ upload failed');
            }
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload PYQ';
        }
    });
}

async function loadUploads() {
    const container = $('uploadsList');
    const pyqSelect = $('pyqSubjectSelect');

    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6B7280;">Loading...</div>';

    try {
        const uploads = await window.api.getUploads();
        currentUploads = uploads;

        console.log(`📦 Loaded ${uploads.length} uploads`);

        if (uploads.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No uploads yet</h3>
                    <p style="color: #6B7280;">Upload a syllabus to get started</p>
                </div>
            `;
            
            if (pyqSelect) {
                pyqSelect.innerHTML = '<option value="">No subjects available</option>';
                pyqSelect.disabled = true;
            }
            return;
        }

        if (pyqSelect) {
            pyqSelect.innerHTML = '<option value="">Choose a subject...</option>' +
                uploads.map(u => `<option value="${u.id}">${u.subject || u.filename || 'Untitled'}</option>`).join('');
            pyqSelect.disabled = false;
        }

        container.innerHTML = uploads.map(upload => `
            <div class="card" style="margin-bottom: 1rem;">
                <div style="padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
                                ${upload.subject || 'General'}
                            </h3>
                            <div style="color: #6B7280; font-size: 0.875rem;">${upload.filename}</div>
                            <div style="color: #6B7280; font-size: 0.75rem; margin-top: 0.25rem;">
                                ${formatDate(upload.uploaded_at || new Date())}
                            </div>
                        </div>
                        <span class="badge badge-info">${upload.topics_count || 0} topics</span>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Load uploads error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No uploads yet</h3>
                <p style="color: #6B7280;">Upload a syllabus to get started</p>
            </div>
        `;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}