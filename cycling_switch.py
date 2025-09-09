"""
Automatically cycles through unlimited connected inputs on each execution.
Perfect for testing multiple prompts, models, or parameters in sequence.
Features automatic reset and manual reset options.
Category: nhk
"""

class AnyType(str):
    """Wildcard type that matches any input"""
    def __ne__(self, __value: object) -> bool:
        return False

anyType = AnyType("*")

class CyclingSwitch:
    """
    Cycles through unlimited connected inputs automatically with dynamic input support.
    Auto-resets to first input when cycle completes or input count changes.
    """
    
    def __init__(self):
        self.current_index = 0
        self.last_input_count = 0
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "reset": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Reset cycle back to first input"
                }),
            },
            "optional": {},
        }
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")
    
    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        # Accept dynamic inputs; validation handled at runtime
        return True
    
    RETURN_TYPES = (anyType, "STRING", "INT")
    RETURN_NAMES = ("output", "info", "current_index")
    FUNCTION = "execute"
    CATEGORY = "nhk/utility"
    DESCRIPTION = "Automatically cycles through unlimited connected inputs on each execution"
    
    def execute(self, reset=False, **kwargs):
        # Collect all connected inputs (excluding reset parameter)
        inputs = [
            value for key, value in kwargs.items() 
            if key != 'reset' and value is not None
        ]
        
        input_count = len(inputs)
        
        # Handle case with no inputs
        if input_count == 0:
            return (None, "No inputs connected", 0)
        
        # Reset if requested or input count changed
        if reset or input_count != self.last_input_count:
            self.current_index = 0
            self.last_input_count = input_count
        
        # Ensure index is within bounds (in case inputs were removed)
        if self.current_index >= input_count:
            self.current_index = 0
        
        # Get current input
        selected_input = inputs[self.current_index]
        
        # Create info string
        info = f"Using input {self.current_index + 1} of {input_count} connected inputs"
        
        # Advance to next input for next execution
        self.current_index = (self.current_index + 1) % input_count
        
        return (selected_input, info, self.current_index + 1)

# Node registration
NODE_CLASS_MAPPINGS = {
    "CyclingSwitch": CyclingSwitch
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CyclingSwitch": "🔄 Cycling Switch"
}