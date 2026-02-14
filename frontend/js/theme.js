// Theme Management - Apply immediately on load
(function() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
})();

// Global theme setter
function setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Global theme getter
function getTheme() {
    return localStorage.getItem('theme') || 'light';
}