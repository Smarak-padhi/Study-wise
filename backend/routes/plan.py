from flask import Blueprint, request, jsonify
from database import db
from datetime import datetime, timedelta

plan_bp = Blueprint('plan', __name__)


from flask import Blueprint, request, jsonify
from database import db
from datetime import datetime, timedelta

plan_bp = Blueprint('plan', __name__)


@plan_bp.route('/generate', methods=['POST'])
def generate_plan():
    """Generate study plan"""
    try:
        data = request.get_json()
        
        email = data.get('email')
        upload_id = data.get('upload_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        hours_per_day = int(data.get('hours_per_day', 2))
        
        print(f"📅 Generate plan: email={email}, upload={upload_id}")
        
        if not all([email, upload_id, start_date, end_date]):
            return jsonify({
                'error': 'email, upload_id, start_date, and end_date required',
                'success': False
            }), 400
        
        # Get user
        user = db.get_user_by_email(email)
        if not user:
            user = db.create_user(email, email.split('@')[0])
        
        if not user:
            return jsonify({'error': 'Failed to create user', 'success': False}), 500
        
        # Get topics
        topics = db.get_topics_by_upload(upload_id)
        
        if not topics or len(topics) == 0:
            return jsonify({
                'error': 'No topics found',
                'success': False
            }), 404
        
        print(f"📚 Found {len(topics)} topics")
        
        # Generate schedule
        schedule = generate_schedule(topics, start_date, end_date, hours_per_day)
        
        print(f"✅ Generated {len(schedule)} days")
        
        # Save to database
        try:
            plan = db.create_study_plan(
                user_id=user['id'],
                upload_id=upload_id,
                schedule=schedule,  # ✅ This is JSONB array
                start_date=start_date,
                end_date=end_date,
                hours_per_day=hours_per_day
            )
        except Exception as e:
            print(f"❌ DB error: {str(e)}")
            return jsonify({
                'error': 'Failed to save plan',
                'details': str(e),
                'success': False
            }), 500
        
        if not plan:
            return jsonify({'error': 'Failed to save plan', 'success': False}), 500
        
        print(f"💾 Plan saved: {plan['id']}")
        
        # ✅ Return schedule immediately
        return jsonify({
            'success': True,
            'plan_id': plan['id'],
            'schedule': schedule,  # ✅ Frontend can render immediately
            'start_date': start_date,
            'end_date': end_date,
            'total_days': len(schedule)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"❌ Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': 'Failed to generate plan',
            'details': str(e),
            'success': False
        }), 500


def generate_schedule(topics, start_date, end_date, hours_per_day):
    """Generate day-by-day schedule"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    total_days = (end - start).days + 1
    
    if total_days <= 0:
        raise ValueError('End date must be after start date')
    
    schedule = []
    topics_per_day = max(1, len(topics) // total_days)
    
    current_date = start
    topic_index = 0
    
    for day in range(total_days):
        if topic_index >= len(topics):
            break
        
        day_topics = []
        for _ in range(min(topics_per_day, len(topics) - topic_index)):
            if topic_index < len(topics):
                topic = topics[topic_index]
                day_topics.append({
                    'id': topic['id'],
                    'name': topic['topic_name'],
                    'description': topic.get('description', ''),
                    'hours': topic.get('estimated_hours', hours_per_day)
                })
                topic_index += 1
        
        if day_topics:
            schedule.append({
                'day': day + 1,
                'date': current_date.strftime('%Y-%m-%d'),
                'topics': day_topics
            })
        
        current_date += timedelta(days=1)
    
    return schedule


@plan_bp.route('/<user_email>', methods=['GET'])
def get_user_plan(user_email):
    """Get latest study plan"""
    try:
        print(f"📅 GET plan for: {user_email}")
        
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found', 'success': False}), 404
        
        plan = db.get_latest_study_plan(user['id'])
        
        if not plan:
            return jsonify({'error': 'No study plan found', 'success': False}), 404
        
        return jsonify({
            'success': True,
            'plan_id': plan['id'],
            'schedule': plan.get('schedule', []),  # ✅ Return schedule
            'start_date': plan.get('start_date'),
            'end_date': plan.get('end_date')
        }), 200
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
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