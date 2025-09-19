import { app } from "../../../scripts/app.js";

console.log("VisualResizer extension loaded!");

app.registerExtension({
    name: "nhknodes.VisualResizerLive",

    async nodeCreated(node) {
        console.log("Node created - Class:", node.comfyClass, "Type:", node.type, "Title:", node.title);

        if (node.comfyClass !== "VisualResizer" && node.type !== "VisualResizer") {
            return;
        }

        console.log("🖼️ Processing VisualResizer node!");

        // Create preview canvas
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1088;
        canvas.style.cssText = `
            border: 2px solid #444;
            border-radius: 4px;
            background: #222;
            margin: 4px;
            display: block;
            max-width: calc(100% - 20px);
            max-height: calc(100vh - 200px);
            object-fit: contain;
        `;

        // Add canvas to node using ComfyUI's widget system
        node.addDOMWidget("preview", "canvas", canvas);

        // Set a reasonable initial size
        canvas.style.width = "300px";
        canvas.style.height = "169px"; // 16:9 ratio
        console.log("Canvas widget added successfully");

        // Store canvas reference
        node.previewCanvas = canvas;

        // Function to update preview
        const updatePreview = () => {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Get current widget values
            const canvasWidth = node.widgets?.find(w => w.name === "canvas_width")?.value || 1024;
            const canvasHeight = node.widgets?.find(w => w.name === "canvas_height")?.value || 1024;
            const imageWidth = node.widgets?.find(w => w.name === "image_width")?.value || 512;
            const imageHeight = node.widgets?.find(w => w.name === "image_height")?.value || 512;
            const offsetX = node.widgets?.find(w => w.name === "offset_x")?.value || 0;
            const offsetY = node.widgets?.find(w => w.name === "offset_y")?.value || 0;
            const backgroundColor = node.widgets?.find(w => w.name === "background_color")?.value || "black";

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Set background
            if (backgroundColor === "white") {
                ctx.fillStyle = "#ffffff";
            } else if (backgroundColor === "gray") {
                ctx.fillStyle = "#888888";
            } else {
                ctx.fillStyle = "#000000";
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate scale for preview (fit canvas in 1920x1088)
            const scale = Math.min(1920 / canvasWidth, 1088 / canvasHeight);

            // Draw canvas outline
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 1;
            const previewCanvasW = canvasWidth * scale;
            const previewCanvasH = canvasHeight * scale;
            const canvasX = (1920 - previewCanvasW) / 2;
            const canvasY = (1088 - previewCanvasH) / 2;
            ctx.strokeRect(canvasX, canvasY, previewCanvasW, previewCanvasH);

            // Calculate image position
            const previewImageW = imageWidth * scale;
            const previewImageH = imageHeight * scale;
            const imageX = canvasX + (previewCanvasW - previewImageW) / 2 + (offsetX * scale);
            const imageY = canvasY + (previewCanvasH - previewImageH) / 2 + (offsetY * scale);

            // Draw image placeholder rectangle
            ctx.fillStyle = "#444";
            ctx.fillRect(imageX, imageY, previewImageW, previewImageH);
            ctx.strokeStyle = "#888";
            ctx.lineWidth = 1;
            ctx.strokeRect(imageX, imageY, previewImageW, previewImageH);

            // Draw X in center to indicate image area
            ctx.strokeStyle = "#aaa";
            ctx.beginPath();
            ctx.moveTo(imageX, imageY);
            ctx.lineTo(imageX + previewImageW, imageY + previewImageH);
            ctx.moveTo(imageX + previewImageW, imageY);
            ctx.lineTo(imageX, imageY + previewImageH);
            ctx.stroke();
        };

        // Setup input listeners for real-time updates
        if (node.widgets) {
            node.widgets.forEach(widget => {
                if (widget.name && ['canvas_width', 'canvas_height', 'image_width', 'image_height', 'offset_x', 'offset_y', 'background_color'].includes(widget.name)) {
                    const originalCallback = widget.callback;
                    widget.callback = function(value) {
                        if (originalCallback) {
                            originalCallback.call(this, value);
                        }
                        // Update preview after slight delay
                        setTimeout(updatePreview, 10);
                    };
                }
            });
        }


        // Initial preview update
        setTimeout(updatePreview, 100);

        console.log("Live preview setup complete");
    }
});