// Toast Notification System

class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type] || titles.info}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        `;

        this.container.appendChild(toast);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideInRight 0.2s reverse';
                setTimeout(() => toast.remove(), 200);
            }, duration);
        }

        return toast;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Global toast instance
const toast = new ToastManager();

// Loading state manager
class LoadingManager {
    static show(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.innerHTML = `
            <div class="loading-overlay">
                <div class="spinner"></div>
            </div>
        `;
    }

    static showSkeleton(elementId, lines = 3) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const skeletons = Array(lines).fill(0).map(() => 
            '<div class="skeleton skeleton-text"></div>'
        ).join('');

        element.innerHTML = skeletons;
    }

    static hide(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.innerHTML = '';
    }
}

// Mobile menu toggle
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-visible');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('mobile-visible');
                }
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initMobileMenu);
