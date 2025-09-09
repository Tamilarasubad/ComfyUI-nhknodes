import { app } from "../../../scripts/app.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";

app.registerExtension({
	name: "nhknodes.TextDisplay",
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		if (nodeData.name === "TextDisplay") {
			function populate(text) {
				if (this.widgets) {
					// Clear existing widgets except for converted widgets
					const isConvertedWidget = +!!this.inputs?.[0].widget;
					for (let i = isConvertedWidget; i < this.widgets.length; i++) {
						this.widgets[i].onRemove?.();
					}
					this.widgets.length = isConvertedWidget;
				}

				// Handle text data
				const v = Array.isArray(text) ? [...text] : [text];
				for (const textItem of v) {
					// Create a read-only text widget
					const w = ComfyWidgets["STRING"](this, "display_text", ["STRING", { multiline: true }], app).widget;
					w.inputEl.readOnly = true;
					w.inputEl.style.opacity = 0.6;
					w.inputEl.style.fontSize = "12px";
					w.value = textItem || "";
				}

				// Resize the node to fit content
				requestAnimationFrame(() => {
					const sz = this.computeSize();
					if (sz[0] < this.size[0]) {
						sz[0] = this.size[0];
					}
					if (sz[1] < this.size[1]) {
						sz[1] = this.size[1];
					}
					this.onResize?.(sz);
					app.graph.setDirtyCanvas(true, false);
				});
			}

			// When the node is executed, display the text in widgets
			const onExecuted = nodeType.prototype.onExecuted;
			nodeType.prototype.onExecuted = function (message) {
				onExecuted?.apply(this, arguments);
				if (message.text) {
					populate.call(this, message.text);
				}
			};

			// Handle configuration/loading from saved workflows
			const VALUES = Symbol();
			const configure = nodeType.prototype.configure;
			nodeType.prototype.configure = function () {
				this[VALUES] = arguments[0]?.widgets_values;
				return configure?.apply(this, arguments);
			};

			const onConfigure = nodeType.prototype.onConfigure;
			nodeType.prototype.onConfigure = function () {
				onConfigure?.apply(this, arguments);
				const widgets_values = this[VALUES];
				if (widgets_values?.length) {
					requestAnimationFrame(() => {
						populate.call(this, widgets_values);
					});
				}
			};
		}
	},
});