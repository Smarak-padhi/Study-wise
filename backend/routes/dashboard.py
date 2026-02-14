from flask import Blueprint, request, jsonify
from database import db
from services import plan_generator

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats/<user_email>', methods=['GET'])
def get_dashboard_stats(user_email):
    """Get comprehensive dashboard statistics"""
    try:
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({
                'stats': {
                    'total_uploads': 0,
                    'total_topics': 0,
                    'total_quizzes': 0,
                    'avg_quiz_score': 0,
                    'study_hours': 0,
                    'progress': {
                        'completed': 0,
                        'in_progress': 0,
                        'not_started': 0,
                        'completion_percentage': 0
                    }
                }
            }), 200
        
        # Get uploads
        uploads = db.get_uploads_by_user(user['id'])
        
        # Get all topics
        all_topics = []
        for upload in uploads:
            topics = db.get_topics_by_upload(upload['id'])
            all_topics.extend(topics)
        
        # Get quiz attempts
        quiz_attempts = db.client.table('quiz_attempts').select('*').eq('user_id', user['id']).execute()
        
        # Calculate average score
        avg_score = 0
        if quiz_attempts.data:
            total_percentage = sum(
                (attempt['score'] / attempt['total_questions']) * 100
                for attempt in quiz_attempts.data
            )
            avg_score = round(total_percentage / len(quiz_attempts.data), 1)
        
        # Get progress
        progress_records = db.get_progress_by_user(user['id'])
        progress_stats = plan_generator.get_progress_stats(progress_records)
        
        stats = {
            'total_uploads': len(uploads),
            'total_topics': len(all_topics),
            'total_quizzes': len(quiz_attempts.data),
            'avg_quiz_score': avg_score,
            'study_hours': progress_stats['total_hours'],
            'progress': {
                'completed': progress_stats['completed'],
                'in_progress': progress_stats['in_progress'],
                'not_started': progress_stats['not_started'],
                'completion_percentage': progress_stats['completion_percentage']
            }
        }
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        print(f"Dashboard stats error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@dashboard_bp.route('/overview/<user_email>', methods=['GET'])
def get_dashboard_overview(user_email):
    """Get detailed dashboard overview"""
    try:
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'overview': {}}), 200
        
        # Recent uploads
        uploads = db.get_uploads_by_user(user['id'])
        recent_uploads = sorted(uploads, key=lambda x: x['uploaded_at'], reverse=True)[:5]
        
        # Recent quiz attempts
        recent_quizzes = db.client.table('quiz_attempts').select('*, quizzes(title)').eq('user_id', user['id']).order('completed_at', desc=True).limit(5).execute()
        
        quiz_history = []
        for attempt in recent_quizzes.data:
            quiz_history.append({
                'title': attempt['quizzes']['title'] if attempt.get('quizzes') else 'Unknown',
                'score': attempt['score'],
                'total': attempt['total_questions'],
                'percentage': round((attempt['score'] / attempt['total_questions']) * 100, 1),
                'date': attempt['completed_at']
            })
        
        # Upcoming topics (based on study plan)
        upcoming_topics = []
        progress_records = db.get_progress_by_user(user['id'])
        
        # Get in-progress and not-started topics
        for progress in progress_records:
            if progress['status'] in ['not_started', 'in_progress']:
                topic_data = progress.get('topics')
                if topic_data:
                    upcoming_topics.append({
                        'name': topic_data.get('topic_name'),
                        'status': progress['status'],
                        'hours_spent': progress['hours_spent'],
                        'estimated_hours': topic_data.get('estimated_hours', 0)
                    })
        
        overview = {
            'recent_uploads': recent_uploads,
            'recent_quizzes': quiz_history,
            'upcoming_topics': upcoming_topics[:5]
        }
        
        return jsonify({'overview': overview}), 200
        
    except Exception as e:
        print(f"Dashboard overview error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@dashboard_bp.route('/topics/<upload_id>', methods=['GET'])
def get_upload_topics(upload_id):
    """Get all topics for an upload with progress"""
    try:
        topics = db.get_topics_by_upload(upload_id)
        
        # Enrich with progress data if user provided
        user_email = request.args.get('email')
        if user_email:
            user = db.get_user_by_email(user_email)
            if user:
                progress_records = db.get_progress_by_user(user['id'])
                progress_map = {p['topic_id']: p for p in progress_records}
                
                for topic in topics:
                    progress = progress_map.get(topic['id'])
                    topic['progress'] = progress if progress else {
                        'status': 'not_started',
                        'hours_spent': 0
                    }
        
        return jsonify({
            'topics': topics,
            'total': len(topics)
        }), 200
        
    except Exception as e:
        print(f"Topics fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500