from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes import upload_bp, quiz_bp, plan_bp, dashboard_bp
from routes.ai_mode import ai_bp
from routes.timetable import timetable_bp
from routes.notes import notes_bp
import os

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

# Enable CORS - Allow frontend on port 5500
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:8000",
            "https://studywisee.netlify.app"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})


# Validate configuration
try:
    Config.validate()
except ValueError as e:
    print(f"Configuration error: {str(e)}")
    print("Please check your .env file")
    exit(1)

# Register blueprints
app.register_blueprint(upload_bp, url_prefix='/api/upload')
app.register_blueprint(quiz_bp, url_prefix='/api/quiz')
app.register_blueprint(plan_bp, url_prefix='/api/plan')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(timetable_bp, url_prefix='/api/timetable')
app.register_blueprint(notes_bp, url_prefix='/api/notes')

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check"""
    return jsonify({
        'status': 'healthy',
        'message': 'StudyWise API is running',
        'version': '1.0.0'
    }), 200

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'name': 'StudyWise API',
        'version': '1.0.0',
        'endpoints': {
            'upload_syllabus': '/api/upload/syllabus',
            'upload_pyq': '/api/upload/pyq',
            'get_uploads': '/api/upload/uploads/<email>',
            'generate_quiz': '/api/quiz/generate',
            'submit_quiz': '/api/quiz/submit',
            'quiz_history': '/api/quiz/history/<email>',
            'generate_plan': '/api/plan/generate',
            'get_plan': '/api/plan/<email>',
            'dashboard_stats': '/api/dashboard/stats/<email>',
            'dashboard_overview': '/api/dashboard/overview/<email>',
            'health': '/api/health',
            'timetable': '/api/timetable',
            'notes': '/api/notes'
        }
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting StudyWise API...")
    print(f"📍 API will be available at: http://127.0.0.1:5000")
    print(f"📍 Health check: http://127.0.0.1:5000/api/health")
    app.run(host='127.0.0.1', port=5000, debug=True)

@app.get("/")
def home():
    return "Study-Wise API is running ✅"

