import torch
import math

class ImageGridComposite:
    """
    Creates a grid composite from up to 6 input images.
    Images are arranged left-to-right, top-to-bottom with configurable spacing.
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
                    "tooltip": "Total width of output composite (height calculated automatically)"
                }),
                "images_per_row": ("INT", {
                    "default": 2,
                    "min": 1,
                    "max": 6,
                    "step": 1,
                    "tooltip": "Number of images per row in the grid"
                }),
                "spacing": ("INT", {
                    "default": 10,
                    "min": 0,
                    "max": 100,
                    "step": 1,
                    "tooltip": "Spacing between images in pixels"
                }),
                "background_color": (["black", "white", "gray", "red", "green", "blue"], {
                    "default": "black",
                    "tooltip": "Background color for spacing and empty cells"
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
    
    RETURN_TYPES = ("IMAGE", "INT", "INT")
    RETURN_NAMES = ("composite", "width", "height")
    FUNCTION = "create_composite"
    CATEGORY = "nhk"
    
    def create_composite(self, width, images_per_row, spacing, background_color, 
                        image1=None, image2=None, image3=None, image4=None, image5=None, image6=None):
        
        # Collect non-None images
        images = []
        for img in [image1, image2, image3, image4, image5, image6]:
            if img is not None:
                images.append(img)
        
        if not images:
            # Return a blank image if no inputs
            height = 512
            blank = torch.zeros((1, height, width, 3), dtype=torch.float32)
            return (blank, width, height)
        
        # Get color values
        color_map = {
            "black": (0.0, 0.0, 0.0),
            "white": (1.0, 1.0, 1.0),
            "gray": (0.5, 0.5, 0.5),
            "red": (1.0, 0.0, 0.0),
            "green": (0.0, 1.0, 0.0),
            "blue": (0.0, 0.0, 1.0),
        }
        bg_color = color_map[background_color]
        
        # Calculate grid dimensions
        num_images = len(images)
        num_rows = math.ceil(num_images / images_per_row)
        
        # Calculate cell dimensions
        total_spacing_width = (images_per_row - 1) * spacing
        cell_width = (width - total_spacing_width) // images_per_row
        
        # Find the maximum height needed (from tallest image)
        max_image_height = max(img.shape[1] for img in images)
        cell_height = max_image_height
        
        # Calculate total composite height
        total_spacing_height = (num_rows - 1) * spacing
        composite_height = num_rows * cell_height + total_spacing_height
        
        # Get batch size from first image
        batch_size = images[0].shape[0]
        channels = images[0].shape[3]
        
        # Create composite tensor filled with background color
        composite = torch.full(
            (batch_size, composite_height, width, channels),
            0.0,
            dtype=torch.float32,
            device=images[0].device
        )
        
        # Fill with background color
        for c in range(channels):
            if c < len(bg_color):
                composite[:, :, :, c] = bg_color[c]
            else:
                composite[:, :, :, c] = bg_color[0]  # Use first color component for extra channels
        
        # Place images in grid
        for i, image in enumerate(images):
            row = i // images_per_row
            col = i % images_per_row
            
            # Calculate position
            y_start = row * (cell_height + spacing)
            x_start = col * (cell_width + spacing)
            
            # Get image dimensions
            img_height, img_width = image.shape[1], image.shape[2]
            
            # Calculate placement within cell (center the image)
            y_offset = max(0, (cell_height - img_height) // 2)
            x_offset = max(0, (cell_width - img_width) // 2)
            
            # Calculate actual placement coordinates
            y_pos = y_start + y_offset
            x_pos = x_start + x_offset
            
            # Ensure image fits within cell and composite bounds
            actual_height = min(img_height, cell_height, composite_height - y_pos)
            actual_width = min(img_width, cell_width, width - x_pos)
            
            if actual_height > 0 and actual_width > 0:
                # Place the image
                composite[:, y_pos:y_pos + actual_height, x_pos:x_pos + actual_width, :] = \
                    image[:, :actual_height, :actual_width, :]
        
        return (composite, width, composite_height)

# Node registration
NODE_CLASS_MAPPINGS = {
    "ImageGridComposite": ImageGridComposite
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageGridComposite": "🎯 Image Grid Composite"
}