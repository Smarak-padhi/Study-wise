import PyPDF2
import re
from typing import List, Dict

class PDFProcessor:
    """Extract and process text from PDF files"""
    
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """Extract all text from PDF"""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                
                return text.strip()
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean extracted text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,;:?!()\-]', '', text)
        return text.strip()
    
    @staticmethod
    def extract_topics_simple(text: str) -> List[str]:
        """
        Extract topics using rule-based approach with multiple patterns and fallback
        """
        topics = []
        
        # Pattern 1: "Topic 1:", "Unit 1:", "Chapter 1:", "Module 1:"
        pattern1 = re.findall(r'(?:Topic|Unit|Chapter|Module|Lesson|Section)\s*\d+[:\-\s]+([^\n\.]{3,80})', text, re.IGNORECASE)
        topics.extend(pattern1)
        
        # Pattern 2: Numbered lists (1., 2., 3.)
        pattern2 = re.findall(r'\n\s*\d+\.\s+([A-Z][^\n\.]{3,80})', text)
        topics.extend(pattern2)
        
        # Pattern 3: Bullet points (•, -, *, →)
        pattern3 = re.findall(r'\n\s*[•\-\*→]\s+([A-Z][^\n\.]{3,80})', text)
        topics.extend(pattern3)
        
        # Pattern 4: Roman numerals (I., II., III.)
        pattern4 = re.findall(r'\n\s*[IVX]+\.\s+([A-Z][^\n\.]{3,80})', text)
        topics.extend(pattern4)
        
        # Pattern 5: Headings (UPPERCASE words followed by content)
        pattern5 = re.findall(r'\n\s*([A-Z][A-Z\s]{5,50})\n', text)
        topics.extend([p.strip() for p in pattern5 if len(p.strip().split()) <= 8])
        
        # Clean and deduplicate
        topics = [t.strip() for t in topics]
        topics = [t for t in topics if 5 < len(t) < 100 and len(t.split()) <= 12]
        topics = list(dict.fromkeys(topics))  # Remove duplicates preserving order
        
        # Fallback: If very few topics found, extract meaningful sentences
        if len(topics) < 3:
            fallback = re.findall(r'([A-Z][a-z]{2,}(?:\s+[A-Za-z]{2,}){2,8})[:\n]', text)
            fallback = [f.strip() for f in fallback if 10 < len(f) < 80]
            fallback = list(dict.fromkeys(fallback))
            topics.extend(fallback[:10])
            topics = list(dict.fromkeys(topics))  # Deduplicate again
        
        return topics[:20]  # Limit to top 20
    
    @staticmethod
    def extract_questions_simple(text: str) -> List[Dict[str, str]]:
        """
        Extract questions from PYQ PDFs
        Looks for question patterns
        """
        questions = []
        
        # Pattern: "Q1.", "Q.1", "1)", "Question 1:"
        patterns = [
            r'Q\.?\s*\d+[:\.\)]\s*([^\n]+)',
            r'\d+\)\s*([^\n]+)',
            r'Question\s*\d+[:\.\)]\s*([^\n]+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            questions.extend(matches)
        
        # Clean questions
        questions = [q.strip() for q in questions if len(q.strip()) > 10]
        questions = list(dict.fromkeys(questions))  # Deduplicate
        
        return [{'question': q, 'answer': ''} for q in questions[:50]]  # Limit to 50

# Global instance
pdf_processor = PDFProcessor()