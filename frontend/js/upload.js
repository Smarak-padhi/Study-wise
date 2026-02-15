// Upload Page Logic - Production Ready

const $ = (id) => document.getElementById(id);

let currentUploads = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Upload page DOMContentLoaded fired');
    
    const syllabusFileInput = $('syllabusFileInput');
    
    if (!syllabusFileInput) {
        console.log('Not on upload page');
        return;
    }

    console.log('✅ Upload page initialized');

    initUserInfo();
    setupSyllabusUpload();
    setupPYQUpload();
    
    // ✅ CRITICAL: Load uploads on page load
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

    if (!fileInput || !uploadZone || !uploadBtn || !subjectInput) {
        console.warn('⚠️ Some syllabus upload elements missing');
        return;
    }

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
            } else {
                alert('Please select a file and enter a subject');
            }
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            console.log('📤 Uploading syllabus:', subject);
            
            const result = await window.api.uploadSyllabus(file, subject);
            
            console.log('✅ Upload successful:', result);
            
            if (typeof toast !== 'undefined') {
                toast.success(`Uploaded! Extracted ${result.topics_count || 0} topics`);
            } else {
                alert(`Success! Extracted ${result.topics_count || 0} topics`);
            }
            
            // Reset form
            fileInput.value = '';
            subjectInput.value = '';
            uploadZone.innerHTML = `
                <div class="upload-icon">📄</div>
                <div class="upload-text"><strong>Click to upload</strong> or drag and drop</div>
                <div class="upload-hint">PDF files only (Max 30MB)</div>
            `;
            
            // ✅ RELOAD UPLOADS LIST
            await loadUploads();
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            if (typeof toast !== 'undefined') {
                toast.error(error.message || 'Upload failed');
            } else {
                alert(`Upload failed: ${error.message}`);
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

    if (!fileInput || !uploadZone || !uploadBtn || !subjectSelect) {
        console.warn('⚠️ Some PYQ upload elements missing');
        return;
    }

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
            } else {
                alert('PYQ uploaded successfully!');
            }
            
            fileInput.value = '';
            uploadZone.innerHTML = `
                <div class="upload-icon">📝</div>
                <div class="upload-text"><strong>Click to upload PYQ</strong> or drag and drop</div>
                <div class="upload-hint">PDF files only (Max 30MB)</div>
            `;
            
        } catch (error) {
            console.error('❌ PYQ upload error:', error);
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

    if (!container) {
        console.warn('⚠️ uploadsList container not found');
        return;
    }

    console.log('🔍 Loading uploads...');
    
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6B7280;">Loading...</div>';

    try {
        const uploads = await window.api.getUploads();
        currentUploads = uploads;

        console.log('📦 Uploads loaded:', uploads);
        console.log('📊 Upload count:', uploads.length);

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

        // Populate PYQ dropdown
        if (pyqSelect) {
            pyqSelect.innerHTML = '<option value="">Choose a subject...</option>' +
                uploads.map(u => `<option value="${u.id}">${u.subject || u.filename || 'Untitled'}</option>`).join('');
            pyqSelect.disabled = false;
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

        console.log(`✅ Displayed ${uploads.length} uploads`);

    } catch (error) {
        console.error('❌ Load uploads error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: #ef4444;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Failed to load uploads</h3>
                <p style="color: #6B7280;">${error.message}</p>
                <button onclick="loadUploads()" class="btn btn-secondary" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

// Make loadUploads globally accessible for retry button
window.loadUploads = loadUploads;

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}