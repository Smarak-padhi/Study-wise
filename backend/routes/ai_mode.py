from flask import Blueprint, request, jsonify
import os
import requests
from config import Config

ai_bp = Blueprint('ai', __name__)

# Ollama configuration
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'phi3')

# In-memory storage for user AI mode preferences
# In production, this should be in the database
user_ai_modes = {}

@ai_bp.route('/status', methods=['GET'])
def check_ollama_status():
    """Check if Ollama is available and running"""
    try:
        # Try to connect to Ollama
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        
        if response.status_code == 200:
            models = response.json().get('models', [])
            has_phi3 = any(OLLAMA_MODEL in model.get('name', '') for model in models)
            
            return jsonify({
                'available': True,
                'base_url': OLLAMA_BASE_URL,
                'model_recommended': OLLAMA_MODEL,
                'models_installed': [m.get('name') for m in models],
                'has_recommended_model': has_phi3
            }), 200
        else:
            return jsonify({
                'available': False,
                'base_url': OLLAMA_BASE_URL,
                'model_recommended': OLLAMA_MODEL,
                'error': 'Ollama responded with error'
            }), 200
            
    except requests.exceptions.RequestException as e:
        return jsonify({
            'available': False,
            'base_url': OLLAMA_BASE_URL,
            'model_recommended': OLLAMA_MODEL,
            'error': 'Ollama is not running or not accessible'
        }), 200


@ai_bp.route('/cloud-status', methods=['GET'])
def check_cloud_status():
    """Check if OpenAI API key is configured"""
    try:
        configured = bool(Config.OPENAI_API_KEY and Config.OPENAI_API_KEY.startswith('sk-'))
        
        return jsonify({
            'configured': configured,
            'model_default': 'gpt-4o-mini',
            'note': 'OpenAI API key must be set in backend .env file' if not configured else 'OpenAI is configured and ready'
        }), 200
        
    except Exception as e:
        return jsonify({
            'configured': False,
            'model_default': 'gpt-4o-mini',
            'note': str(e)
        }), 200


@ai_bp.route('/mode', methods=['POST'])
def set_ai_mode():
    """Set AI mode for a user"""
    try:
        data = request.get_json()
        mode = data.get('mode', 'free')
        user_id = data.get('user_id', 'default')
        
        # Validate mode
        if mode not in ['free', 'ollama', 'cloud']:
            return jsonify({'error': 'Invalid mode. Must be: free, ollama, or cloud'}), 400
        
        # Check if mode is available
        if mode == 'ollama':
            # Quick check if Ollama is available
            try:
                requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=1)
            except:
                return jsonify({
                    'error': 'Ollama is not available',
                    'fallback': 'free',
                    'saved': False
                }), 400
        
        if mode == 'cloud':
            if not Config.OPENAI_API_KEY or not Config.OPENAI_API_KEY.startswith('sk-'):
                return jsonify({
                    'error': 'Cloud AI is not configured',
                    'fallback': 'free',
                    'saved': False
                }), 400
        
        # Save mode
        user_ai_modes[user_id] = mode
        
        return jsonify({
            'mode': mode,
            'saved': True,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/mode/<user_id>', methods=['GET'])
def get_ai_mode(user_id):
    """Get current AI mode for a user"""
    try:
        mode = user_ai_modes.get(user_id, 'free')
        
        return jsonify({
            'mode': mode,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_active_mode(user_id='default'):
    """
    Get the active AI mode with automatic fallback
    Returns: 'free', 'ollama', or 'cloud'
    """
    preferred_mode = user_ai_modes.get(user_id, 'free')
    
    # If preferred mode is free, return it
    if preferred_mode == 'free':
        return 'free'
    
    # Check if Ollama is available
    if preferred_mode == 'ollama':
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=1)
            if response.status_code == 200:
                return 'ollama'
        except:
            pass
        # Fallback to free
        return 'free'
    
    # Check if Cloud is configured
    if preferred_mode == 'cloud':
        if Config.OPENAI_API_KEY and Config.OPENAI_API_KEY.startswith('sk-'):
            return 'cloud'
        # Fallback to free
        return 'free'
    
    return 'free'
