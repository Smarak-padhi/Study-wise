from flask import Blueprint, request, jsonify
from database import db

notes_bp = Blueprint('notes', __name__)

@notes_bp.route('/<user_email>', methods=['GET'])
def get_notes(user_email):
    """Get all notes for a user"""
    try:
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'notes': []}), 200
        
        # Get notes
        response = db.client.table('notes').select('*').eq('user_id', user['id']).order('updated_at', desc=True).execute()
        
        return jsonify({
            'notes': response.data or []
        }), 200
        
    except Exception as e:
        print(f"Notes fetch error: {str(e)}")
        return jsonify({'notes': []}), 200  # Return empty instead of error


@notes_bp.route('', methods=['POST'])
def save_note():
    """Save or update a note"""
    try:
        data = request.get_json()
        
        user_email = data.get('email')
        subject = data.get('subject', 'General')
        content = data.get('content', '')
        note_id = data.get('note_id')  # Optional, for updates
        
        if not user_email:
            return jsonify({'error': 'Email required'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if note_id:
            # Update existing note
            response = db.client.table('notes').update({
                'subject': subject,
                'content': content,
                'updated_at': 'now()'
            }).eq('id', note_id).eq('user_id', user['id']).execute()
        else:
            # Create new note
            response = db.client.table('notes').insert({
                'user_id': user['id'],
                'subject': subject,
                'content': content
            }).execute()
        
        return jsonify({
            'success': True,
            'note': response.data[0] if response.data else None
        }), 200
        
    except Exception as e:
        print(f"Note save error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    try:
        response = db.client.table('notes').delete().eq('id', note_id).execute()
        
        return jsonify({
            'success': True,
            'deleted': True
        }), 200
        
    except Exception as e:
        print(f"Note delete error: {str(e)}")
        return jsonify({'error': str(e)}), 500