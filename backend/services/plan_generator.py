from datetime import datetime, timedelta
from typing import List, Dict

class PlanGenerator:
    """Rule-based study plan generation"""
    
    @staticmethod
    def calculate_difficulty_multiplier(difficulty: str) -> float:
        """Get time multiplier based on difficulty"""
        multipliers = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.3
        }
        return multipliers.get(difficulty.lower(), 1.0)
    
    @staticmethod
    def generate_study_plan(
        topics: List[Dict],
        start_date: str,
        end_date: str,
        daily_hours: float = 3.0
    ) -> Dict:
        """
        Generate a week-by-week study plan
        
        Args:
            topics: List of topic dicts with name, difficulty, hours
            start_date: ISO date string
            end_date: ISO date string
            daily_hours: Hours available per day
        
        Returns:
            Dict with week-by-week breakdown
        """
        try:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            total_days = (end - start).days
            
            if total_days <= 0:
                raise ValueError("End date must be after start date")
            
            # Calculate total hours needed
            total_hours_needed = sum(
                t.get('estimated_hours', 5) * PlanGenerator.calculate_difficulty_multiplier(t.get('difficulty_level', 'medium'))
                for t in topics
            )
            
            total_hours_available = total_days * daily_hours
            
            # Adjust if needed
            if total_hours_needed > total_hours_available:
                scale_factor = total_hours_available / total_hours_needed
            else:
                scale_factor = 1.0
            
            # Build week-by-week plan
            plan = {}
            current_date = start
            week_num = 1
            remaining_topics = topics.copy()
            
            while remaining_topics and current_date < end:
                week_key = f"week_{week_num}"
                week_end = min(current_date + timedelta(days=7), end)
                week_hours_available = 7 * daily_hours
                
                week_topics = []
                week_hours_used = 0
                
                # Fill week with topics
                while remaining_topics and week_hours_used < week_hours_available:
                    topic = remaining_topics[0]
                    topic_hours = topic.get('estimated_hours', 5) * scale_factor
                    topic_hours *= PlanGenerator.calculate_difficulty_multiplier(topic.get('difficulty_level', 'medium'))
                    
                    if week_hours_used + topic_hours <= week_hours_available * 1.2:  # Allow 20% overflow
                        week_topics.append({
                            'topic_id': topic.get('id'),
                            'topic_name': topic.get('topic_name'),
                            'hours': round(topic_hours, 1),
                            'difficulty': topic.get('difficulty_level', 'medium'),
                            'tasks': PlanGenerator._generate_tasks(topic)
                        })
                        week_hours_used += topic_hours
                        remaining_topics.pop(0)
                    else:
                        break
                
                plan[week_key] = {
                    'start_date': current_date.isoformat(),
                    'end_date': week_end.isoformat(),
                    'topics': week_topics,
                    'total_hours': round(week_hours_used, 1)
                }
                
                current_date = week_end
                week_num += 1
            
            return {
                'total_weeks': week_num - 1,
                'total_hours': round(total_hours_needed * scale_factor, 1),
                'daily_hours': daily_hours,
                'weeks': plan
            }
            
        except Exception as e:
            print(f"Plan generation failed: {str(e)}")
            return {}
    
    @staticmethod
    def _generate_tasks(topic: Dict) -> List[str]:
        """Generate suggested tasks for a topic"""
        difficulty = topic.get('difficulty_level', 'medium').lower()
        
        tasks = [
            "Read and understand core concepts",
            "Create summary notes"
        ]
        
        if difficulty in ['medium', 'hard']:
            tasks.append("Practice problems and examples")
        
        if difficulty == 'hard':
            tasks.append("Review PYQs and attempt quiz")
            tasks.append("Deep dive into complex topics")
        
        tasks.append("Quick revision before moving forward")
        
        return tasks
    
    @staticmethod
    def get_progress_stats(progress_records: List[Dict]) -> Dict:
        """Calculate progress statistics"""
        total = len(progress_records)
        if total == 0:
            return {
                'total_topics': 0,
                'completed': 0,
                'in_progress': 0,
                'not_started': 0,
                'completion_percentage': 0,
                'total_hours': 0
            }
        
        completed = sum(1 for p in progress_records if p.get('status') == 'completed')
        in_progress = sum(1 for p in progress_records if p.get('status') == 'in_progress')
        not_started = sum(1 for p in progress_records if p.get('status') == 'not_started')
        total_hours = sum(float(p.get('hours_spent', 0)) for p in progress_records)
        
        return {
            'total_topics': total,
            'completed': completed,
            'in_progress': in_progress,
            'not_started': not_started,
            'completion_percentage': round((completed / total) * 100, 1) if total > 0 else 0,
            'total_hours': round(total_hours, 1)
        }

# Global instance
plan_generator = PlanGenerator()