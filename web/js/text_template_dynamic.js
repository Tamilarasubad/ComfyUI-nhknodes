import { app } from "../../../scripts/app.js";

const TypeSlot = {
    Input: 1,
    Output: 2,
};

const TypeSlotEvent = {
    Connect: true,
    Disconnect: false,
};

const _ID = "TextTemplate";
const _PREFIX = "text_";
const _TYPE = "STRING";

app.registerExtension({
    name: "nhknodes.text_template_dynamic",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (!nodeData || nodeData.name !== _ID) return;

        // Manage text inputs - ensures proper sequential naming
        nodeType.prototype._manageTextInputs = function() {
            const allInputs = this.inputs || [];
            const textInputs = allInputs.filter(inp => inp && inp.type === _TYPE && inp.name.startsWith(_PREFIX));
            
            // Count connected inputs
            const connectedCount = textInputs.filter(inp => inp.link !== null).length;
            
            // Remove all empty inputs first
            for (let i = allInputs.length - 1; i >= 0; i--) {
                const inp = allInputs[i];
                if (inp && inp.type === _TYPE && inp.name.startsWith(_PREFIX) && inp.link === null) {
                    this.removeInput(i);
                }
            }
            
            // Add next sequential input (starts at text_2, never text_1)
            const nextNum = connectedCount + 2;
            this.addInput(`text_${nextNum}`, _TYPE);
            const last = this.inputs[this.inputs.length - 1];
            if (last) last.color_off = "#666";
            
            this?.graph?.setDirtyCanvas(true);
        };

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const me = onNodeCreated?.apply(this);
            // Start with text_1 on node creation
            const hasTextInput = (this.inputs || []).some((i) => i && i.type === _TYPE && i.name.startsWith(_PREFIX));
            if (!hasTextInput) {
                this.addInput("text_1", _TYPE);
                const slot = this.inputs[this.inputs.length - 1];
                if (slot) slot.color_off = "#666";
            }
            return me;
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            const me = onConfigure?.apply(this, arguments);
            try {
                const savedInputs = Array.isArray(info?.inputs) ? info.inputs : [];
                const desiredCount = savedInputs.filter((inp) => inp && inp.type === _TYPE && String(inp.name || "").startsWith(_PREFIX)).length;
                const currentTextInputCount = (this.inputs || []).filter((i) => i && i.type === _TYPE && i.name.startsWith(_PREFIX)).length;
                
                // Add missing text inputs to match saved connections
                for (let i = currentTextInputCount; i < desiredCount; i++) {
                    this.addInput(`text_${i + 1}`, _TYPE);
                    const slot = this.inputs[this.inputs.length - 1];
                    if (slot) slot.color_off = "#666";
                }
                
                // Clean up after configuration
                setTimeout(() => this._manageTextInputs(), 10);
            } catch (e) {
                // Ignore configuration errors
            }
            return me;
        };

        const onConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (slotType, slot_idx, event, link_info, node_slot) {
            const me = onConnectionsChange?.apply(this, arguments);

            if (slotType === TypeSlot.Input && node_slot && node_slot.name.startsWith(_PREFIX)) {
                // Handle connection type updates
                if (link_info && event === TypeSlotEvent.Connect) {
                    const fromNode = this.graph._nodes.find((other) => other.id == link_info.origin_id);
                    if (fromNode) {
                        const parent_link = fromNode.outputs[link_info.origin_slot];
                        if (parent_link) {
                            node_slot.type = parent_link.type;
                        }
                    }
                }

                // Update inputs after connection change
                setTimeout(() => this._manageTextInputs(), 100);
                return me;
            }

            return me;
        };

        return nodeType;
    },
});