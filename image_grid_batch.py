import torch
import math

class ImageGridBatch:
    """
    Creates a batch of uniformly sized images from up to 6 inputs.
    All images are scaled to the same dimensions based on grid cell calculations.
    Output displays as separate images in batch rather than a composite.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": ("INT", {
                    "default": 1024,
                    "min": 64,
                    "max": 8192,
                    "step": 64,
                    "tooltip": "Total width used for cell calculations"
                }),
                "images_per_row": ("INT", {
                    "default": 2,
                    "min": 1,
                    "max": 6,
                    "step": 1,
                    "tooltip": "Number of images per row (affects individual image sizing)"
                }),
                "spacing": ("INT", {
                    "default": 10,
                    "min": 0,
                    "max": 100,
                    "step": 1,
                    "tooltip": "Spacing used in cell calculations (affects individual image sizing)"
                }),
                "background_color": (["black", "white", "gray", "red", "green", "blue"], {
                    "default": "black",
                    "tooltip": "Background color for padding if needed"
                }),
            },
            "optional": {
                "image1": ("IMAGE",),
                "image2": ("IMAGE",),
                "image3": ("IMAGE",),
                "image4": ("IMAGE",),
                "image5": ("IMAGE",),
                "image6": ("IMAGE",),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "INT", "INT", "INT")
    RETURN_NAMES = ("batch", "cell_width", "cell_height", "batch_count")
    FUNCTION = "create_batch"
    CATEGORY = "nhk"
    
    def create_batch(self, width, images_per_row, spacing, background_color, 
                    image1=None, image2=None, image3=None, image4=None, image5=None, image6=None):
        
        # Collect non-None images
        images = []
        for img in [image1, image2, image3, image4, image5, image6]:
            if img is not None:
                images.append(img)
        
        if not images:
            # Return a blank image if no inputs
            cell_height = 512
            cell_width = width // max(1, images_per_row)
            blank = torch.zeros((1, cell_height, cell_width, 3), dtype=torch.float32)
            return (blank, cell_width, cell_height, 1)
        
        # Get color values for padding
        color_map = {
            "black": (0.0, 0.0, 0.0),
            "white": (1.0, 1.0, 1.0),
            "gray": (0.5, 0.5, 0.5),
            "red": (1.0, 0.0, 0.0),
            "green": (0.0, 1.0, 0.0),
            "blue": (0.0, 0.0, 1.0),
        }
        bg_color = color_map[background_color]
        
        # Calculate cell dimensions (same logic as composite)
        total_spacing_width = (images_per_row - 1) * spacing
        cell_width = (width - total_spacing_width) // images_per_row
        
        # Calculate what each image should be scaled to fit in its cell
        max_scaled_height = 0
        for img in images:
            img_height, img_width = img.shape[1], img.shape[2]
            
            # Calculate scale factors to fit within cell
            scale_w = cell_width / img_width if img_width > cell_width else 1.0
            scale_h = float('inf')  # No height limit yet, will be determined
            scale = min(scale_w, scale_h) if scale_h != float('inf') else scale_w
            
            # Calculate scaled dimensions
            scaled_height = int(img_height * scale) if scale < 1.0 else img_height
            max_scaled_height = max(max_scaled_height, scaled_height)
        
        cell_height = max_scaled_height
        
        # Now recalculate with height constraints
        final_cell_height = cell_height
        for img in images:
            img_height, img_width = img.shape[1], img.shape[2]
            
            # Calculate scale factors to fit within cell
            scale_w = cell_width / img_width if img_width > cell_width else 1.0
            scale_h = final_cell_height / img_height if img_height > final_cell_height else 1.0
            scale = min(scale_w, scale_h)
            
            # If any image still doesn't fit, increase cell height
            if scale < 1.0:
                scaled_height = int(img_height * scale)
                final_cell_height = max(final_cell_height, scaled_height)
        
        cell_height = final_cell_height
        
        # Process each image to uniform cell size
        batch_images = []
        channels = images[0].shape[3]
        device = images[0].device
        
        for image in images:
            # Get original image dimensions
            img_height, img_width = image.shape[1], image.shape[2]
            
            # Calculate scale to fit within cell (preserve aspect ratio)
            scale_w = cell_width / img_width if img_width > 0 else 1.0
            scale_h = cell_height / img_height if img_height > 0 else 1.0
            scale = min(scale_w, scale_h, 1.0)  # Never upscale, only downscale
            
            # Calculate scaled dimensions
            scaled_width = max(1, int(img_width * scale))
            scaled_height = max(1, int(img_height * scale))
            
            # Scale the image if needed
            if scale < 1.0:
                # Use ComfyUI's scaling function
                import comfy.utils
                scaled_image = comfy.utils.common_upscale(
                    image.movedim(-1, 1), scaled_width, scaled_height, "lanczos", "disabled"
                ).movedim(1, -1)
            else:
                scaled_image = image
                scaled_height = img_height
                scaled_width = img_width
            
            # Create cell-sized canvas with background color
            cell_canvas = torch.full(
                (image.shape[0], cell_height, cell_width, channels),
                0.0,
                dtype=torch.float32,
                device=device
            )
            
            # Fill with background color
            for c in range(channels):
                if c < len(bg_color):
                    cell_canvas[:, :, :, c] = bg_color[c]
                else:
                    cell_canvas[:, :, :, c] = bg_color[0]
            
            # Calculate centering within cell
            y_offset = (cell_height - scaled_height) // 2
            x_offset = (cell_width - scaled_width) // 2
            
            # Place the scaled image in the center
            cell_canvas[:, y_offset:y_offset + scaled_height, x_offset:x_offset + scaled_width, :] = scaled_image
            
            batch_images.append(cell_canvas)
        
        # Concatenate all images into a single batch
        batch_tensor = torch.cat(batch_images, dim=0)
        
        return (batch_tensor, cell_width, cell_height, len(images))

# Node registration
NODE_CLASS_MAPPINGS = {
    "ImageGridBatch": ImageGridBatch
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageGridBatch": "📦 Image Grid Batch"
}