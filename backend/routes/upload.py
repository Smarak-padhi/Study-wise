from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
from database import db
from services import pdf_processor, ai_service
from utils import validators
from config import Config

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/syllabus', methods=['GET'])
def upload_syllabus_get():
    """Reject GET requests with clear message"""
    return jsonify({
        'error': 'Method not allowed. Use POST with multipart/form-data.',
        'required_fields': ['file', 'email', 'subject']
    }), 405

@upload_bp.route('/syllabus', methods=['POST'])
def upload_syllabus():
    """Upload and process syllabus PDF"""
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided. Include PDF file in request.'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected. Please choose a PDF file.'}), 400
        
        if not validators.allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files allowed. File must end with .pdf'}), 400
        
        if not validators.validate_file_size(file):
            return jsonify({'error': 'File too large (max 30MB). Please use a smaller PDF.'}), 400
        
        # Validate required fields
        user_email = request.form.get('email')
        subject = request.form.get('subject')
        
        if not user_email:
            return jsonify({'error': 'Email is required. Include email in form data.'}), 400
        
        if not subject:
            return jsonify({'error': 'Subject is required. Include subject in form data.'}), 400
        
        ai_mode = request.form.get('ai_mode', 'free')
        
        # Create or get user
        user = db.get_user_by_email(user_email)
        if not user:
            user = db.create_user(user_email, request.form.get('name'))
        
        if not user:
            return jsonify({'error': 'Failed to create user'}), 500
        
        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Extract text
        try:
            extracted_text = pdf_processor.extract_text(filepath)
            cleaned_text = pdf_processor.clean_text(extracted_text)
            
            # Safety check: ensure we extracted meaningful text
            if not cleaned_text or len(cleaned_text.strip()) < 50:
                os.remove(filepath)
                return jsonify({
                    'error': 'PDF appears to be empty or contains very little text',
                    'warning': 'Please ensure the PDF is text-based (not scanned images)'
                }), 400
                
        except Exception as e:
            os.remove(filepath)
            return jsonify({'error': f'Failed to process PDF: {str(e)}'}), 500
        
        # Create upload record
        upload_record = db.create_upload(
            user_id=user['id'],
            filename=filename,
            subject=subject,
            extracted_text=cleaned_text
        )
        
        if not upload_record:
            os.remove(filepath)
            return jsonify({'error': 'Failed to save upload'}), 500
        
        # Extract topics using AI with mode support
        ai_topics, mode_used = ai_service.extract_topics_with_ai(cleaned_text, mode=ai_mode)
        
        # Fallback to rule-based if AI fails
        if not ai_topics:
            simple_topics = pdf_processor.extract_topics_simple(cleaned_text)
            ai_topics = [
                {
                    'name': topic,
                    'description': '',
                    'difficulty': 'medium',
                    'hours': 5
                }
                for topic in simple_topics
            ]
            mode_used = 'free'
        
        # Save topics to database
        topics_data = [
            {
                'upload_id': upload_record['id'],
                'topic_name': topic['name'],
                'description': topic['description'],
                'difficulty_level': topic['difficulty'],
                'estimated_hours': topic['hours'],
                'sequence_order': i
            }
            for i, topic in enumerate(ai_topics)
        ]
        
        created_topics = db.create_topics_bulk(topics_data)
        
        # Cleanup
        os.remove(filepath)
        
        # Prepare response
        response_data = {
            'success': True,
            'upload_id': upload_record['id'],
            'subject': subject,
            'topics_count': len(created_topics),
            'topics': created_topics,
            'ai_used': mode_used,
            'message': f'Syllabus processed successfully using {mode_used} mode'
        }
        
        # Add warning if very few topics extracted
        if len(created_topics) == 0:
            response_data['warning'] = 'No topics extracted. The PDF may not contain a clear syllabus structure.'
        elif len(created_topics) < 3:
            response_data['warning'] = f'Only {len(created_topics)} topic(s) extracted. Consider checking the PDF format.'
        
        return jsonify(response_data), 200
        
    except Exception as e:
        # Log full error for debugging
        import traceback
        print(f"❌ Upload error: {str(e)}")
        print(traceback.format_exc())
        
        # Return safe error message to user
        return jsonify({
            'error': 'Upload failed due to server error. Please try again.',
            'details': str(e)[:200]  # First 200 chars only
        }), 500


@upload_bp.route('/pyq', methods=['POST'])
def upload_pyq():
    """Upload and process PYQ PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not validators.allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files allowed'}), 400
        
        upload_id = request.form.get('upload_id')
        if not upload_id:
            return jsonify({'error': 'upload_id required'}), 400
        
        # Save and process file
        filename = secure_filename(file.filename)
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            text = pdf_processor.extract_text(filepath)
            questions = pdf_processor.extract_questions_simple(text)
        except Exception as e:
            os.remove(filepath)
            return jsonify({'error': f'Failed to extract questions: {str(e)}'}), 500
        
        # Get topics for this upload
        topics = db.get_topics_by_upload(upload_id)
        
        # Save PYQs
        pyqs_data = [
            {
                'upload_id': upload_id,
                'question': q['question'],
                'answer': q['answer'],
                'topic_id': topics[0]['id'] if topics else None,
                'difficulty': 'medium'
            }
            for q in questions
        ]
        
        created_pyqs = db.create_pyqs_bulk(pyqs_data)
        
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'pyqs_count': len(created_pyqs),
            'message': f'Extracted {len(created_pyqs)} questions'
        }), 200
        
    except Exception as e:
        print(f"PYQ upload error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@upload_bp.route('/uploads/<user_email>', methods=['GET'])
def get_user_uploads(user_email):
    """Get all uploads for a user"""
    try:
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'uploads': []}), 200
        
        uploads = db.get_uploads_by_user(user['id'])
        
        # Enrich with topic counts
        for upload in uploads:
            topics = db.get_topics_by_upload(upload['id'])
            upload['topics_count'] = len(topics)
        
        return jsonify({'uploads': uploads}), 200
        
    except Exception as e:
        print(f"Fetch uploads error: {str(e)}")
        return jsonify({'error': str(e)}), 500