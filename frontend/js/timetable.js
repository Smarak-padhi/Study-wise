// Timetable Page Logic

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize user info
    const email = window.api.userEmail;
    const emailEl = document.getElementById('userEmailSidebar');
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    
    if (emailEl) emailEl.textContent = email;
    if (nameEl) nameEl.textContent = email.split('@')[0] || 'Student';
    if (avatarEl) avatarEl.textContent = (email[0] || 'U').toUpperCase();

    // Load timetable
    await loadTimetable();
});

async function loadTimetable() {
    const container = document.getElementById('timetableList');
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#6B7280;">Loading...</div>';

    try {
        const data = await window.api.getTimetable();

        if (!data.classes || data.classes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🕐</div>
                    <div class="empty-title">No classes scheduled</div>
                    <div class="empty-message">Add your class timings above to help generate better study plans</div>
                </div>
            `;
            return;
        }

        // Group by day
        const byDay = {};
        data.classes.forEach(cls => {
            if (!byDay[cls.day_of_week]) {
                byDay[cls.day_of_week] = [];
            }
            byDay[cls.day_of_week].push(cls);
        });

        // Render grouped timetable
        let html = '';
        for (let day = 0; day < 7; day++) {
            const classes = byDay[day] || [];
            if (classes.length > 0) {
                html += `
                    <div style="margin-bottom: var(--spacing-6);">
                        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--spacing-3); color: var(--primary-600);">
                            ${DAYS[day]}
                        </h3>
                        ${classes.map(cls => `
                            <div style="padding: var(--spacing-4); background: var(--gray-50); border-radius: var(--radius-lg); margin-bottom: var(--spacing-2); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: var(--font-semibold); color: var(--text-primary);">${cls.title}</div>
                                    <div style="font-size: var(--text-sm); color: var(--text-tertiary); margin-top: var(--spacing-1);">
                                        ${cls.start_time} - ${cls.end_time}
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-secondary" onclick="deleteClass('${cls.id}')">Delete</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        container.innerHTML = html || `<div class="empty-state"><div class="empty-title">No classes yet</div></div>`;

    } catch (error) {
        console.log('Timetable not yet available:', error.message);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🕐</div>
                <div class="empty-title">No classes scheduled</div>
                <div class="empty-message">Add your class timings above</div>
            </div>
        `;
    }
}

async function addClass() {
    const day = document.getElementById('daySelect').value;
    const title = document.getElementById('classTitle').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!title || !startTime || !endTime) {
        if (typeof toast !== 'undefined') {
            toast.warning('Please fill in all fields');
        } else {
            alert('Please fill in all fields');
        }
        return;
    }

    try {
        const data = await window.api.addTimetable(parseInt(day), startTime, endTime, title);

        if (data.success) {
            if (typeof toast !== 'undefined') {
                toast.success('Class added successfully');
            } else {
                alert('Class added successfully');
            }
            
            // Clear form
            document.getElementById('classTitle').value = '';
            document.getElementById('startTime').value = '';
            document.getElementById('endTime').value = '';
            
            // Reload timetable
            await loadTimetable();
        } else {
            if (typeof toast !== 'undefined') {
                toast.error(data.error || 'Failed to add class');
            } else {
                alert(data.error || 'Failed to add class');
            }
        }

    } catch (error) {
        if (typeof toast !== 'undefined') {
            toast.error('Failed to add class');
        } else {
            alert('Failed to add class');
        }
        console.error(error);
    }
}

async function deleteClass(classId) {
    if (!confirm('Delete this class?')) return;

    try {
        const data = await window.api.deleteTimetable(classId);

        if (data.success) {
            if (typeof toast !== 'undefined') {
                toast.success('Class deleted');
            } else {
                alert('Class deleted');
            }
            await loadTimetable();
        } else {
            if (typeof toast !== 'undefined') {
                toast.error('Failed to delete class');
            } else {
                alert('Failed to delete class');
            }
        }

    } catch (error) {
        if (typeof toast !== 'undefined') {
            toast.error('Failed to delete class');
        } else {
            alert('Failed to delete class');
        }
        console.error(error);
    }
}