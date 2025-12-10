"""
LLM Service for AI Goal Tracker
Supports multiple providers: Ollama (local), Groq, Hugging Face, Together AI, OpenRouter, OpenAI
"""
import os
import json
from typing import List, Dict, Optional
from app.core.config import settings

class LLMService:
    def __init__(self):
        from app.core.config import settings
        self.provider = settings.LLM_PROVIDER or os.getenv("LLM_PROVIDER", "groq")
        self.api_key = settings.LLM_API_KEY or os.getenv("LLM_API_KEY", "")
        self.model = settings.LLM_MODEL or os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
        
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """Send messages to LLM and get response"""
        
        # Check if API key is set (not needed for Ollama)
        if self.provider != "ollama" and not self.api_key:
            provider_name = self.provider.upper() if self.provider else "LLM"
            return (
                f"{provider_name} сервис не настроен.\n\n"
                f"Установи LLM_API_KEY в переменных окружения в Render Dashboard.\n"
                f"Для DeepSeek: получи ключ на https://platform.deepseek.com"
            )
        
        try:
            if self.provider == "ollama":
                return await self._ollama_chat(messages, model or self.model, temperature, max_tokens)
            elif self.provider == "groq":
                return await self._groq_chat(messages, model or self.model, temperature, max_tokens)
            elif self.provider == "huggingface":
                return await self._huggingface_chat(messages, model or self.model, temperature)
            elif self.provider == "together":
                return await self._together_chat(messages, model or "meta-llama/Llama-3-8b-chat-hf", temperature, max_tokens)
            elif self.provider == "openai":
                return await self._openai_chat(messages, model or "gpt-3.5-turbo", temperature, max_tokens)
            elif self.provider == "openrouter":
                return await self._openrouter_chat(messages, model or "meta-llama/llama-3.1-8b-instruct", temperature, max_tokens)
            elif self.provider == "github":
                return await self._github_models_chat(messages, model or "meta-llama/llama-3.1-8b-instruct", temperature, max_tokens)
            elif self.provider == "deepseek":
                return await self._deepseek_chat(messages, model or "deepseek-chat", temperature, max_tokens)
            else:
                raise ValueError(f"Unknown LLM provider: {self.provider}")
        except Exception as e:
            print(f"LLM service error: {e}")
            return "I'm having trouble connecting to the AI service. Please check your API key configuration."
    
    async def _ollama_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """Ollama local LLM integration"""
        try:
            import httpx
            
            # Ollama runs locally on port 11434
            ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
            url = f"{ollama_url}/api/chat"
            
            headers = {
                "Content-Type": "application/json"
            }
            
            # Check if we need JSON format (for structured responses)
            # Always use JSON format if system prompt mentions JSON, actions, or structured format
            use_json_format = False
            for msg in messages:
                content = msg.get("content", "")
                role = msg.get("role", "")
                content_upper = content.upper()
                
                # System prompt usually contains format instructions
                if role == "system":
                    if any(keyword in content_upper for keyword in ["JSON", "ФОРМАТ", "ACTIONS", "CHECKLIST"]):
                        use_json_format = True
                        break
                # Or explicit JSON format request
                if "JSON" in content_upper and ("формат" in content.lower() or "format" in content.lower()):
                    use_json_format = True
                    break
            
            payload = {
                "model": model,
                "messages": messages,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                },
                "stream": False
            }
            
            # Add JSON format if needed (for structured responses like checklists)
            if use_json_format:
                payload["format"] = "json"
                print(f"📋 Using JSON format for structured response")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data.get("message", {}).get("content", "")
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except httpx.ConnectError:
            return "Ollama is not running. Please start Ollama with: ollama serve"
        except Exception as e:
            print(f"Ollama API error: {e}")
            import traceback
            print(traceback.format_exc())
            return f"I'm having trouble connecting to Ollama. Error: {str(e)}"
    
    async def _groq_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """Groq API integration"""
        try:
            import httpx
            
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                # Ensure content is a string, not an object
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except Exception as e:
            print(f"Groq API error: {e}")
            import traceback
            print(traceback.format_exc())
            return "I'm having trouble connecting to the AI service. Please try again later."
    
    async def _huggingface_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float
    ) -> str:
        """Hugging Face Inference API integration"""
        try:
            import httpx
            
            # Try TGI API first, fallback to router if needed
            url = f"https://api-inference.huggingface.co/models/{model}"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Convert messages to prompt format
            # DeepSeek uses chat format: <|im_start|>role\ncontent<|im_end|>\n
            prompt = ""
            for msg in messages:
                role = msg["role"]
                content = msg["content"]
                # Map roles to DeepSeek format
                if role == "system":
                    prompt += f"<|im_start|>system\n{content}<|im_end|>\n"
                elif role == "user":
                    prompt += f"<|im_start|>user\n{content}<|im_end|>\n"
                elif role == "assistant":
                    prompt += f"<|im_start|>assistant\n{content}<|im_end|>\n"
            
            # Add assistant prompt
            prompt += "<|im_start|>assistant\n"
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "temperature": temperature,
                    "max_new_tokens": 500,
                    "return_full_text": False
                }
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                # If old API returns 410, the model might not be available via inference API
                # Try using a simpler model or inform user
                if response.status_code == 410:
                    raise Exception(f"Model {model} is not available via Inference API. Please use a model that supports Inference API or switch to Together AI.")
                
                # Handle loading state (model might be starting)
                if response.status_code == 503:
                    error_data = response.json()
                    if "estimated_time" in error_data:
                        wait_time = min(error_data.get("estimated_time", 10), 20)
                        import asyncio
                        await asyncio.sleep(wait_time)
                        response = await client.post(url, headers=headers, json=payload)
                    else:
                        import asyncio
                        await asyncio.sleep(10)
                        response = await client.post(url, headers=headers, json=payload)
                
                response.raise_for_status()
                data = response.json()
                
                # Handle text generation format
                if isinstance(data, list) and len(data) > 0:
                    content = data[0].get("generated_text", "")
                    if isinstance(content, dict):
                        import json
                        content = json.dumps(content)
                    # Clean up response
                    content = str(content).replace(prompt, "").strip()
                    content = content.replace("<|im_end|>", "").strip()
                    content = content.replace("<|end|>", "").strip()
                    return content if content else "I'm sorry, I didn't get a response."
                
                # Fallback: return raw data
                return str(data) if data else "I'm sorry, I didn't get a response."
        except Exception as e:
            print(f"Hugging Face API error: {e}")
            import traceback
            print(traceback.format_exc())
            return f"I'm having trouble connecting to the AI service. Error: {str(e)}"
    
    async def _together_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """Together AI API integration"""
        try:
            import httpx
            
            url = "https://api.together.xyz/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except Exception as e:
            print(f"Together AI API error: {e}")
            import traceback
            print(traceback.format_exc())
            return "I'm having trouble connecting to the AI service. Please try again later."
    
    async def _openai_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """OpenAI API integration"""
        try:
            import httpx
            
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except Exception as e:
            print(f"OpenAI API error: {e}")
            import traceback
            print(traceback.format_exc())
            return "I'm having trouble connecting to the AI service. Please try again later."
    
    async def _openrouter_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """OpenRouter API integration - supports many free models"""
        try:
            import httpx
            
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/ai-goal-tracker",  # Optional
                "X-Title": "AI Goal Tracker"  # Optional
            }
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                # Log response for debugging
                if response.status_code != 200:
                    print(f"OpenRouter API error: {response.status_code}")
                    print(f"Response: {response.text}")
                
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except Exception as e:
            print(f"OpenRouter API error: {e}")
            import traceback
            print(traceback.format_exc())
            # Return more detailed error message
            error_msg = str(e)
            if "401" in error_msg or "No cookie" in error_msg:
                return "OpenRouter authentication failed. Please check your API key. Make sure you're using the correct key from https://openrouter.ai/keys"
            return f"I'm having trouble connecting to the AI service. Error: {error_msg}"
    
    async def _github_models_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """GitHub Models API integration - free, no credit card needed"""
        try:
            import httpx
            
            # GitHub Models uses GitHub API
            # Requires GitHub token (can be personal access token)
            url = "https://api.github.com/models/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/vnd.github+json"
            }
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except Exception as e:
            print(f"GitHub Models API error: {e}")
            import traceback
            print(traceback.format_exc())
            return "I'm having trouble connecting to the AI service. Please try again later."
    
    async def _deepseek_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """DeepSeek API integration - free and powerful"""
        try:
            import httpx
            
            # Check API key
            if not self.api_key:
                error_msg = "DeepSeek API key not configured. Please set LLM_API_KEY environment variable."
                print(f"❌ {error_msg}")
                return error_msg
            
            # Validate API key format (should start with 'sk-')
            if not self.api_key.startswith('sk-'):
                print(f"⚠️ Warning: DeepSeek API key doesn't start with 'sk-'. Key preview: {self.api_key[:5]}...")
            
            # DeepSeek API endpoint
            url = "https://api.deepseek.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            print(f"🔑 Using DeepSeek API key: {self.api_key[:10]}...{self.api_key[-4:] if len(self.api_key) > 14 else '***'}")
            
            # Check if we need JSON format (for structured responses)
            use_json_format = False
            for msg in messages:
                content = msg.get("content", "")
                role = msg.get("role", "")
                content_upper = content.upper()
                
                # System prompt usually contains format instructions
                if role == "system":
                    if any(keyword in content_upper for keyword in ["JSON", "ФОРМАТ", "ACTIONS", "CHECKLIST"]):
                        use_json_format = True
                        break
            
            payload = {
                "model": model,  # deepseek-chat, deepseek-coder, etc.
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            # DeepSeek supports response_format for JSON mode
            if use_json_format:
                payload["response_format"] = {"type": "json_object"}
                print(f"📋 Using JSON mode for DeepSeek")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                # Handle 401 Unauthorized specifically
                if response.status_code == 401:
                    error_msg = (
                        "DeepSeek API authentication failed (401 Unauthorized).\n\n"
                        "Возможные причины:\n"
                        "1. API ключ неправильный или истёк\n"
                        "2. Баланс аккаунта пустой (нужно пополнить для активации)\n"
                        "3. API ключ не активирован (проверь на platform.deepseek.com)\n"
                        "4. Ключ не имеет доступа к API\n\n"
                        "Как исправить:\n"
                        "1. Зайди на https://platform.deepseek.com\n"
                        "2. Проверь баланс аккаунта\n"
                        "3. Пополни баланс (даже минимальная сумма активирует API)\n"
                        "4. Проверь, что ключ активен в разделе API Keys\n"
                        "5. Создай новый ключ, если старый не работает\n\n"
                        "Примечание: DeepSeek может требовать пополнения баланса для активации API, даже на бесплатном плане."
                    )
                    print(f"❌ {error_msg}")
                    return error_msg
                
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if isinstance(content, dict):
                    import json
                    content = json.dumps(content)
                return str(content) if content else "I'm sorry, I didn't get a response."
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                error_msg = (
                    "DeepSeek API authentication failed (401 Unauthorized).\n\n"
                    "Возможные причины:\n"
                    "1. Баланс аккаунта пустой (нужно пополнить для активации)\n"
                    "2. API ключ неправильный или истёк\n"
                    "3. Ключ не активирован\n\n"
                    "Как исправить:\n"
                    "1. Зайди на https://platform.deepseek.com\n"
                    "2. Проверь баланс и пополни его (даже минимальная сумма)\n"
                    "3. Проверь, что ключ активен в разделе API Keys\n"
                    "4. Создай новый ключ, если нужно\n\n"
                    "Примечание: DeepSeek может требовать пополнения баланса для активации API."
                )
                print(f"❌ {error_msg}")
                return error_msg
            else:
                print(f"DeepSeek API HTTP error: {e.response.status_code} - {e}")
                return f"DeepSeek API error: HTTP {e.response.status_code}"
        except Exception as e:
            print(f"DeepSeek API error: {e}")
            import traceback
            print(traceback.format_exc())
            return f"I'm having trouble connecting to DeepSeek. Error: {str(e)}"
    
    def _messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        """Convert messages to prompt format for models that need it"""
        prompt = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                prompt += f"User: {content}\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n"
        prompt += "Assistant: "
        return prompt

# Singleton instance
llm_service = LLMService()

