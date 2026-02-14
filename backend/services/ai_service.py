from openai import OpenAI
from config import Config
from typing import List, Dict
import json

class AIService:
    """Multi-mode AI integration: Free (rule-based), Ollama (local), Cloud (OpenAI)"""
    
    def __init__(self):
        try:
            self.client = OpenAI(api_key=Config.OPENAI_API_KEY) if Config.OPENAI_API_KEY else None
        except:
            self.client = None
    
    def extract_topics_with_ai(self, syllabus_text: str, max_topics: int = 15, mode: str = 'cloud') -> tuple[List[Dict], str]:
        """
        Use AI to extract structured topics from syllabus
        Returns: (topics_list, ai_mode_used)
        
        Modes:
        - 'cloud': Use OpenAI GPT (if configured)
        - 'ollama': Use local Ollama (if available)
        - 'free': Use rule-based (fallback)
        """
        # Cloud mode (OpenAI)
        if mode == 'cloud' and self.client:
            try:
                return self._extract_with_openai(syllabus_text, max_topics), 'cloud'
            except Exception as e:
                print(f"OpenAI failed: {str(e)}, falling back...")
        
        # Ollama mode
        if mode == 'ollama':
            try:
                from services.ollama_service import ollama_service
                if ollama_service.is_available():
                    topics = ollama_service.extract_topics_with_ollama(syllabus_text, max_topics)
                    if topics:
                        return topics, 'ollama'
                print("Ollama not available, falling back...")
            except Exception as e:
                print(f"Ollama failed: {str(e)}, falling back...")
        
        # Free mode (rule-based) - always works as fallback
        return self._extract_rule_based(syllabus_text, max_topics), 'free'
    
    def _extract_with_openai(self, syllabus_text: str, max_topics: int) -> List[Dict]:
        """Extract topics using OpenAI"""
        prompt = f"""
Extract academic topics from this syllabus. For each topic, provide:
1. Topic name (concise)
2. Brief description (1-2 sentences)  
3. Difficulty level (easy/medium/hard)
4. Estimated study hours (realistic number)

Return ONLY a valid JSON array of objects with keys: name, description, difficulty, hours

Syllabus text:
{syllabus_text[:3000]}

Return JSON array only, no other text.
"""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an academic curriculum analyzer. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        topics = json.loads(content)
        
        # Validate and clean
        validated = []
        for i, topic in enumerate(topics[:max_topics]):
            validated.append({
                'name': topic.get('name', f'Topic {i+1}'),
                'description': topic.get('description', ''),
                'difficulty': topic.get('difficulty', 'medium').lower(),
                'hours': float(topic.get('hours', 5))
            })
        
        return validated
    
    def _extract_rule_based(self, syllabus_text: str, max_topics: int) -> List[Dict]:
        """Extract topics using simple rules (free mode)"""
        from services.pdf_processor import pdf_processor
        
        # Use existing rule-based extraction
        topic_names = pdf_processor.extract_topics_simple(syllabus_text)
        
        # Convert to structured format
        topics = []
        for i, name in enumerate(topic_names[:max_topics]):
            # Simple difficulty heuristic
            difficulty = 'easy'
            if any(word in name.lower() for word in ['advanced', 'complex', 'deep']):
                difficulty = 'hard'
            elif any(word in name.lower() for word in ['intermediate', 'application']):
                difficulty = 'medium'
            
            topics.append({
                'name': name,
                'description': '',
                'difficulty': difficulty,
                'hours': 5
            })
        
        return topics
    
    def generate_quiz_questions(self, topic_name: str, topic_description: str, num_questions: int = 5, mode: str = 'cloud') -> tuple[List[Dict], str]:
        """
        Generate quiz questions for a topic
        Returns: (questions_list, ai_mode_used)
        
        Modes: 'cloud', 'ollama', 'free'
        """
        # Cloud mode (OpenAI)
        if mode == 'cloud' and self.client:
            try:
                return self._generate_with_openai(topic_name, topic_description, num_questions), 'cloud'
            except Exception as e:
                print(f"OpenAI quiz generation failed: {str(e)}, falling back...")
        
        # Ollama mode
        if mode == 'ollama':
            try:
                from services.ollama_service import ollama_service
                if ollama_service.is_available():
                    questions = ollama_service.generate_quiz_questions(topic_name, topic_description, num_questions)
                    if questions:
                        return questions, 'ollama'
                print("Ollama not available, falling back...")
            except Exception as e:
                print(f"Ollama quiz generation failed: {str(e)}, falling back...")
        
        # Free mode (rule-based) - simple fallback
        return self._generate_rule_based(topic_name, num_questions), 'free'
    
    def _generate_with_openai(self, topic_name: str, topic_description: str, num_questions: int) -> List[Dict]:
        """Generate quiz using OpenAI"""
        prompt = f"""
Generate {num_questions} multiple-choice quiz questions for this topic:

Topic: {topic_name}
Description: {topic_description}

For each question, provide:
- question (clear and specific)
- options (array of 4 choices)
- correct (index 0-3 of correct answer)
- explanation (why the answer is correct)

Return ONLY valid JSON array. Example format:
[{{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}}]
"""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a quiz generator. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content.strip()
        questions = json.loads(content)
        
        # Validate structure
        validated = []
        for q in questions:
            if all(k in q for k in ['question', 'options', 'correct']):
                validated.append({
                    'question': q['question'],
                    'options': q['options'][:4],
                    'correct': int(q['correct']),
                    'explanation': q.get('explanation', '')
                })
        
        return validated[:num_questions]
    
    def _generate_rule_based(self, topic_name: str, num_questions: int) -> List[Dict]:
        """Generate simple rule-based quiz questions (free mode)"""
        # Very basic quiz generation - better than nothing
        questions = []
        
        # Template-based questions
        templates = [
            {
                'question': f'What is the main concept of {topic_name}?',
                'options': [
                    f'{topic_name} basics',
                    f'Advanced {topic_name} theory',
                    f'{topic_name} applications',
                    f'{topic_name} history'
                ],
                'correct': 0,
                'explanation': f'The main concept involves understanding the basics of {topic_name}.'
            },
            {
                'question': f'Which of the following is related to {topic_name}?',
                'options': [
                    f'{topic_name} principles',
                    'Unrelated concept',
                    'Different topic',
                    'Alternative subject'
                ],
                'correct': 0,
                'explanation': f'{topic_name} principles are directly related to this topic.'
            },
            {
                'question': f'What is an application of {topic_name}?',
                'options': [
                    f'Practical use of {topic_name}',
                    'Theoretical concept only',
                    'Historical reference',
                    'Unrelated field'
                ],
                'correct': 0,
                'explanation': f'{topic_name} has practical applications in various fields.'
            }
        ]
        
        for i in range(min(num_questions, len(templates))):
            questions.append(templates[i])
        
        return questions
    
    def summarize_topic(self, topic_text: str) -> str:
        """Generate a concise summary of a topic"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Summarize the topic in 2-3 sentences."},
                    {"role": "user", "content": topic_text}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Summarization failed: {str(e)}")
            return ""

# Global instance
ai_service = AIService()
