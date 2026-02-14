from flask import Blueprint, request, jsonify
from database import db
from services import plan_generator
from datetime import datetime

plan_bp = Blueprint('plan', __name__)

@plan_bp.route('/generate', methods=['POST'])
def generate_plan():
    """Generate study plan for an upload"""
    try:
        data = request.get_json()
        
        upload_id = data.get('upload_id')
        user_email = data.get('email', 'demo@studywise.com')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        daily_hours = float(data.get('daily_hours', 3))
        
        if not all([upload_id, start_date, end_date]):
            return jsonify({'error': 'upload_id, start_date, and end_date required'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get topics for this upload
        topics = db.get_topics_by_upload(upload_id)
        if not topics:
            return jsonify({'error': 'No topics found for this upload'}), 404
        
        # Generate plan
        plan_data = plan_generator.generate_study_plan(
            topics=topics,
            start_date=start_date,
            end_date=end_date,
            daily_hours=daily_hours
        )
        
        if not plan_data:
            return jsonify({'error': 'Failed to generate study plan'}), 500
        
        # Save plan
        saved_plan = db.create_study_plan(
            user_id=user['id'],
            upload_id=upload_id,
            start_date=start_date,
            end_date=end_date,
            plan_data=plan_data
        )
        
        if not saved_plan:
            return jsonify({'error': 'Failed to save study plan'}), 500
        
        # Initialize progress for all topics
        for topic in topics:
            db.update_progress(
                user_id=user['id'],
                topic_id=topic['id'],
                status='not_started',
                hours_spent=0
            )
        
        return jsonify({
            'success': True,
            'plan_id': saved_plan['id'],
            'plan': plan_data,
            'message': 'Study plan generated successfully'
        }), 200
        
    except Exception as e:
        print(f"Plan generation error: {str(e)}")
        return jsonify({'error': f'Failed to generate plan: {str(e)}'}), 500


@plan_bp.route('/<upload_id>', methods=['GET'])
def get_plan(upload_id):
    """Get study plan for an upload"""
    try:
        plan = db.get_study_plan_by_upload(upload_id)
        
        if not plan:
            return jsonify({'error': 'No study plan found'}), 404
        
        return jsonify({
            'success': True,
            'plan': plan
        }), 200
        
    except Exception as e:
        print(f"Plan fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@plan_bp.route('/progress/update', methods=['POST'])
def update_progress():
    """Update progress for a topic"""
    try:
        data = request.get_json()
        
        user_email = data.get('email', 'demo@studywise.com')
        topic_id = data.get('topic_id')
        status = data.get('status')
        hours_spent = float(data.get('hours_spent', 0))
        notes = data.get('notes')
        
        if not all([topic_id, status]):
            return jsonify({'error': 'topic_id and status required'}), 400
        
        if status not in ['not_started', 'in_progress', 'completed']:
            return jsonify({'error': 'Invalid status'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update progress
        progress = db.update_progress(
            user_id=user['id'],
            topic_id=topic_id,
            status=status,
            hours_spent=hours_spent,
            notes=notes
        )
        
        if not progress:
            return jsonify({'error': 'Failed to update progress'}), 500
        
        return jsonify({
            'success': True,
            'progress': progress,
            'message': 'Progress updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Progress update error: {str(e)}")
        return jsonify({'error': f'Failed to update progress: {str(e)}'}), 500


@plan_bp.route('/progress/<user_email>', methods=['GET'])
def get_user_progress(user_email):
    """Get all progress for a user"""
    try:
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'progress': []}), 200
        
        progress_records = db.get_progress_by_user(user['id'])
        
        # Calculate stats
        stats = plan_generator.get_progress_stats(progress_records)
        
        return jsonify({
            'progress': progress_records,
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Progress fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500