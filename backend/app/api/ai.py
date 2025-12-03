"""
AI Chat endpoint - handles LLM interactions
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database.database import get_db
from app.services.llm_service import llm_service
from app import crud, schemas

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    goal_id: int = None
    context: dict = None

class ChatResponse(BaseModel):
    message: str
    action: str = None  # "create_goal", "create_milestone", "update_goal", etc.
    data: dict = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Main AI chat endpoint
    LLM can trigger actions like creating goals, milestones, etc.
    """
    try:
        # Convert messages to LLM format
        llm_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Add system prompt with context
        system_prompt = _build_system_prompt(request.goal_id, request.context, db)
        llm_messages.insert(0, {"role": "system", "content": system_prompt})
        
        # Get AI response
        response_text = await llm_service.chat_completion(
            messages=llm_messages,
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse response for actions (simple implementation)
        action, data = _parse_ai_response(response_text, request.goal_id, db)
        
        return ChatResponse(
            message=response_text,
            action=action,
            data=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

def _build_system_prompt(goal_id: int = None, context: dict = None, db: Session = None) -> str:
    """Build system prompt with context about goals and milestones"""
    prompt = """You are an AI assistant for goal tracking. You help users:
1. Create and define goals
2. Create plans with milestones
3. Track progress
4. Provide motivation and advice

You can understand user requests and help them manage their goals. Be helpful, friendly, and encouraging.

When user wants to:
- Create a goal: ask for title and description
- Create milestones: ask for specific steps
- Update progress: acknowledge and update milestones
- Get advice: provide helpful suggestions

Always be conversational and supportive."""
    
    if goal_id and db:
        try:
            goal = crud.goal.get_goal(db, goal_id)
            if goal:
                prompt += f"\n\nCurrent goal: {goal.title}"
                if goal.description:
                    prompt += f"\nDescription: {goal.description}"
                
                # Add milestones context
                milestones = crud.milestone.get_milestones(db, goal_id=goal_id)
                if milestones:
                    prompt += f"\n\nMilestones ({len(milestones)}):"
                    for i, m in enumerate(milestones, 1):
                        status = "✓" if m.completed else "○"
                        prompt += f"\n{i}. {status} {m.title}"
        except:
            pass
    
    return prompt

def _parse_ai_response(response: str, goal_id: int = None, db: Session = None) -> tuple:
    """
    Parse AI response to detect actions
    Simple implementation - can be enhanced with structured output
    """
    response_lower = response.lower()
    
    # Detect action keywords (simple approach)
    if "create goal" in response_lower or "new goal" in response_lower:
        return "suggest_create_goal", {}
    elif "milestone" in response_lower and ("add" in response_lower or "create" in response_lower):
        return "suggest_create_milestone", {}
    
    return None, None

