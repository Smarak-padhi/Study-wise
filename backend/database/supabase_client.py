from supabase import create_client, Client
from config import Config

class SupabaseDB:
    """Singleton Supabase client wrapper"""
    
    _instance = None
    _client: Client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            try:
                cls._client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
                # Test connection
                cls._client.table('users').select('id').limit(1).execute()
            except Exception as e:
                print(f"CRITICAL: Failed to connect to Supabase: {str(e)}")
                print("Please check SUPABASE_URL and SUPABASE_KEY in .env file")
                raise ConnectionError(f"Supabase connection failed: {str(e)}")
        return cls._instance
    
    @property
    def client(self) -> Client:
        """Get Supabase client instance"""
        return self._client
    
    # User operations
    def create_user(self, email, name=None):
        """Create a new user"""
        try:
            response = self._client.table('users').insert({
                'email': email,
                'name': name
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating user: {str(e)}")
            return None
    
    def get_user_by_email(self, email):
        """Get user by email"""
        try:
            response = self._client.table('users').select('*').eq('email', email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching user: {str(e)}")
            return None
    
    # Upload operations
    def create_upload(self, user_id, filename, subject, extracted_text):
        """Create upload record"""
        try:
            response = self._client.table('uploads').insert({
                'user_id': user_id,
                'filename': filename,
                'subject': subject,
                'extracted_text': extracted_text
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating upload: {str(e)}")
            return None
    
    def get_uploads_by_user(self, user_id):
        """Get all uploads for a user"""
        try:
            response = self._client.table('uploads').select('*').eq('user_id', user_id).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching uploads: {str(e)}")
            return []
    
    # Topic operations
    def create_topics_bulk(self, topics_data):
        """Create multiple topics at once"""
        try:
            response = self._client.table('topics').insert(topics_data).execute()
            return response.data
        except Exception as e:
            print(f"Error creating topics: {str(e)}")
            return []
    
    def get_topics_by_upload(self, upload_id):
        """Get topics for an upload"""
        try:
            response = self._client.table('topics').select('*').eq('upload_id', upload_id).order('sequence_order').execute()
            return response.data
        except Exception as e:
            print(f"Error fetching topics: {str(e)}")
            return []
    
    # PYQ operations
    def create_pyqs_bulk(self, pyqs_data):
        """Create multiple PYQs"""
        try:
            response = self._client.table('pyqs').insert(pyqs_data).execute()
            return response.data
        except Exception as e:
            print(f"Error creating PYQs: {str(e)}")
            return []
    
    def get_pyqs_by_topic(self, topic_id):
        """Get PYQs for a topic"""
        try:
            response = self._client.table('pyqs').select('*').eq('topic_id', topic_id).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching PYQs: {str(e)}")
            return []
    
    # Quiz operations
    def create_quiz(self, user_id, topic_id, title, questions):
        """Create a quiz"""
        try:
            response = self._client.table('quizzes').insert({
                'user_id': user_id,
                'topic_id': topic_id,
                'title': title,
                'questions': questions,
                'total_questions': len(questions)
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating quiz: {str(e)}")
            return None
    
    def save_quiz_attempt(self, quiz_id, user_id, score, total, answers):
        """Save quiz attempt"""
        try:
            response = self._client.table('quiz_attempts').insert({
                'quiz_id': quiz_id,
                'user_id': user_id,
                'score': score,
                'total_questions': total,
                'answers': answers
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error saving quiz attempt: {str(e)}")
            return None
    
    # Study plan operations
    def create_study_plan(self, user_id, upload_id, schedule, start_date, end_date, hours_per_day=2):
        """
        Create a new study plan with proper error handling
        """
        try:
            # Prepare data (let DB generate UUID and timestamp)
            plan_data = {
                'user_id': user_id,
                'upload_id': upload_id,
                'schedule': schedule,
                'start_date': start_date,
                'end_date': end_date,
                'hours_per_day': hours_per_day
            }
            
            print(f"📝 Inserting study plan for user: {user_id}")
            
            # Execute insert
            response = self.client.table('study_plans').insert(plan_data).execute()
            
            # ✅ CRITICAL: Check for errors FIRST
            if hasattr(response, 'error') and response.error:
                error_msg = str(response.error)
                print(f"❌ Supabase error: {error_msg}")
                raise Exception(f"Database insert failed: {error_msg}")
            
            # Check for data
            if response.data and len(response.data) > 0:
                plan = response.data[0]
                print(f"✅ Plan created: {plan['id']}")
                return plan
            
            print(f"⚠️ No data returned from insert")
            return None
            
        except Exception as e:
            print(f"❌ Error in create_study_plan: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise


    def get_latest_study_plan(self, user_id):
        """
        Get most recent study plan with error handling
        """
        try:
            print(f"🔍 Fetching plan for user: {user_id}")
            
            response = self.client.table('study_plans')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if hasattr(response, 'error') and response.error:
                error_msg = str(response.error)
                print(f"❌ Supabase error: {error_msg}")
                raise Exception(f"Database query failed: {error_msg}")
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            
            return None
            
        except Exception as e:
            print(f"❌ Error in get_latest_study_plan: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise
        
    def get_study_plan_by_upload(self, upload_id):
        """Get study plan for an upload"""
        try:
            response = self._client.table('study_plans').select('*').eq('upload_id', upload_id).order('created_at', desc=True).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching study plan: {str(e)}")
            return None
    
    # Progress operations
    def update_progress(self, user_id, topic_id, status, hours_spent=0, notes=None):
        """Update or create progress for a topic"""
        try:
            # Check if progress exists
            existing = self._client.table('progress').select('*').eq('user_id', user_id).eq('topic_id', topic_id).execute()
            
            data = {
                'status': status,
                'hours_spent': hours_spent,
                'notes': notes
            }
            
            if existing.data:
                # Update existing
                response = self._client.table('progress').update(data).eq('id', existing.data[0]['id']).execute()
            else:
                # Create new
                data['user_id'] = user_id
                data['topic_id'] = topic_id
                response = self._client.table('progress').insert(data).execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating progress: {str(e)}")
            return None
    
    def get_progress_by_user(self, user_id):
        """Get all progress for a user"""
        try:
            response = self._client.table('progress').select('*, topics(*)').eq('user_id', user_id).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching progress: {str(e)}")
            return []
   

# Global instance
db = SupabaseDB()