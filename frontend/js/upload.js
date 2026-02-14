// Upload Page Logic

let currentUploads = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize user info
    const email = window.api.userEmail;
    const emailEl = document.getElementById('userEmailSidebar');
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    
    if (emailEl) emailEl.textContent = email;
    if (nameEl) nameEl.textContent = email.split('@')[0] || 'Student';
    if (avatarEl) avatarEl.textContent = (email[0] || 'U').toUpperCase();

    // Setup syllabus upload
    setupSyllabusUpload();
    
    // Setup PYQ upload
    setupPYQUpload();
    
    // Load uploads
    await loadUploads();
});

function setupSyllabusUpload() {
    const fileInput = document.getElementById('syllabusFileInput');
    const uploadZone = document.getElementById('syllabusUploadZone');
    const uploadBtn = document.getElementById('uploadSyllabusBtn');
    const subjectInput = document.getElementById('subjectInput');

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File selected
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

    // Upload button
    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const subject = subjectInput.value.trim();

        if (!file || !subject) {
            if (typeof toast !== 'undefined') toast.error('Please select a file and enter a subject');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            const result = await window.api.uploadSyllabus(file, subject);
            
            if (typeof toast !== 'undefined') {
                toast.success(`Uploaded! Extracted ${result.topics_count || 0} topics`);
            }
            
            // Reset form
            fileInput.value = '';
            subjectInput.value = '';
            uploadZone.innerHTML = `
                <div class="upload-icon">📄</div>
                <div class="upload-text"><strong>Click to upload</strong> or drag and drop</div>
                <div class="upload-hint">PDF files only (Max 30MB)</div>
            `;
            
            // Reload uploads
            await loadUploads();
            
        } catch (error) {
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
    const fileInput = document.getElementById('pyqFileInput');
    const uploadZone = document.getElementById('pyqUploadZone');
    const uploadBtn = document.getElementById('uploadPyqBtn');
    const subjectSelect = document.getElementById('pyqSubjectSelect');

    if (!fileInput || !uploadZone || !uploadBtn || !subjectSelect) return;

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File selected
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

    // Subject selected
    subjectSelect.addEventListener('change', () => {
        uploadBtn.disabled = !subjectSelect.value || !fileInput.files[0];
    });

    // Upload button
    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const uploadId = subjectSelect.value;

        if (!file || !uploadId) {
            if (typeof toast !== 'undefined') toast.error('Please select a file and subject');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            const result = await window.api.uploadPYQ(file, uploadId);
            
            if (typeof toast !== 'undefined') {
                toast.success('PYQ uploaded successfully!');
            }
            
            // Reset form
            fileInput.value = '';
            uploadZone.innerHTML = `
                <div class="upload-icon">📝</div>
                <div class="upload-text"><strong>Click to upload PYQ</strong> or drag and drop</div>
                <div class="upload-hint">PDF files only (Max 30MB)</div>
            `;
            
        } catch (error) {
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
    const container = document.getElementById('uploadsList');
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6B7280;">Loading...</div>';

    try {
        const data = await window.api.getUploads();
        const uploads = data.uploads || [];
        currentUploads = uploads;

        if (uploads.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                        No uploads yet
                    </h3>
                    <p style="color: var(--text-tertiary); margin-bottom: 1.5rem;">
                        Upload a syllabus to get started
                    </p>
                </div>
            `;
            
            // Update PYQ dropdown
            const pyqSelect = document.getElementById('pyqSubjectSelect');
            if (pyqSelect) {
                pyqSelect.innerHTML = '<option value="">No subjects yet - upload a syllabus first</option>';
                const pyqBtn = document.getElementById('uploadPyqBtn');
                if (pyqBtn) pyqBtn.disabled = true;
            }
            return;
        }

        // Update PYQ dropdown
        const pyqSelect = document.getElementById('pyqSubjectSelect');
        if (pyqSelect) {
            pyqSelect.innerHTML = '<option value="">Choose a subject...</option>' +
                uploads.map(u => `<option value="${u.id}">${u.subject || u.filename}</option>`).join('');
        }

        // Display uploads
        container.innerHTML = uploads.map(upload => `
            <div class="card" style="margin-bottom: 1rem;">
                <div style="padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
                                ${upload.subject || 'General'}
                            </h3>
                            <div style="color: var(--text-tertiary); font-size: 0.875rem;">
                                ${upload.filename}
                            </div>
                            <div style="color: var(--text-tertiary); font-size: 0.75rem; margin-top: 0.25rem;">
                                Uploaded: ${formatDate(upload.uploaded_at || new Date())}
                            </div>
                        </div>
                        <span class="badge badge-info">${upload.topics_count || 0} topics</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <a href="plan.html?upload=${upload.id}" class="btn btn-primary">
                            View Topics
                        </a>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.log('Uploads not available yet:', error.message);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
                    No uploads yet
                </h3>
                <p style="color: var(--text-tertiary);">
                    Upload a syllabus to get started
                </p>
            </div>
        `;
    }
}