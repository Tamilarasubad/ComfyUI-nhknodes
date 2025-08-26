import torch
import comfy.model_management

MAX_RESOLUTION=16384

class FluxEmptyLatentSizePicker:
    """
    Empty latent size picker optimized for Flux with common aspect ratios
    Based on NHK aspect ratio calculations with multiples of 64
    """
    
    def __init__(self):
        self.device = comfy.model_management.intermediate_device()
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "resolution": ([
                    # 2.0 MP - High Quality
                    "1408x1408 (1:1, 2.0MP)",
                    "1536x1280 (6:5, 2.0MP)", 
                    "1600x1280 (5:4, 2.0MP)",
                    "1600x1216 (4:3, 2.0MP)",
                    "1728x1152 (3:2, 2.0MP)",
                    "1920x1088 (16:9, 2.0MP)",
                    "2176x960 (21:9, 2.0MP)",
                    "1984x1024 (2:1, 2.0MP)",
                    
                    # 1.0 MP - Standard
                    "1024x1024 (1:1, 1.0MP)",
                    "1088x896 (6:5, 1.0MP)",
                    "1088x896 (5:4, 1.0MP)", 
                    "1152x896 (4:3, 1.0MP)",
                    "1216x832 (3:2, 1.0MP)",
                    "1344x768 (16:9, 1.0MP)",
                    "1536x640 (21:9, 1.0MP)",
                    "1408x704 (2:1, 1.0MP)",
                    
                    # 0.1 MP - Fast Testing
                    "320x320 (1:1, 0.1MP)",
                    "320x256 (6:5, 0.1MP)",
                    "320x256 (5:4, 0.1MP)",
                    "384x256 (4:3, 0.1MP)", 
                    "384x256 (3:2, 0.1MP)",
                    "448x256 (16:9, 0.1MP)",
                    "512x192 (21:9, 0.1MP)",
                    "448x256 (2:1, 0.1MP)",
                ], {"default": "1024x1024 (1:1, 1.0MP)"}),
                
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 64}),
                
                "width_override": ("INT", {
                    "default": 0, 
                    "min": 0, 
                    "max": MAX_RESOLUTION, 
                    "step": 64,
                    "tooltip": "Override width (0 = use preset)"
                }),
                
                "height_override": ("INT", {
                    "default": 0, 
                    "min": 0, 
                    "max": MAX_RESOLUTION, 
                    "step": 64,
                    "tooltip": "Override height (0 = use preset)"
                }),
            }
        }
    
    RETURN_TYPES = ("LATENT", "INT", "INT", "STRING")
    RETURN_NAMES = ("latent", "width", "height", "info")
    FUNCTION = "execute"
    CATEGORY = "nhk"
    
    def execute(self, resolution, batch_size, width_override=0, height_override=0):
        # Parse resolution from dropdown
        dimensions = resolution.split(" ")[0]  # Get "1024x1024" part
        width_str, height_str = dimensions.split("x")
        
        # Use override if provided, otherwise use preset
        width = width_override if width_override > 0 else int(width_str)
        height = height_override if height_override > 0 else int(height_str)
        
        # Create empty latent tensor
        # Latent space is 1/8 the pixel dimensions
        latent = torch.zeros([batch_size, 4, height // 8, width // 8], device=self.device)
        
        # Generate info string
        if width_override > 0 or height_override > 0:
            info = f"Custom: {width}x{height} (overridden)"
        else:
            # Extract aspect ratio and MP info from original string
            info_part = resolution.split(" ", 1)[1]  # Get "(1:1, 1.0MP)" part
            info = f"{width}x{height} {info_part}"
        
        return ({"samples": latent}, width, height, info)

# Node registration
NODE_CLASS_MAPPINGS = {
    "FluxEmptyLatentSizePicker": FluxEmptyLatentSizePicker
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "FluxEmptyLatentSizePicker": "🎯 Flux Empty Latent Size Picker"
}