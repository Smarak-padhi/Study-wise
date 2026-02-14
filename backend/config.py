import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    
    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    # OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 30 * 1024 * 1024  # 30MB
    ALLOWED_EXTENSIONS = {'pdf'}
    
    @staticmethod
    def validate():
        """Validate required environment variables"""
        required = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY']
        missing = [var for var in required if not os.getenv(var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        # Create upload folder if it doesn't exist
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)