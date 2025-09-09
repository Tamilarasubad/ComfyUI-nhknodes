"""
Vision-Language model integration using Ollama's Qwen2.5VL.
Analyze, describe, and answer questions about images.
Configurable temperature, max tokens, and system prompts.
Category: nhk
"""

import subprocess
import json
import base64
import io
import tempfile
import os
from PIL import Image
import torch

def tensor_to_pil(tensor):
    """Convert ComfyUI tensor to PIL Image"""
    # Convert from tensor format to PIL
    i = 255. * tensor.cpu().numpy().squeeze()
    img = Image.fromarray(i.astype('uint8'))
    return img

class QwenVision:
    """
    Vision-Language node using Ollama's Qwen2.5VL model
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "system_prompt": ("STRING", {
                    "default": "",
                    "multiline": True,
                    "tooltip": "System instructions for the AI (leave empty for default)"
                }),
                "prompt": ("STRING", {
                    "default": "Describe this image in detail.",
                    "multiline": True,
                    "tooltip": "Question or instruction about the image"
                }),
                "model": (["qwen2.5vl:latest"], {
                    "default": "qwen2.5vl:latest"
                }),
                "temperature": ("FLOAT", {
                    "default": 0.7,
                    "min": 0.0,
                    "max": 2.0,
                    "step": 0.1,
                    "tooltip": "Creativity level (0.0 = focused, 2.0 = creative)"
                }),
                "max_tokens": ("INT", {
                    "default": 512,
                    "min": 50,
                    "max": 4096,
                    "step": 50,
                    "tooltip": "Maximum response length"
                }),
            },
            "optional": {
            }
        }
    
    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("response", "info")
    FUNCTION = "analyze_image"
    CATEGORY = "nhk/ai"
    DESCRIPTION = "Vision-Language model integration using Ollama's Qwen2.5VL"
    
    def analyze_image(self, image, system_prompt, prompt, model, temperature, max_tokens):
        try:
            # Default system prompt if none provided or empty
            if not system_prompt or system_prompt.strip() == "":
                system_prompt = "You are a helpful AI assistant that can see and describe images accurately."
            # Handle batch of images (take first one)
            if len(image.shape) == 4:
                img_tensor = image[0]
            else:
                img_tensor = image
            
            # Convert tensor to PIL Image
            pil_image = tensor_to_pil(img_tensor)
            
            # Save image to temporary file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                pil_image.save(tmp_file.name, 'JPEG', quality=95)
                temp_path = tmp_file.name
            
            try:
                # Build ollama command
                cmd = [
                    "ollama", "run", model,
                    f"System: {system_prompt}\n\nUser: {prompt}"
                ]
                
                # Set environment variables for ollama
                env = os.environ.copy()
                env['OLLAMA_MODELS'] = '/mnt/data/llm/ollama'
                
                # Run ollama with the image
                process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env
                )
                
                # Send image path and get response
                with open(temp_path, 'rb') as img_file:
                    # For Ollama, we need to use a different approach
                    # Let's use the ollama API directly
                    response = self._call_ollama_api(temp_path, prompt, model, temperature, max_tokens, system_prompt)
                
            finally:
                # Clean up temporary file
                os.unlink(temp_path)
            
            if response:
                info = f"Model: {model}, Temp: {temperature}, Max tokens: {max_tokens}"
                return (response.strip(), info)
            else:
                return ("Error: No response from Ollama", f"Failed with model: {model}")
                
        except Exception as e:
            error_msg = f"Error in QwenVision: {str(e)}"
            print(error_msg)
            return (error_msg, "Error occurred")
    
    def _call_ollama_api(self, image_path, prompt, model, temperature, max_tokens, system_prompt):
        """Call Ollama API with image support"""
        try:
            # Encode image to base64
            with open(image_path, 'rb') as img_file:
                img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            # Prepare API payload
            payload = {
                "model": model,
                "prompt": prompt,
                "system": system_prompt,
                "images": [img_base64],
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            # Write payload to temporary file to avoid "Argument list too long" error
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as payload_file:
                json.dump(payload, payload_file)
                payload_path = payload_file.name
            
            try:
                # Use curl to call Ollama API with file input
                import subprocess
                curl_cmd = [
                    'curl', '-s', '-X', 'POST', 'http://localhost:11434/api/generate',
                    '-H', 'Content-Type: application/json',
                    '-d', f'@{payload_path}'
                ]
                
                result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=120)
            finally:
                # Clean up payload file
                os.unlink(payload_path)
            
            if result.returncode == 0 and result.stdout:
                response_data = json.loads(result.stdout)
                return response_data.get('response', 'No response')
            else:
                return f"API Error: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return "Error: Request timed out"
        except json.JSONDecodeError:
            return "Error: Invalid JSON response"
        except Exception as e:
            return f"API Error: {str(e)}"

# Node registration
NODE_CLASS_MAPPINGS = {
    "QwenVision": QwenVision
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "QwenVision": "👁️ Qwen Vision"
}