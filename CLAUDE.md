# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a ComfyUI custom nodes collection called "NHK Nodes" - a set of utility nodes for ComfyUI workflows. The nodes are organized in the `nhk` category and focus on workflow utilities like switching, batching, sizing, and image processing.

## Architecture

### Core Structure
- **Python Backend**: Each node is implemented as a Python class in individual `.py` files
- **JavaScript Frontend**: Dynamic UI behavior handled by JavaScript extensions in `web/js/`
- **Registration System**: `__init__.py` dynamically loads all node files and registers them with ComfyUI

### Dynamic Input System
Several nodes use a sophisticated dynamic input system that allows unlimited inputs:

**Python Implementation**:
- Empty `INPUT_TYPES` declarations with `VALIDATE_INPUTS` method
- Functions accept `**kwargs` to handle dynamic parameters
- Filter `kwargs` to collect actual input values

**JavaScript Implementation**:
- Extensions in `web/js/` register with `app.registerExtension()`
- Monitor connection events via `onConnectionsChange`
- Automatically add/remove input slots as users connect/disconnect wires
- Maintain sequential naming (input1, input2, etc.) and one empty slot

Nodes with dynamic inputs: `CyclingSwitch`, `ImageGridBatch`, `ImageGridComposite`

### Node Types

**Utility Nodes**:
- `CyclingSwitch`: Cycles through unlimited inputs automatically 
- `DoubleSwitch`: Lazy-evaluated A/B switching with pairs
- `ExecutionCounter`: Thread-safe execution counting with queue stopping

**Image Processing**:
- `ImageGridBatch`: Combines images into batch tensors (dynamic inputs)
- `ImageGridComposite`: Creates visual grids with spacing/backgrounds (dynamic inputs)
- `ImageLoaderWithPreviews`: Advanced image loading with web API endpoints

**Generation Utilities**:
- `SizePicker`: Model-optimized size presets for Flux/Qwen/SDXL
- `QwenVision`: Vision-language model integration via Ollama

## Development Workflow

### Adding New Nodes
1. Create `node_name.py` with proper header docstring (see Header Format below)
2. Implement class with `INPUT_TYPES`, `RETURN_TYPES`, and execute function
3. Add to `NODE_CLASS_MAPPINGS` and `NODE_DISPLAY_NAME_MAPPINGS`
4. Update `__init__.py` to call `load_node_file("node_name.py")`

### Header Format
**REQUIRED**: Every node file must start with a triple-quote docstring describing the node:

```python
"""
Brief description of what the node does.
Additional details about functionality and use cases.
Any special features or configuration options.
Category: nhk/subcategory (see Category Structure below)
"""
```

Example:
```python
"""
Combines unlimited text inputs into a single output with dynamic inputs.
Perfect for merging multiple text sources with customizable separators.
Auto-adds input slots as you connect wires.
Category: nhk/text
"""
```

### Node Display Requirements
**REQUIRED**: Every node must have:

1. **Emoji in display name**: All nodes must start with an appropriate emoji
```python
NODE_DISPLAY_NAME_MAPPINGS = {
    "NodeClassName": "📝 Node Display Name",
}
```

2. **Tooltip description**: Add `DESCRIPTION` class attribute for hover tooltips
```python
class MyNode:
    # ... other attributes ...
    CATEGORY = "nhk"
    DESCRIPTION = "Brief description that appears on hover"
```

**Emoji Guidelines**:
- Text nodes: 📝 📄 📋 ✏️
- Image nodes: 🖼️ 🎯 📦 🔧
- Utility nodes: 🔄 🔀 ⏱️ 📐 
- Vision/AI nodes: 👁️ 🤖 🧠

### Category Structure
**REQUIRED**: Use organized categories for better node menu structure:

- **`nhk/text`** - Text processing and manipulation
  - SimpleTextInput, TextDisplay, TextCombiner, TextTemplate

- **`nhk/image`** - Image processing and manipulation  
  - ImageGridBatch, ImageGridComposite, ImageLoaderWithPreviews

- **`nhk/utility`** - Workflow utilities and switches
  - CyclingSwitch, DoubleSwitch, ExecutionCounter, SizePicker, Set_Node, Get_Node

- **`nhk/ai`** - AI and machine learning nodes
  - QwenVision

### Adding Dynamic Inputs
1. Use empty `INPUT_TYPES` with `VALIDATE_INPUTS` method
2. Create corresponding JavaScript file in `web/js/`
3. Import in `web/index.js`
4. Follow the pattern from existing dynamic input nodes

### Testing
Restart ComfyUI to reload the custom nodes after changes. No specific build process required.

### Response Accuracy Protocol
**CRITICAL**: Always prefix technical responses with confidence level:
- **VERIFIED:** When you have direct evidence/documentation
- **ASSUMPTION:** When you're inferring or making educated guesses  
- **NEED TO RESEARCH:** When you don't know and must investigate

Never give false certainty. If unsure, research first rather than guessing.

## Git Workflow
**IMPORTANT**: When the user says "commit", always use `git add .` to add ALL changes without discrimination, then commit everything.

## Key Patterns

### AnyType Wildcard
```python
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False
anyType = AnyType("*")
```
Used for nodes that accept any data type.

### Web API Integration
`ImageLoaderWithPreviews` demonstrates ComfyUI web API integration with `@PromptServer.instance.routes` decorators for custom endpoints.

### State Management
Nodes like `CyclingSwitch` and `ExecutionCounter` maintain instance state across executions while handling threading and reset scenarios.

### ComfyUI Integration Points
- `WEB_DIRECTORY = "./web"` declaration in `__init__.py`
- `folder_paths` and `comfy.utils` for ComfyUI compatibility
- Standard ComfyUI tensor formats (BHWC for images)