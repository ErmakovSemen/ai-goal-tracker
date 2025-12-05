"""
Push notification service using Firebase Cloud Messaging (FCM)
"""
import os
import json
import httpx
from typing import List, Optional, Dict, Any
from app.models.device_token import DeviceToken

# FCM Server Key from environment
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_API_URL = "https://fcm.googleapis.com/fcm/send"


async def send_push_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    priority: str = "high"
) -> Dict[str, Any]:
    """
    Send push notification to multiple devices via FCM
    
    Args:
        tokens: List of FCM device tokens
        title: Notification title
        body: Notification body
        data: Optional data payload
        priority: 'high' or 'normal'
    
    Returns:
        Dict with success/failure counts
    """
    if not FCM_SERVER_KEY:
        print("⚠️ FCM_SERVER_KEY not set, skipping push notification")
        return {"success": 0, "failure": len(tokens), "errors": ["FCM_SERVER_KEY not configured"]}
    
    if not tokens:
        return {"success": 0, "failure": 0, "errors": []}
    
    headers = {
        "Authorization": f"key={FCM_SERVER_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prepare notification payload
    notification = {
        "title": title,
        "body": body,
        "sound": "default",
        "badge": "1"
    }
    
    payload = {
        "registration_ids": tokens,  # Use registration_ids for multiple tokens
        "notification": notification,
        "priority": priority,
        "data": data or {}
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(FCM_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            
            # Parse results
            success_count = result.get("success", 0)
            failure_count = result.get("failure", 0)
            
            # Check for invalid tokens
            if "results" in result:
                invalid_tokens = []
                for i, res in enumerate(result["results"]):
                    if "error" in res:
                        error = res["error"]
                        # Common errors: InvalidRegistration, NotRegistered
                        if error in ["InvalidRegistration", "NotRegistered"]:
                            invalid_tokens.append(tokens[i])
                
                return {
                    "success": success_count,
                    "failure": failure_count,
                    "invalid_tokens": invalid_tokens,
                    "errors": []
                }
            
            return {
                "success": success_count,
                "failure": failure_count,
                "errors": []
            }
    
    except Exception as e:
        print(f"❌ Error sending push notification: {e}")
        return {
            "success": 0,
            "failure": len(tokens),
            "errors": [str(e)]
        }


async def send_push_to_user(
    db,
    user_id: int,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send push notification to all active devices of a user
    """
    from app import crud
    from datetime import datetime
    
    tokens = crud.device_token.get_tokens_by_user(db, user_id, active_only=True)
    
    if not tokens:
        print(f"⚠️ No active tokens for user {user_id}")
        return {"success": 0, "failure": 0, "message": "No active tokens for user"}
    
    token_strings = [token.token for token in tokens]
    
    result = await send_push_notification(token_strings, title, body, data)
    
    # Mark tokens as used
    try:
        for token in tokens:
            token.last_used_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        print(f"⚠️ Error updating token timestamps: {e}")
    
    # Remove invalid tokens
    if "invalid_tokens" in result and result["invalid_tokens"]:
        try:
            for invalid_token in result["invalid_tokens"]:
                crud.device_token.deactivate_token(db, invalid_token)
            print(f"✅ Deactivated {len(result['invalid_tokens'])} invalid tokens")
        except Exception as e:
            print(f"⚠️ Error deactivating invalid tokens: {e}")
    
    return result

