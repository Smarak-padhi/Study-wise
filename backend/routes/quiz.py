from flask import Blueprint, request, jsonify
from database import db
from services import ai_service

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/generate', methods=['POST'])
def generate_quiz():
    """Generate a quiz for a specific topic"""
    try:
        data = request.get_json()
        
        topic_id = data.get('topic_id')
        user_email = data.get('email', 'demo@studywise.com')
        num_questions = int(data.get('num_questions', 5))
        ai_mode = data.get('ai_mode', 'free')
        
        if not topic_id:
            return jsonify({'error': 'topic_id required'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get topic details
        topics = db.client.table('topics').select('*').eq('id', topic_id).execute()
        if not topics.data:
            return jsonify({'error': 'Topic not found'}), 404
        
        topic = topics.data[0]
        
        # Generate questions using AI with mode support
        questions, mode_used = ai_service.generate_quiz_questions(
            topic['topic_name'],
            topic.get('description', ''),
            num_questions,
            mode=ai_mode
        )
        
        if not questions:
            return jsonify({'error': 'Failed to generate quiz questions'}), 500
        
        # Save quiz
        quiz_title = f"{topic['topic_name']} - Quiz"
        quiz = db.create_quiz(
            user_id=user['id'],
            topic_id=topic_id,
            title=quiz_title,
            questions=questions
        )
        
        if not quiz:
            return jsonify({'error': 'Failed to save quiz'}), 500
        
        return jsonify({
            'success': True,
            'quiz_id': quiz['id'],
            'title': quiz_title,
            'questions': questions,
            'total_questions': len(questions),
            'ai_used': mode_used
        }), 200
        
    except Exception as e:
        print(f"Quiz generation error: {str(e)}")
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500


@quiz_bp.route('/submit', methods=['POST'])
def submit_quiz():
    """Submit quiz answers and get score"""
    try:
        data = request.get_json()
        
        quiz_id = data.get('quiz_id')
        user_email = data.get('email', 'demo@studywise.com')
        answers = data.get('answers', [])  # List of selected answer indices
        
        if not quiz_id:
            return jsonify({'error': 'quiz_id required'}), 400
        
        # Get user
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get quiz
        quizzes = db.client.table('quizzes').select('*').eq('id', quiz_id).execute()
        if not quizzes.data:
            return jsonify({'error': 'Quiz not found'}), 404
        
        quiz = quizzes.data[0]
        questions = quiz['questions']
        
        # Calculate score
        correct = 0
        results = []
        
        for i, question in enumerate(questions):
            user_answer = answers[i] if i < len(answers) else -1
            correct_answer = question['correct']
            is_correct = user_answer == correct_answer
            
            if is_correct:
                correct += 1
            
            results.append({
                'question_number': i + 1,
                'question': question['question'],
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'explanation': question.get('explanation', '')
            })
        
        total = len(questions)
        score_percentage = round((correct / total) * 100, 1) if total > 0 else 0
        
        # Save attempt
        attempt = db.save_quiz_attempt(
            quiz_id=quiz_id,
            user_id=user['id'],
            score=correct,
            total=total,
            answers=answers
        )
        
        return jsonify({
            'success': True,
            'score': correct,
            'total': total,
            'percentage': score_percentage,
            'results': results,
            'attempt_id': attempt['id'] if attempt else None
        }), 200
        
    except Exception as e:
        print(f"Quiz submission error: {str(e)}")
        return jsonify({'error': f'Failed to submit quiz: {str(e)}'}), 500


@quiz_bp.route('/history/<user_email>', methods=['GET'])
def get_quiz_history(user_email):
    """Get quiz history for a user"""
    try:
        user = db.get_user_by_email(user_email)
        if not user:
            return jsonify({'history': []}), 200
        
        # Get all quiz attempts
        attempts = db.client.table('quiz_attempts').select('*, quizzes(title, topic_id)').eq('user_id', user['id']).order('completed_at', desc=True).execute()
        
        history = []
        for attempt in attempts.data:
            history.append({
                'quiz_id': attempt['quiz_id'],
                'quiz_title': attempt['quizzes']['title'] if attempt.get('quizzes') else 'Unknown',
                'score': attempt['score'],
                'total': attempt['total_questions'],
                'percentage': round((attempt['score'] / attempt['total_questions']) * 100, 1),
                'completed_at': attempt['completed_at']
            })
        
        return jsonify({'history': history}), 200
        
    except Exception as e:
        print(f"History fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500
