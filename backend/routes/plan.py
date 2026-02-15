from flask import Blueprint, request, jsonify
from database import db
from datetime import datetime, timedelta

plan_bp = Blueprint('plan', __name__)


@plan_bp.route('/generate', methods=['POST'])
def generate_plan():
    """
    Generate a study plan for a user
    Expects: { email, upload_id, start_date, end_date, hours_per_day }
    Returns: { success, plan_id, schedule, start_date, end_date, total_days }
    """
    try:
        data = request.get_json()
        
        # Extract and validate parameters
        email = data.get('email')
        upload_id = data.get('upload_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        hours_per_day = int(data.get('hours_per_day', 2))
        
        print(f"📅 Generate plan request:")
        print(f"   email: {email}")
        print(f"   upload_id: {upload_id}")
        print(f"   dates: {start_date} to {end_date}")
        print(f"   hours/day: {hours_per_day}")
        
        # Validate required fields
        if not all([email, upload_id, start_date, end_date]):
            return jsonify({
                'error': 'email, upload_id, start_date, and end_date required',
                'success': False
            }), 400
        
        # Get or create user
        user = db.get_user_by_email(email)
        if not user:
            print(f"📝 Creating new user: {email}")
            user = db.create_user(email, email.split('@')[0])
        
        if not user:
            return jsonify({
                'error': 'Failed to get or create user',
                'success': False
            }), 500
        
        print(f"👤 User ID: {user['id']}")
        
        # Get topics for this upload
        topics = db.get_topics_by_upload(upload_id)
        
        if not topics or len(topics) == 0:
            return jsonify({
                'error': 'No topics found for this upload',
                'message': 'Please upload a syllabus with topics first',
                'success': False
            }), 404
        
        print(f"📚 Found {len(topics)} topics to schedule")
        
        # Generate schedule
        try:
            schedule = generate_schedule(
                topics=topics,
                start_date=start_date,
                end_date=end_date,
                hours_per_day=hours_per_day
            )
        except ValueError as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 400
        
        print(f"✅ Generated schedule with {len(schedule)} days")
        
        # Save plan to database
        try:
            plan = db.create_study_plan(
                user_id=user['id'],
                upload_id=upload_id,
                schedule=schedule,
                start_date=start_date,
                end_date=end_date,
                hours_per_day=hours_per_day
            )
        except Exception as e:
            print(f"❌ Database save error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': 'Failed to save study plan to database',
                'details': str(e),
                'success': False
            }), 500
        
        if not plan:
            return jsonify({
                'error': 'Failed to save study plan',
                'success': False
            }), 500
        
        print(f"💾 Plan saved successfully with ID: {plan['id']}")
        
        # Return success with full schedule
        return jsonify({
            'success': True,
            'plan_id': plan['id'],
            'schedule': schedule,
            'start_date': start_date,
            'end_date': end_date,
            'total_days': len(schedule),
            'message': f'Study plan created with {len(schedule)} days'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"❌ Unexpected error in generate_plan: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': 'Failed to generate plan',
            'details': str(e),
            'success': False
        }), 500


def generate_schedule(topics, start_date, end_date, hours_per_day):
    """
    Generate day-by-day study schedule
    
    Args:
        topics: List of topic dicts with id, topic_name, description, estimated_hours
        start_date: Start date string (YYYY-MM-DD)
        end_date: End date string (YYYY-MM-DD)
        hours_per_day: Hours to study per day
    
    Returns:
        List of day dicts with day number, date, and topics list
    """
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError as e:
        raise ValueError(f'Invalid date format. Use YYYY-MM-DD: {str(e)}')
    
    total_days = (end - start).days + 1
    
    if total_days <= 0:
        raise ValueError('End date must be after start date')
    
    if total_days > 365:
        raise ValueError('Study plan cannot exceed 365 days')
    
    # Distribute topics across available days
    schedule = []
    topics_per_day = max(1, len(topics) // total_days)
    
    current_date = start
    topic_index = 0
    
    for day_num in range(total_days):
        if topic_index >= len(topics):
            break
        
        day_topics = []
        topics_for_today = min(topics_per_day, len(topics) - topic_index)
        
        # Add topics for this day
        for _ in range(topics_for_today):
            if topic_index < len(topics):
                topic = topics[topic_index]
                day_topics.append({
                    'id': topic.get('id'),
                    'name': topic.get('topic_name', 'Untitled Topic'),
                    'description': topic.get('description', ''),
                    'hours': topic.get('estimated_hours', hours_per_day)
                })
                topic_index += 1
        
        # Only add day if it has topics
        if day_topics:
            schedule.append({
                'day': day_num + 1,
                'date': current_date.strftime('%Y-%m-%d'),
                'topics': day_topics,
                'total_hours': sum(t.get('hours', 0) for t in day_topics)
            })
        
        current_date += timedelta(days=1)
    
    return schedule


@plan_bp.route('/<user_email>', methods=['GET'])
def get_user_plan(user_email):
    """
    Get the latest study plan for a user by email
    
    Args:
        user_email: User's email address
    
    Returns:
        { success, plan_id, schedule, start_date, end_date }
        or { error, message } with 404 if not found
    """
    try:
        print(f"📅 Fetching study plan for: {user_email}")
        
        # Get user by email
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({
                'error': 'User not found',
                'message': f'No user found with email: {user_email}',
                'success': False
            }), 404
        
        print(f"👤 Found user ID: {user['id']}")
        
        # Get latest plan
        try:
            plan = db.get_latest_study_plan(user['id'])
        except Exception as e:
            print(f"❌ Database query error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': 'Failed to fetch plan from database',
                'details': str(e),
                'success': False
            }), 500
        
        if not plan:
            print(f"ℹ️ No study plan found for user: {user_email}")
            return jsonify({
                'error': 'No study plan found',
                'message': 'Generate a study plan to get started',
                'success': False
            }), 404
        
        print(f"✅ Found study plan: {plan['id']}")
        
        return jsonify({
            'success': True,
            'plan_id': plan['id'],
            'schedule': plan.get('schedule', []),
            'start_date': plan.get('start_date'),
            'end_date': plan.get('end_date'),
            'hours_per_day': plan.get('hours_per_day', 2),
            'created_at': plan.get('created_at')
        }), 200
        
    except Exception as e:
        print(f"❌ Unexpected error in get_user_plan: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'error': 'Server error',
            'details': str(e),
            'success': False
        }), 500


@plan_bp.route('/all/<user_email>', methods=['GET'])
def get_all_user_plans(user_email):
    """
    Get all study plans for a user (optional endpoint for history)
    
    Args:
        user_email: User's email address
    
    Returns:
        { success, plans: [...] }
    """
    try:
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({
                'error': 'User not found',
                'success': False
            }), 404
        
        plans = db.get_all_study_plans(user['id'])
        
        return jsonify({
            'success': True,
            'plans': plans,
            'count': len(plans)
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching all plans: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch plans',
            'details': str(e),
            'success': False
        }), 500