from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import re
import json
import os
from app import crud, schemas
from app.database.database import get_db

router = APIRouter()



def build_system_prompt(goal, milestones: List) -> str:
    """Build comprehensive system prompt with JSON schema"""
    
    # Build milestone status
    milestones_info = ""
    if milestones:
        completed = [m for m in milestones if m.is_completed]
        milestones_info = f"ПОДЦЕЛИ ({len(completed)}/{len(milestones)}): "
        milestones_info += ", ".join([f"{'✅' if m.is_completed else '⬜'}{m.title}" for m in milestones])
    else:
        milestones_info = "Подцелей пока нет."
    
    return f"""Ты AI-коуч. Помоги достичь цели. Будь другом - задавай вопросы, предлагай план.

ЦЕЛЬ: "{goal.title}"
{milestones_info}

ФОРМАТ ОТВЕТА - строго JSON в одну строку:
{{"message":"текст","actions":[]}}

Для переноса строки используй \\n внутри message.
Actions - это массив, НЕ пиши их в тексте message!

ПРИМЕРЫ:
{{"message":"Отлично! Расскажи подробнее о цели.","actions":[]}}
{{"message":"Вот план:\\n1. Шаг один\\n2. Шаг два","actions":[{{"type":"create_milestone","data":{{"title":"Шаг один"}}}},{{"type":"create_milestone","data":{{"title":"Шаг два"}}}}]}}
{{"message":"Отмечаю выполненным!","actions":[{{"type":"complete_milestone","data":{{"milestone_id":5}}}}]}}

Доступные actions: create_milestone, complete_milestone, delete_milestone, update_goal.
Язык: русский. Ответ: ТОЛЬКО JSON, одной строкой."""


def parse_ai_response(response_text: str) -> tuple[Optional[Dict], Optional[str]]:
    """
    Parse AI response as JSON.
    Returns: (parsed_dict, error_message)
    """
    if not response_text:
        return None, "Empty response"
    
    # Clean up response
    text = response_text.strip()
    
    # Remove markdown code blocks
    text = re.sub(r'^```json\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'```\s*$', '', text)
    text = text.strip()
    
    # Fix common issues: replace actual newlines inside strings with \n
    # This handles the case where model outputs real newlines instead of \n
    def fix_newlines_in_json(s):
        # Find JSON object boundaries
        start = s.find('{')
        end = s.rfind('}')
        if start == -1 or end == -1:
            return s
        
        # Extract just the JSON part
        json_part = s[start:end+1]
        
        # Replace newlines that are inside strings (between quotes)
        # Simple approach: replace all newlines with space, then clean up
        fixed = json_part.replace('\n', ' ').replace('\r', ' ')
        # Clean up multiple spaces
        fixed = re.sub(r'\s+', ' ', fixed)
        return fixed
    
    # Try direct parsing first
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed, None
    except json.JSONDecodeError:
        pass
    
    # Try with newline fix
    fixed_text = fix_newlines_in_json(text)
    try:
        parsed = json.loads(fixed_text)
        if isinstance(parsed, dict):
            return parsed, None
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from text (find first { and last })
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_candidate = text[start_idx:end_idx + 1]
        
        # Try direct parse
        try:
            parsed = json.loads(json_candidate)
            if isinstance(parsed, dict):
                return parsed, None
        except json.JSONDecodeError:
            pass
        
        # Try with newline fix
        fixed_candidate = fix_newlines_in_json(json_candidate)
        try:
            parsed = json.loads(fixed_candidate)
            if isinstance(parsed, dict):
                return parsed, None
        except json.JSONDecodeError as e:
            return None, f"JSON parse error: {e.msg}"
    
    return None, f"Could not find valid JSON in response"


def normalize_response(parsed: Dict) -> Dict:
    """
    Normalize response to standard format.
    Handles variations like 'action' vs 'actions', single action vs array.
    Also extracts actions from message text if model wrote them there incorrectly.
    """
    normalized = {"message": parsed.get("message", ""), "actions": []}
    
    # Handle both 'actions' (array) and 'action' (single object)
    actions = parsed.get("actions")
    action = parsed.get("action")
    
    if actions is not None:
        if isinstance(actions, list):
            normalized["actions"] = actions
        elif isinstance(actions, dict):
            normalized["actions"] = [actions]
    elif action is not None:
        if isinstance(action, dict) and action.get("type"):
            normalized["actions"] = [action]
        elif isinstance(action, list):
            normalized["actions"] = action
    
    # Try to extract actions from message text if model wrote them there
    message = normalized["message"]
    if message and not normalized["actions"]:
        # Look for patterns like: create_milestone: {"type":"create_milestone"...}
        action_pattern = r'(?:create_milestone|complete_milestone|delete_milestone|update_goal):\s*(\{[^}]+\})'
        matches = re.findall(action_pattern, message)
        for match in matches:
            try:
                action_obj = json.loads(match)
                if isinstance(action_obj, dict) and action_obj.get("type"):
                    normalized["actions"].append(action_obj)
            except json.JSONDecodeError:
                pass
        
        # Clean up message - remove the incorrectly placed actions
        if normalized["actions"]:
            # Remove action patterns from message
            cleaned_message = re.sub(r'-?\s*(?:create_milestone|complete_milestone|delete_milestone|update_goal):\s*\{[^}]+\}\s*', '', message)
            # Clean up extra whitespace and newlines
            cleaned_message = re.sub(r'\n\s*\n', '\n', cleaned_message).strip()
            normalized["message"] = cleaned_message
    
    return normalized


def validate_response(parsed: Dict) -> tuple[bool, Optional[str]]:
    """
    Validate parsed response against schema.
    Returns: (is_valid, error_message)
    """
    # Check required field: message
    if "message" not in parsed:
        return False, "Missing required field: 'message'"
    
    if not isinstance(parsed["message"], str):
        return False, f"Field 'message' must be string, got {type(parsed['message']).__name__}"
    
    # Normalize the response first
    normalized = normalize_response(parsed)
    actions = normalized.get("actions", [])
    
    if actions:
        valid_action_types = ["create_milestone", "complete_milestone", "delete_milestone", "update_goal"]
        
        for i, action in enumerate(actions):
            if not isinstance(action, dict):
                return False, f"actions[{i}] must be object, got {type(action).__name__}"
            
            if "type" not in action:
                return False, f"actions[{i}] missing required field 'type'"
            
            action_type = action["type"]
            if action_type not in valid_action_types:
                return False, f"actions[{i}].type '{action_type}' is invalid. Valid types: {valid_action_types}"
            
            # Validate data for each action type
            data = action.get("data", {})
            
            if action_type == "create_milestone":
                if not data.get("title"):
                    return False, f"actions[{i}] (create_milestone) requires 'data.title'"
            
            elif action_type in ["complete_milestone", "delete_milestone"]:
                if "milestone_id" not in data:
                    return False, f"actions[{i}] ({action_type}) requires 'data.milestone_id'"
    
    return True, None


async def execute_actions(db: Session, goal_id: int, actions: List[Dict]) -> List[str]:
    """Execute actions and return list of results"""
    results = []
    
    for action in actions:
        action_type = action.get("type")
        data = action.get("data", {})
        
        try:
            if action_type == "create_milestone":
                title = data.get("title", "")[:80]
                new_milestone = schemas.MilestoneCreate(
                    goal_id=goal_id,
                    title=title,
                    description=data.get("description", ""),
                    target_date=data.get("target_date"),
                    completed=False
                )
                created = crud.milestone.create_milestone(db=db, milestone=new_milestone)
                results.append(f"✅ Создана подцель: {created.title}")
                print(f"✅ Created milestone: {created.id} - {created.title}")
            
            elif action_type == "complete_milestone":
                milestone_id = data.get("milestone_id")
                if milestone_id:
                    crud.milestone.update_milestone(db, milestone_id, schemas.MilestoneUpdate(is_completed=True))
                    results.append(f"✅ Подцель #{milestone_id} выполнена")
                    print(f"✅ Completed milestone: {milestone_id}")
            
            elif action_type == "delete_milestone":
                milestone_id = data.get("milestone_id")
                if milestone_id:
                    crud.milestone.delete_milestone(db, milestone_id)
                    results.append(f"🗑 Подцель #{milestone_id} удалена")
                    print(f"🗑 Deleted milestone: {milestone_id}")
            
            elif action_type == "update_goal":
                update_data = {}
                if "title" in data:
                    update_data["title"] = data["title"]
                if "description" in data:
                    update_data["description"] = data["description"]
                if update_data:
                    crud.goal.update_goal(db, goal_id, schemas.GoalUpdate(**update_data))
                    results.append(f"✅ Цель обновлена")
                    print(f"✅ Updated goal: {goal_id}")
        
        except Exception as e:
            error_msg = f"❌ Ошибка выполнения {action_type}: {str(e)}"
            results.append(error_msg)
            print(error_msg)
    
    return results


@router.post("/", response_model=schemas.Chat)
def create_chat(chat: schemas.ChatCreate, db: Session = Depends(get_db)):
    chat_data = chat.dict()
    if not chat_data.get('title'):
        goal = crud.goal.get_goal(db, chat.goal_id)
        chat_data['title'] = goal.title if goal else f"Chat for Goal {chat.goal_id}"
    chat_with_title = schemas.ChatCreate(**chat_data)
    return crud.chat.create_chat(db=db, chat=chat_with_title)


@router.get("/{chat_id}", response_model=schemas.Chat)
def read_chat(chat_id: int, db: Session = Depends(get_db)):
    db_chat = crud.chat.get_chat(db, chat_id=chat_id)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat


@router.get("/", response_model=List[schemas.Chat])
def read_chats(goal_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.chat.get_chats(db, goal_id=goal_id, skip=skip, limit=limit)


@router.put("/{chat_id}", response_model=schemas.Chat)
def update_chat(chat_id: int, chat: schemas.ChatUpdate, db: Session = Depends(get_db)):
    db_chat = crud.chat.update_chat(db, chat_id=chat_id, chat=chat)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat


@router.delete("/{chat_id}", response_model=schemas.Chat)
def delete_chat(chat_id: int, db: Session = Depends(get_db)):
    db_chat = crud.chat.delete_chat(db, chat_id=chat_id)
    if db_chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db_chat


@router.post("/{chat_id}/messages/", response_model=schemas.Message)
async def create_message(
    chat_id: int, 
    message: schemas.MessageCreate, 
    db: Session = Depends(get_db),
    debug_mode: bool = Query(False, description="Enable debug mode")
):
    """Create a message and get AI response"""
    try:
        # Save user message
        message_data = message.dict(exclude_unset=True)
        message_data['chat_id'] = chat_id
        message_with_chat_id = schemas.MessageCreate(**message_data)
        user_message = crud.chat.create_message(db=db, message=message_with_chat_id)
        
        # Get AI response for user messages
        if message_with_chat_id.sender == "user":
            from app.services.llm_service import llm_service
            
            # Get context
            chat = crud.chat.get_chat(db, chat_id)
            goal = None
            milestones = []
            
            if chat and chat.goal_id:
                goal = crud.goal.get_goal(db, chat.goal_id)
                milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
            
            if not goal:
                return user_message
            
            # Build messages for LLM
            chat_history = crud.chat.get_messages(db, chat_id=chat_id, skip=0, limit=10)
            system_prompt = build_system_prompt(goal, milestones)
            llm_messages = [{"role": "system", "content": system_prompt}]
            
            for msg in chat_history:
                role = "assistant" if msg.sender == "ai" else "user"
                llm_messages.append({"role": role, "content": msg.content})
            
            # DEBUG: Collect all debug information
            debug_log = []
            if debug_mode:
                debug_log.append("=" * 50)
                debug_log.append("🔍 DEBUG MODE ENABLED")
                debug_log.append("=" * 50)
                debug_log.append("")
                debug_log.append("📋 SYSTEM PROMPT:")
                debug_log.append("-" * 30)
                debug_log.append(system_prompt[:2000] + "..." if len(system_prompt) > 2000 else system_prompt)
                debug_log.append("-" * 30)
                debug_log.append("")
                debug_log.append(f"📝 CHAT HISTORY ({len(llm_messages) - 1} messages):")
                for i, m in enumerate(llm_messages[1:], 1):
                    content_preview = m['content'][:100] + "..." if len(m['content']) > 100 else m['content']
                    debug_log.append(f"  [{i}] {m['role']}: {content_preview}")
                debug_log.append("")
            
            # Try to get valid JSON response (with retry)
            max_retries = 2
            last_error = None
            ai_content = ""
            raw_response = ""
            success = False
            
            for attempt in range(max_retries + 1):
                try:
                    print(f"📤 LLM request attempt {attempt + 1}/{max_retries + 1}")
                    if debug_mode:
                        debug_log.append(f"🔄 ATTEMPT {attempt + 1}/{max_retries + 1}")
                        debug_log.append("-" * 30)
                    
                    # Add retry context if needed
                    if attempt > 0 and last_error:
                        retry_msg = f"""⚠️ ОШИБКА! Твой ответ не соответствовал JSON формату.

Ошибка: {last_error}

Ответь ТОЛЬКО валидным JSON:
{{"message": "твой текст здесь", "actions": []}}

БЕЗ текста до или после JSON!"""
                        llm_messages.append({"role": "user", "content": retry_msg})
                        print(f"🔄 Retry due to: {last_error}")
                        if debug_mode:
                            debug_log.append(f"📤 RETRY REQUEST:")
                            debug_log.append(retry_msg)
                            debug_log.append("")
                    
                    # Get AI response
                    response = await llm_service.chat_completion(
                        messages=llm_messages,
                        temperature=0.2,  # Very low for consistent format
                        max_tokens=2000
                    )
                    raw_response = str(response) if response else ""
                    print(f"📥 Raw response ({len(raw_response)} chars): {raw_response[:200]}...")
                    
                    if debug_mode:
                        debug_log.append(f"📥 RAW RESPONSE ({len(raw_response)} chars):")
                        debug_log.append(raw_response)
                        debug_log.append("")
                    
                    # Parse response
                    parsed, parse_error = parse_ai_response(raw_response)
                    
                    if parse_error:
                        last_error = parse_error
                        print(f"❌ Parse error: {parse_error}")
                        if debug_mode:
                            debug_log.append(f"❌ PARSE ERROR: {parse_error}")
                            debug_log.append("")
                        continue
                    
                    if debug_mode:
                        debug_log.append(f"✅ PARSED JSON:")
                        debug_log.append(json.dumps(parsed, ensure_ascii=False, indent=2))
                        debug_log.append("")
                    
                    # Validate response
                    is_valid, validation_error = validate_response(parsed)
                    
                    if not is_valid:
                        last_error = validation_error
                        print(f"❌ Validation error: {validation_error}")
                        if debug_mode:
                            debug_log.append(f"❌ VALIDATION ERROR: {validation_error}")
                            debug_log.append("")
                        continue
                    
                    # Success! Extract message and execute actions
                    print(f"✅ Valid JSON response received!")
                    if debug_mode:
                        debug_log.append("✅ VALIDATION PASSED!")
                        debug_log.append("")
                    
                    # Normalize the response
                    normalized = normalize_response(parsed)
                    ai_content = normalized.get("message", "")
                    actions = normalized.get("actions", [])
                    
                    # DON'T execute actions automatically - prepare for confirmation
                    if actions and chat.goal_id:
                        print(f"📋 Prepared {len(actions)} actions for confirmation")
                        if debug_mode:
                            debug_log.append(f"📋 PENDING ACTIONS ({len(actions)}):")
                            for a in actions:
                                debug_log.append(f"  - {a.get('type')}: {json.dumps(a.get('data', {}), ensure_ascii=False)}")
                            debug_log.append("")
                        
                        # Format actions for display
                        action_descriptions = []
                        for a in actions:
                            action_type = a.get("type", "")
                            data = a.get("data", {})
                            if action_type == "create_milestone":
                                action_descriptions.append(f"📌 Создать подцель: {data.get('title', '')}")
                            elif action_type == "complete_milestone":
                                action_descriptions.append(f"✅ Выполнить подцель #{data.get('milestone_id')}")
                            elif action_type == "delete_milestone":
                                action_descriptions.append(f"🗑 Удалить подцель #{data.get('milestone_id')}")
                        
                        if action_descriptions:
                            ai_content += "\n\n**Предлагаемые действия:**\n" + "\n".join(action_descriptions)
                        
                        # Add pending actions marker (JSON at the end for frontend parsing)
                        ai_content += f"\n\n<!--PENDING_ACTIONS:{json.dumps(actions, ensure_ascii=False)}-->"
                    
                    success = True
                    break  # Success, exit retry loop
                    
                except Exception as e:
                    last_error = str(e)
                    print(f"❌ LLM error on attempt {attempt + 1}: {e}")
                    if debug_mode:
                        debug_log.append(f"❌ EXCEPTION: {str(e)}")
                        debug_log.append("")
            
            # If all retries failed, use fallback
            if not ai_content:
                ai_content = raw_response if raw_response else "Извините, произошла ошибка."
                if debug_mode:
                    debug_log.append("=" * 50)
                    debug_log.append(f"⚠️ ALL {max_retries + 1} ATTEMPTS FAILED")
                    debug_log.append(f"Last error: {last_error}")
                    debug_log.append("Using raw response as fallback")
                    debug_log.append("=" * 50)
            
            # Add full debug log to response
            if debug_mode and debug_log:
                ai_content += "\n\n" + "━" * 40
                ai_content += "\n🔧 DEBUG LOG:\n"
                ai_content += "━" * 40 + "\n"
                ai_content += "\n".join(debug_log)
            
            # Save AI response
            ai_message = schemas.MessageCreate(
                content=ai_content,
                sender="ai",
                chat_id=chat_id
            )
            crud.chat.create_message(db=db, message=ai_message)
        
        return user_message
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chat_id}/messages/", response_model=List[schemas.Message])
def read_messages(chat_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.chat.get_messages(db, chat_id=chat_id, skip=skip, limit=limit)


@router.post("/{chat_id}/confirm-actions/")
async def confirm_actions(
    chat_id: int,
    actions: List[Dict[str, Any]],
    db: Session = Depends(get_db)
):
    """Execute confirmed actions from user and get AI follow-up"""
    try:
        # Get chat to find goal_id
        chat = crud.chat.get_chat(db, chat_id)
        if not chat or not chat.goal_id:
            raise HTTPException(status_code=404, detail="Chat or goal not found")
        
        # Execute the confirmed actions
        results = await execute_actions(db, chat.goal_id, actions)
        
        # Get current milestone count
        milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
        completed = len([m for m in milestones if m.is_completed])
        pending = len([m for m in milestones if not m.is_completed])
        
        # Build follow-up message based on what was done
        result_text = "✅ " + "\n".join(results) if results else "✅ Готово!"
        
        # Add helpful follow-up based on current state
        if pending > 0:
            result_text += f"\n\n📊 У тебя сейчас {len(milestones)} подцелей ({completed} выполнено, {pending} осталось)."
            result_text += "\n\nЧто дальше?"
            result_text += "\n• Добавить ещё подцели - просто напиши их"
            result_text += "\n• Установить дедлайны - скажи 'установи дедлайн для...'"
            result_text += "\n• Начать работу - скажи 'готово' или 'начать'"
        elif len(milestones) == 0:
            result_text += "\n\nХочешь добавить подцели для достижения цели? Просто опиши шаги."
        else:
            result_text += f"\n\n🎉 Отлично! Все {len(milestones)} подцелей выполнены!"
            result_text += "\n\nХочешь добавить новые подцели или цель достигнута?"
        
        ai_message = schemas.MessageCreate(
            content=result_text,
            sender="ai",
            chat_id=chat_id
        )
        crud.chat.create_message(db=db, message=ai_message)
        
        return {"status": "success", "results": results, "milestones_count": len(milestones)}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error confirming actions: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chat_id}/cancel-actions/")
async def cancel_actions(
    chat_id: int,
    db: Session = Depends(get_db)
):
    """Cancel pending actions and suggest alternatives"""
    try:
        # Get chat context
        chat = crud.chat.get_chat(db, chat_id)
        milestones_count = 0
        if chat and chat.goal_id:
            milestones = crud.milestone.get_milestones(db, goal_id=chat.goal_id)
            milestones_count = len(milestones)
        
        # Create helpful cancellation message
        cancel_text = "❌ Хорошо, отменяю.\n\n"
        cancel_text += "Что хочешь сделать?\n"
        cancel_text += "• Предложить другие подцели\n"
        cancel_text += "• Изменить формулировку\n"
        if milestones_count > 0:
            cancel_text += f"• Посмотреть текущие {milestones_count} подцелей\n"
        cancel_text += "• Или просто напиши, что тебе нужно!"
        
        ai_message = schemas.MessageCreate(
            content=cancel_text,
            sender="ai",
            chat_id=chat_id
        )
        crud.chat.create_message(db=db, message=ai_message)
        
        return {"status": "cancelled"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
