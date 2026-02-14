import requests
import json
import os
from typing import List, Dict

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'phi3')

class OllamaService:
    """Ollama integration for local AI"""
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
    
    def is_available(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def generate(self, prompt: str, system_prompt: str = "", temperature: float = 0.7) -> str:
        """Generate text using Ollama"""
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json().get('response', '')
            else:
                raise Exception(f"Ollama error: {response.status_code}")
                
        except Exception as e:
            raise Exception(f"Ollama generation failed: {str(e)}")
    
    def extract_topics_with_ollama(self, syllabus_text: str, max_topics: int = 15) -> List[Dict]:
        """Extract topics using Ollama"""
        try:
            prompt = f"""Extract academic topics from this syllabus. For each topic, provide:
1. Topic name (concise)
2. Brief description (1-2 sentences)
3. Difficulty level (easy/medium/hard)
4. Estimated study hours (realistic number)

Return ONLY a valid JSON array of objects with keys: name, description, difficulty, hours

Syllabus text:
{syllabus_text[:3000]}

Return JSON array only, no other text."""
            
            system_prompt = "You are an academic curriculum analyzer. Return only valid JSON arrays."
            
            response = self.generate(prompt, system_prompt, temperature=0.3)
            
            # Try to extract JSON from response
            # Sometimes Ollama includes extra text
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                topics = json.loads(json_str)
            else:
                topics = json.loads(response)
            
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
            
        except json.JSONDecodeError:
            print("Failed to parse Ollama response as JSON")
            return []
        except Exception as e:
            print(f"Ollama topic extraction failed: {str(e)}")
            return []
    
    def generate_quiz_questions(self, topic_name: str, topic_description: str, num_questions: int = 5) -> List[Dict]:
        """Generate quiz questions using Ollama"""
        try:
            prompt = f"""Generate {num_questions} multiple-choice quiz questions for this topic:

Topic: {topic_name}
Description: {topic_description}

For each question, provide:
- question (clear and specific)
- options (array of 4 choices)
- correct (index 0-3 of correct answer)
- explanation (why the answer is correct)

Return ONLY valid JSON array. Example format:
[{{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}}]"""
            
            system_prompt = "You are a quiz generator. Return only valid JSON arrays."
            
            response = self.generate(prompt, system_prompt, temperature=0.7)
            
            # Extract JSON
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                questions = json.loads(json_str)
            else:
                questions = json.loads(response)
            
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
            
        except Exception as e:
            print(f"Ollama quiz generation failed: {str(e)}")
            return []

# Global instance
ollama_service = OllamaService()
