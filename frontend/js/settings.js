// Settings Page Logic

let ollamaStatus = { available: false };
let cloudStatus = { configured: false };

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize user info
    const email = api.userEmail;
    document.getElementById('userEmail').textContent = email;
    document.getElementById('userName').textContent = email.split('@')[0];
    document.getElementById('userAvatar').textContent = email[0].toUpperCase();

    // Initialize dark mode
    initDarkMode();

    // Load current mode
    await loadCurrentMode();

    // Check all statuses
    await checkAllStatuses();

    // Setup radio change handlers
    setupRadioHandlers();
});

// Dark Mode Functions
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    // Set toggle to match current theme
    const currentTheme = getTheme();
    darkModeToggle.checked = (currentTheme === 'dark');
    
    // Toggle handler
    darkModeToggle.addEventListener('change', function() {
        setTheme(this.checked ? 'dark' : 'light');
    });
}

// Accordion toggle function
function toggleAccordion(header) {
    const item = header.parentElement;
    const content = header.nextElementSibling;
    const icon = header.querySelector('.accordion-icon');
    
    // Toggle active state
    item.classList.toggle('active');
    
    // Rotate icon
    if (item.classList.contains('active')) {
        icon.style.transform = 'rotate(180deg)';
        content.style.maxHeight = content.scrollHeight + 'px';
    } else {
        icon.style.transform = 'rotate(0deg)';
        content.style.maxHeight = '0';
    }
}

async function loadCurrentMode() {
    try {
        const currentMode = AIMode.current;
        
        // Set radio button
        const radio = document.querySelector(`input[name="aiMode"][value="${currentMode}"]`);
        if (radio) {
            radio.checked = true;
            radio.closest('.radio-option').classList.add('selected');
        }

        // Update display
        updateModeDisplay(currentMode);

    } catch (error) {
        console.error('Failed to load current mode:', error);
    }
}

async function checkAllStatuses() {
    // Check Ollama
    await checkOllamaStatus();
    
    // Check Cloud
    await checkCloudStatus();
}

async function checkOllamaStatus() {
    const badge = document.getElementById('ollamaBadge');
    const setup = document.getElementById('ollamaSetup');
    const guideCard = document.getElementById('ollamaGuideCard');

    try {
        const status = await api.checkOllamaStatus();
        ollamaStatus = status;

        if (status.available) {
            badge.className = 'badge badge-success';
            badge.innerHTML = '<span class="badge-dot"></span> Ready';
            setup.classList.add('hidden');
            if (guideCard) guideCard.style.display = 'none';
        } else {
            badge.className = 'badge badge-warning';
            badge.innerHTML = '<span class="badge-dot"></span> Not detected';
            setup.classList.remove('hidden');
            if (guideCard) guideCard.style.display = 'block';
        }
    } catch (error) {
        console.error('Ollama check failed:', error);
        badge.className = 'badge badge-error';
        badge.innerHTML = '<span class="badge-dot"></span> Error';
        setup.classList.remove('hidden');
        if (guideCard) guideCard.style.display = 'block';
    }
}

async function checkCloudStatus() {
    const badge = document.getElementById('cloudBadge');
    const setup = document.getElementById('cloudSetup');

    try {
        const status = await api.checkCloudStatus();
        cloudStatus = status;

        if (status.configured) {
            badge.className = 'badge badge-success';
            badge.innerHTML = '<span class="badge-dot"></span> Configured';
            setup.classList.add('hidden');
        } else {
            badge.className = 'badge badge-warning';
            badge.innerHTML = '<span class="badge-dot"></span> Not configured';
            setup.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Cloud check failed:', error);
        badge.className = 'badge badge-error';
        badge.innerHTML = '<span class="badge-dot"></span> Error';
        setup.classList.remove('hidden');
    }
}

function setupRadioHandlers() {
    const radios = document.querySelectorAll('input[name="aiMode"]');
    
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Remove selected class from all options
            document.querySelectorAll('.radio-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to chosen option
            if (e.target.checked) {
                e.target.closest('.radio-option').classList.add('selected');
            }
        });
    });
}

async function saveAIMode() {
    const selectedMode = document.querySelector('input[name="aiMode"]:checked').value;

    // Validate mode availability
    if (selectedMode === 'ollama' && !ollamaStatus.available) {
        toast.warning('Ollama is not available. Install it first or use another mode.');
        return;
    }

    if (selectedMode === 'cloud' && !cloudStatus.configured) {
        toast.warning('Cloud AI is not configured. Contact admin or use another mode.');
        return;
    }

    try {
        await api.setAIMode(selectedMode);
        AIMode.set(selectedMode);
        
        updateModeDisplay(selectedMode);
        
        toast.success(`AI mode switched to ${getAIModeName(selectedMode)}`);
        
        // Auto-fallback message
        if (selectedMode !== 'free') {
            setTimeout(() => {
                toast.info('If this mode is unavailable during use, we\'ll automatically fallback to Free mode.');
            }, 1000);
        }

    } catch (error) {
        toast.error(`Failed to save mode: ${error.message}`);
    }
}

async function testOllama() {
    toast.info('Testing Ollama connection...');
    
    try {
        await checkOllamaStatus();
        
        if (ollamaStatus.available) {
            toast.success(`Ollama is ready! Model: ${ollamaStatus.model_recommended || 'phi3'}`);
        } else {
            toast.warning('Ollama is not running. Make sure it\'s installed and running.');
        }
    } catch (error) {
        toast.error('Ollama test failed. Check if it\'s installed and running.');
    }
}

async function testCloud() {
    toast.info('Testing Cloud AI connection...');
    
    try {
        await checkCloudStatus();
        
        if (cloudStatus.configured) {
            toast.success(`Cloud AI is configured! Model: ${cloudStatus.model_default || 'gpt-4o-mini'}`);
        } else {
            toast.warning('Cloud AI is not configured. Contact your admin.');
        }
    } catch (error) {
        toast.error('Cloud AI test failed.');
    }
}

async function testAllModes() {
    toast.info('Testing all AI modes...');
    
    await checkOllamaStatus();
    await checkCloudStatus();
    
    const results = [];
    results.push('Free: ✓ Always available');
    results.push(`Ollama: ${ollamaStatus.available ? '✓' : '✗'} ${ollamaStatus.available ? 'Ready' : 'Not available'}`);
    results.push(`Cloud: ${cloudStatus.configured ? '✓' : '✗'} ${cloudStatus.configured ? 'Configured' : 'Not configured'}`);
    
    const available = [
        'free',
        ...(ollamaStatus.available ? ['ollama'] : []),
        ...(cloudStatus.configured ? ['cloud'] : [])
    ];
    
    toast.success(`Available modes: ${available.map(getAIModeName).join(', ')}`);
}

function updateModeDisplay(mode) {
    const display = document.getElementById('currentModeDisplay');
    if (display) {
        const icons = {
            'free': '⚡',
            'ollama': '🖥️',
            'cloud': '☁️'
        };
        display.textContent = `${icons[mode] || ''} ${getAIModeName(mode)}`;
    }
}