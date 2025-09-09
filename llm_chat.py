"""
Chat with OpenAI GPT-4o.
Send a message and get an AI response back.
Requires OPENAI_API_KEY in .env file.
Category: nhk/ai
"""

import os
import time
import random
import requests
import json

class LLMChat:
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("STRING", {
                    "default": "gpt-4o-mini",
                    "placeholder": "OpenAI model name"
                }),
                "system_message": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "placeholder": "System prompt"
                }),
                "user_message": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "placeholder": "User message"
                }),
                "temperature": ("FLOAT", {
                    "default": 0.7,
                    "min": 0.0,
                    "max": 2.0,
                    "step": 0.1
                }),
                "max_tokens": ("INT", {
                    "default": 1000,
                    "min": 1,
                    "max": 4096,
                    "step": 1
                }),
                "enable_api_call": ("BOOLEAN", {"default": True}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("response",)
    FUNCTION = "chat_completion"
    CATEGORY = "nhk/ai"
    DESCRIPTION = "Chat with OpenAI GPT-4o"
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        """Force re-execution every time by returning a random value"""
        return f"llm_chat_{time.time()}_{random.randint(1000, 9999)}"
    
    def chat_completion(self, model, system_message="", user_message="", temperature=0.7, max_tokens=1000, enable_api_call=True):
        """Simple OpenAI API call without caching or state management"""
        
        print(f"LLMChat: Processing request with model {model}")
        
        # If API call is disabled, return dummy response
        if not enable_api_call:
            return ("API call disabled - dummy response",)
        
        # Get API key from environment
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("LLMChat: Error - OPENAI_API_KEY not found")
            return ("Error: OPENAI_API_KEY not found in environment variables",)
        
        # Validate inputs
        if not user_message or not user_message.strip():
            print("LLMChat: Error - Empty user message")
            return ("Error: User message cannot be empty",)
        
        # Prepare messages
        messages = []
        if system_message and system_message.strip():
            messages.append({"role": "system", "content": system_message.strip()})
        messages.append({"role": "user", "content": user_message.strip()})
        
        # Prepare API request
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        print(f"LLMChat: Calling OpenAI API...")
        start_time = time.time()
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=60
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                
                if 'choices' in result and len(result['choices']) > 0:
                    assistant_response = result['choices'][0]['message']['content']
                    
                    # Log success info
                    usage = result.get('usage', {})
                    input_tokens = usage.get('prompt_tokens', 0)
                    output_tokens = usage.get('completion_tokens', 0)
                    
                    print(f"LLMChat: Success! {input_tokens} input + {output_tokens} output tokens in {duration:.1f}s")
                    
                    return (assistant_response,)
                else:
                    print("LLMChat: No response content from API")
                    return ("Error: No response content from API",)
            else:
                error_msg = f"API request failed with status {response.status_code}"
                try:
                    error_details = response.json()
                    if 'error' in error_details:
                        error_msg = error_details['error'].get('message', error_msg)
                except:
                    pass
                
                print(f"LLMChat: Error - {error_msg}")
                return (f"API Error: {error_msg}",)
                
        except requests.exceptions.Timeout:
            print("LLMChat: Request timed out")
            return ("Error: Request timed out",)
        except requests.exceptions.RequestException as e:
            print(f"LLMChat: Request error - {e}")
            return (f"Error: Request failed - {str(e)}",)
        except Exception as e:
            print(f"LLMChat: Unexpected error - {e}")
            return (f"Error: {str(e)}",)

NODE_CLASS_MAPPINGS = {
    "LLMChat": LLMChat
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LLMChat": "🤖 LLM Chat",
}