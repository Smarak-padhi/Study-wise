from flask import Blueprint, request, jsonify
from database import db
from datetime import datetime

timetable_bp = Blueprint('timetable', __name__)

@timetable_bp.route('', methods=['GET'])
def get_timetable():
    """Get timetable for a user"""
    try:
        user_email = request.args.get('email')
        if not user_email:
            return jsonify({'error': 'Email parameter required'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'classes': []}), 200
        
        # Get timetable entries
        response = db.client.table('timetable').select('*').eq('user_id', user['id']).order('day_of_week').order('start_time').execute()
        
        return jsonify({
            'classes': response.data or []
        }), 200
        
    except Exception as e:
        print(f"Timetable fetch error: {str(e)}")
        return jsonify({'classes': []}), 200  # Return empty instead of error


@timetable_bp.route('', methods=['POST'])
def add_timetable_entry():
    """Add a timetable entry"""
    try:
        data = request.get_json()
        
        user_email = data.get('email')
        day_of_week = data.get('day_of_week')  # 0-6 (Monday-Sunday)
        start_time = data.get('start_time')  # HH:MM format
        end_time = data.get('end_time')  # HH:MM format
        title = data.get('title')
        
        if not all([user_email, day_of_week is not None, start_time, end_time, title]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Validate day_of_week
        if not (0 <= int(day_of_week) <= 6):
            return jsonify({'error': 'day_of_week must be 0-6'}), 400
        
        # Insert timetable entry
        response = db.client.table('timetable').insert({
            'user_id': user['id'],
            'day_of_week': int(day_of_week),
            'start_time': start_time,
            'end_time': end_time,
            'title': title
        }).execute()
        
        return jsonify({
            'success': True,
            'entry': response.data[0] if response.data else None
        }), 200
        
    except Exception as e:
        print(f"Timetable add error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/<entry_id>', methods=['DELETE'])
def delete_timetable_entry(entry_id):
    """Delete a timetable entry"""
    try:
        user_email = request.args.get('email')
        if not user_email:
            return jsonify({'error': 'Email parameter required'}), 400
        
        # Get user to verify ownership
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Delete only if belongs to user
        response = db.client.table('timetable').delete().eq('id', entry_id).eq('user_id', user['id']).execute()
        
        return jsonify({
            'success': True,
            'deleted': True
        }), 200
        
    except Exception as e:
        print(f"Timetable delete error: {str(e)}")
        return jsonify({'error': str(e)}), 500