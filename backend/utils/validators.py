from werkzeug.utils import secure_filename
from config import Config
import os

class Validators:
    """Input validation utilities"""
    
    @staticmethod
    def allowed_file(filename: str) -> bool:
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_date(date_str: str) -> bool:
        """Validate ISO date format"""
        try:
            from datetime import datetime
            datetime.fromisoformat(date_str)
            return True
        except:
            return False
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize uploaded filename"""
        return secure_filename(filename)
    
    @staticmethod
    def validate_file_size(file) -> bool:
        """Check file size (30MB max)"""
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        return size <= 30 * 1024 * 1024  # 30MB

validators = Validators()