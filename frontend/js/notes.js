// Notes Page Logic

let currentNoteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize user info
    const email = api.userEmail;
    document.getElementById('userEmailSidebar').textContent = email;
    document.getElementById('userName').textContent = email.split('@')[0];
    document.getElementById('userAvatar').textContent = email[0].toUpperCase();

    // Load notes
    await loadNotes();
});

async function loadNotes() {
    const container = document.getElementById('notesList');
    LoadingManager.show('notesList');

    try {
        const response = await fetch(`${API_BASE_URL}/notes/${encodeURIComponent(api.userEmail)}`);
        const data = await response.json();

        if (!data.notes || data.notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">No notes yet</div>
                    <div class="empty-message">Create your first note above</div>
                </div>
            `;
            return;
        }

        container.innerHTML = data.notes.map(note => `
            <div style="padding: var(--spacing-4); background: var(--gray-50); border-radius: var(--radius-lg); margin-bottom: var(--spacing-3);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-2);">
                    <div>
                        <h3 style="font-weight: var(--font-semibold); font-size: var(--text-lg); margin-bottom: var(--spacing-1);">${note.subject}</h3>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary);">
                            ${formatDateTime(note.updated_at || note.created_at)}
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--spacing-2);">
                        <button class="btn btn-sm btn-secondary" onclick="editNote('${note.id}', '${escapeHtml(note.subject)}', \`${escapeHtml(note.content)}\`)">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="deleteNote('${note.id}')">
                            Delete
                        </button>
                    </div>
                </div>
                <div style="color: var(--text-secondary); white-space: pre-wrap; font-size: var(--text-sm);">
                    ${escapeHtml(note.content).substring(0, 200)}${note.content.length > 200 ? '...' : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.log('Notes not yet available:', error.message);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-title">No notes yet</div>
                <div class="empty-message">Create your first note above</div>
            </div>
        `;
    }
}

async function saveNote() {
    const subject = document.getElementById('noteSubject').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!subject || !content) {
        toast.warning('Please fill in both subject and content');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: api.userEmail,
                subject: subject,
                content: content,
                note_id: currentNoteId
            })
        });

        const data = await response.json();

        if (data.success) {
            toast.success(currentNoteId ? 'Note updated' : 'Note saved');
            clearEditor();
            await loadNotes();
        } else {
            toast.error(data.error || 'Failed to save note');
        }

    } catch (error) {
        toast.error('Failed to save note');
        console.error(error);
    }
}

function editNote(id, subject, content) {
    currentNoteId = id;
    document.getElementById('editorTitle').textContent = 'Edit Note';
    document.getElementById('noteSubject').value = subject;
    document.getElementById('noteContent').value = content;
    
    // Scroll to editor
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearEditor() {
    currentNoteId = null;
    document.getElementById('editorTitle').textContent = 'New Note';
    document.getElementById('noteSubject').value = '';
    document.getElementById('noteContent').value = '';
}

async function deleteNote(noteId) {
    if (!confirm('Delete this note?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            toast.success('Note deleted');
            if (currentNoteId === noteId) {
                clearEditor();
            }
            await loadNotes();
        } else {
            toast.error('Failed to delete note');
        }

    } catch (error) {
        toast.error('Failed to delete note');
        console.error(error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}