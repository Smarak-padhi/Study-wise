from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
import os
import sys

# Startup logging
print("=" * 60)
print("🚀 Starting StudyWise Backend...")
print(f"Python: {sys.version}")
print(f"Port: {os.getenv('PORT', '5000')}")
print("=" * 60)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

# ✅ CORS Configuration (only once!)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "https://studywisee.netlify.app",
            "https://*.netlify.app"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False,
        "max_age": 3600
    }
})

print("✅ CORS configured")

# Validate configuration
try:
    Config.validate()
    print("✅ Config validated")
except ValueError as e:
    print(f"❌ Config error: {str(e)}")
    exit(1)

# Import blueprints with error handling
blueprints_loaded = []

try:
    from routes.upload import upload_bp
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    blueprints_loaded.append('upload')
    print("✅ Upload routes registered")
except Exception as e:
    print(f"⚠️ Upload routes failed: {e}")

try:
    from routes.quiz import quiz_bp
    app.register_blueprint(quiz_bp, url_prefix='/api/quiz')
    blueprints_loaded.append('quiz')
    print("✅ Quiz routes registered")
except Exception as e:
    print(f"⚠️ Quiz routes failed: {e}")

try:
    from routes.plan import plan_bp
    app.register_blueprint(plan_bp, url_prefix='/api/plan')
    blueprints_loaded.append('plan')
    print("✅ Plan routes registered")
except Exception as e:
    print(f"⚠️ Plan routes failed: {e}")

try:
    from routes.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    blueprints_loaded.append('dashboard')
    print("✅ Dashboard routes registered")
except Exception as e:
    print(f"⚠️ Dashboard routes skipped: {e}")

try:
    from routes.ai_mode import ai_bp
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    blueprints_loaded.append('ai')
    print("✅ AI routes registered")
except Exception as e:
    print(f"⚠️ AI routes skipped: {e}")

try:
    from routes.timetable import timetable_bp
    app.register_blueprint(timetable_bp, url_prefix='/api/timetable')
    blueprints_loaded.append('timetable')
    print("✅ Timetable routes registered")
except Exception as e:
    print(f"⚠️ Timetable routes skipped: {e}")

try:
    from routes.notes import notes_bp
    app.register_blueprint(notes_bp, url_prefix='/api/notes')
    blueprints_loaded.append('notes')
    print("✅ Notes routes registered")
except Exception as e:
    print(f"⚠️ Notes routes skipped: {e}")

print(f"📦 Loaded blueprints: {', '.join(blueprints_loaded)}")

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check"""
    return jsonify({
        'status': 'healthy',
        'message': 'StudyWise API is running',
        'version': '1.0.0',
        'blueprints': blueprints_loaded
    }), 200

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Root endpoint - API info"""
    return jsonify({
        'name': 'StudyWise API',
        'status': 'running',
        'version': '1.0.0',
        'health': '/api/health',
        'blueprints': blueprints_loaded
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Start server
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print("=" * 60)
    print(f"🌐 Server starting on port {port}")
    print(f"📍 Health: http://0.0.0.0:{port}/api/health")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False)