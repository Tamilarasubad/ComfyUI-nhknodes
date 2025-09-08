import torch

class ImageGridBatch:
    """
    Creates a batch from up to 6 input images.
    Simply combines multiple images into a single batch tensor.
    Output displays as separate images in batch rather than a composite.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "image1": ("IMAGE",),
                "image2": ("IMAGE",),
                "image3": ("IMAGE",),
                "image4": ("IMAGE",),
                "image5": ("IMAGE",),
                "image6": ("IMAGE",),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "INT")
    RETURN_NAMES = ("batch", "batch_count")
    FUNCTION = "create_batch"
    CATEGORY = "nhk"
    
    def create_batch(self, image1=None, image2=None, image3=None, image4=None, image5=None, image6=None):
        
        # Collect non-None images
        images = []
        for img in [image1, image2, image3, image4, image5, image6]:
            if img is not None:
                images.append(img)
        
        if not images:
            # Return empty batch if no inputs
            return (torch.empty((0, 0, 0, 3), dtype=torch.float32), 0)
        
        # Simply concatenate all images into a single batch
        batch_tensor = torch.cat(images, dim=0)
        
        return (batch_tensor, len(images))

# Node registration
NODE_CLASS_MAPPINGS = {
    "ImageGridBatch": ImageGridBatch
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageGridBatch": "📦 Image Grid Batch"
}