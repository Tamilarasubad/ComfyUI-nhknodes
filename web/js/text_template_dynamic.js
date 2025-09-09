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
    async beforeRegisterNodeDef(nodeType, nodeData, appRef) {
        if (!nodeData || nodeData.name !== _ID) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const me = onNodeCreated?.apply(this);
            // Add initial text inputs
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
                
                // Always keep one empty input at the end
                let last = this.inputs[this.inputs.length - 1];
                if (last === undefined || last.type !== _TYPE || !last.name.startsWith(_PREFIX) || last.link !== null) {
                    const nextIndex = (this.inputs || []).filter((i) => i && i.type === _TYPE && i.name.startsWith(_PREFIX)).length + 1;
                    this.addInput(`text_${nextIndex}`, _TYPE);
                    last = this.inputs[this.inputs.length - 1];
                    if (last) last.color_off = "#666";
                }
            } catch (e) {
                // no-op
            }
            return me;
        };

        const onConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (slotType, slot_idx, event, link_info, node_slot) {
            const me = onConnectionsChange?.apply(this, arguments);

            if (slotType === TypeSlot.Input && node_slot && node_slot.name.startsWith(_PREFIX)) {
                if (link_info && event === TypeSlotEvent.Connect) {
                    const fromNode = this.graph._nodes.find((other) => other.id == link_info.origin_id);
                    if (fromNode) {
                        const parent_link = fromNode.outputs[link_info.origin_slot];
                        if (parent_link) {
                            node_slot.type = parent_link.type;
                        }
                    }
                } else if (event === TypeSlotEvent.Disconnect) {
                    try { this.removeInput(slot_idx); } catch (e) {}
                }

                // Remove all empty TEXT inputs (from disconnects or node deletions)
                for (let i = this.inputs.length - 1; i >= 0; i--) {
                    const inp = this.inputs[i];
                    if (!inp || inp.type !== _TYPE || !inp.name.startsWith(_PREFIX)) continue;
                    if (inp.link == null) this.removeInput(i);
                }

                // Rename remaining connected TEXT inputs to text_1, text_2, etc.
                let count = 0;
                for (let i = 0; i < this.inputs.length; i++) {
                    const inp = this.inputs[i];
                    if (!inp || inp.type !== _TYPE || !inp.name.startsWith(_PREFIX)) continue;
                    count += 1;
                    inp.name = `text_${count}`;
                }

                // Keep a single empty TEXT input at the end
                const nextIndex = count + 1;
                this.addInput(`text_${nextIndex}`, _TYPE);
                const last = this.inputs[this.inputs.length - 1];
                if (last) last.color_off = "#666";

                this?.graph?.setDirtyCanvas(true);
                return me;
            }

            return me;
        };

        return nodeType;
    },
});