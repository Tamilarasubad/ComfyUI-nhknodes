class AnyType(str):
    """Wildcard type that matches any input"""
    def __ne__(self, __value: object) -> bool:
        return False

anyType = AnyType("*")

class CyclingSwitch:
    """
    Cycles through connected inputs automatically.
    Supports 2-5 inputs and auto-resets to first input when cycle completes.
    """
    
    def __init__(self):
        self.current_index = 0
        self.last_input_count = 0
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "input_1": (anyType, {}),
                "input_2": (anyType, {}),
            },
            "optional": {
                "input_3": (anyType, {}),
                "input_4": (anyType, {}),
                "input_5": (anyType, {}),
                "reset": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Reset cycle back to input_1"
                }),
            }
        }
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")
    
    RETURN_TYPES = (anyType, "STRING", "INT")
    RETURN_NAMES = ("output", "info", "current_index")
    FUNCTION = "execute"
    CATEGORY = "nhk"
    
    def execute(self, input_1, input_2, input_3=None, input_4=None, input_5=None, reset=False):
        # Collect connected inputs
        inputs = [input_1, input_2]
        if input_3 is not None:
            inputs.append(input_3)
        if input_4 is not None:
            inputs.append(input_4)
        if input_5 is not None:
            inputs.append(input_5)
        
        input_count = len(inputs)
        
        # Reset if requested or input count changed
        if reset or input_count != self.last_input_count:
            self.current_index = 0
            self.last_input_count = input_count
        
        # Get current input
        selected_input = inputs[self.current_index]
        
        # Create info string
        info = f"Using input_{self.current_index + 1} of {input_count} connected inputs"
        
        # Advance to next input for next execution
        self.current_index = (self.current_index + 1) % input_count
        
        return (selected_input, info, self.current_index)

# Node registration
NODE_CLASS_MAPPINGS = {
    "CyclingSwitch": CyclingSwitch
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CyclingSwitch": "🔄 Cycling Switch"
}