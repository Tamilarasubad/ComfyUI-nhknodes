import { app } from "../../../../scripts/app.js";

const TypeSlot = {
    Input: 1,
    Output: 2,
};

const TypeSlotEvent = {
    Connect: true,
    Disconnect: false,
};

const _ID = "CyclingSwitch";
const _PREFIX = "input";
const _TYPE = "*"; // Accept any type

app.registerExtension({
    name: "nhknodes.cycling_switch_dynamic",
    async beforeRegisterNodeDef(nodeType, nodeData, appRef) {
        if (!nodeData || nodeData.name !== _ID) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const me = onNodeCreated?.apply(this);
            // Only add a starter input if none exist (fresh node, not from load)
            const hasInput = (this.inputs || []).some((i) => i && i.name && i.name.startsWith(_PREFIX));
            if (!hasInput) {
                this.addInput(_PREFIX, _TYPE);
                const slot = this.inputs[this.inputs.length - 1];
                if (slot) slot.color_off = "#666";
            }
            return me;
        };

        // Ensure correct number of inputs when loading from a saved workflow
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            const me = onConfigure?.apply(this, arguments);
            try {
                const savedInputs = Array.isArray(info?.inputs) ? info.inputs : [];
                const desiredCount = savedInputs.filter((inp) => inp && String(inp.name || "").startsWith(_PREFIX)).length;
                const currentCount = (this.inputs || []).filter((i) => i && i.name && i.name.startsWith(_PREFIX)).length;
                // Add missing inputs to match saved connections
                for (let i = currentCount; i < desiredCount; i++) {
                    this.addInput(`${_PREFIX}${i + 1}`, _TYPE);
                    const slot = this.inputs[this.inputs.length - 1];
                    if (slot) slot.color_off = "#666";
                }
                // Always keep one empty input at the end
                let last = this.inputs[this.inputs.length - 1];
                if (last === undefined || !last.name.startsWith(_PREFIX) || last.link !== null) {
                    this.addInput(_PREFIX, _TYPE);
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

            if (slotType === TypeSlot.Input && node_slot && node_slot.name && node_slot.name.startsWith(_PREFIX)) {
                if (link_info && event === TypeSlotEvent.Connect) {
                    const fromNode = this.graph._nodes.find((other) => other.id == link_info.origin_id);
                    if (fromNode) {
                        const parent_link = fromNode.outputs[link_info.origin_slot];
                        if (parent_link) {
                            node_slot.type = parent_link.type;
                            node_slot.name = `${_PREFIX}_`;
                        }
                    }
                } else if (event === TypeSlotEvent.Disconnect) {
                    try { this.removeInput(slot_idx); } catch (e) {}
                }

                // Remove all empty input slots (from disconnects or node deletions)
                for (let i = this.inputs.length - 1; i >= 0; i--) {
                    const inp = this.inputs[i];
                    if (!inp || !inp.name || !inp.name.startsWith(_PREFIX)) continue;
                    if (inp.link == null) this.removeInput(i);
                }

                // Rename remaining connected inputs to input1..inputN
                let count = 0;
                for (let i = 0; i < this.inputs.length; i++) {
                    const inp = this.inputs[i];
                    if (!inp || !inp.name || !inp.name.startsWith(_PREFIX)) continue;
                    count += 1;
                    inp.name = `${_PREFIX}${count}`;
                }

                // Keep a single empty input at the end
                this.addInput(_PREFIX, _TYPE);
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