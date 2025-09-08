import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import { api } from "../../../scripts/api.js";

const IMAGE_LOADER_NODE = "ImageLoaderWithPreviews";

let imagesByPath = {};

const loadImageList = async (folderPath) => {
    try {
        const response = await api.fetchApi("/nhknodes/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_path: folderPath })
        });
        imagesByPath[folderPath] = await response.json();
        return imagesByPath[folderPath];
    } catch (error) {
        console.error("Failed to load images:", error);
        return {};
    }
};

const createImageThumbnail = (filename, folderPath, onSelect) => {
    const thumbnail = $el("div.nhk-image-item", {
        onclick: () => onSelect(filename)
    }, [
        $el("img", {
            src: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#333"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#666" font-size="10">Loading...</text></svg>')}`,
            onload: function() {
                // Use direct GET request for faster loading
                this.src = `/nhknodes/view?folder_path=${encodeURIComponent(folderPath)}&filename=${encodeURIComponent(filename)}&${+new Date()}`;
            },
            onerror: function() {
                this.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#666"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#999" font-size="8">Error</text></svg>')}`;
            }
        })
    ]);
    
    return thumbnail;
};

app.registerExtension({
    name: "nhknodes.ImageLoaderWithPreviews",
    
    async beforeRegisterNodeDef(_nodeType, nodeData) {
        if (nodeData.name !== IMAGE_LOADER_NODE) {
            return;
        }

        // Add CSS styles
        $el("style", {
            textContent: `
                .nhk-image-grid {
                    display: none;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0;
                    overflow: auto;
                    padding: 0;
                    background: #2a2a2a;
                    border: none;
                    margin: 0;
                    width: 100%;
                    flex: 1;
                    box-sizing: border-box;
                }
                
                .nhk-image-grid.expanded {
                    display: grid;
                }
                
                .nhk-image-item {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 0;
                    cursor: pointer;
                    transition: all 0.15s;
                    background: #333;
                    border: none;
                    aspect-ratio: 1;
                    box-sizing: border-box;
                }
                
                .nhk-image-item:hover {
                    background: #404040;
                }
                
                .nhk-image-item.selected {
                    background: #1e3a5f;
                }
                
                .nhk-image-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    background: #222;
                }
                
                .nhk-path-input {
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    background: #333;
                    border: none;
                    color: #fff;
                    font-size: 12px;
                }
                
                .nhk-toggle-button {
                    margin: 0;
                    padding: 0;
                    background: #007acc;
                    border: none;
                    color: #fff;
                    cursor: pointer;
                    font-size: 11px;
                }
                
                .nhk-selected-image {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0;
                    padding: 0;
                    background: #333;
                    border: none;
                    width: 100%;
                    flex: 1;
                    box-sizing: border-box;
                    overflow: hidden;
                }
                
                .nhk-selected-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                
                .nhk-toggle-button:hover {
                    background: #005a9e;
                }
            `,
            parent: document.head,
        });
    },

    async nodeCreated(node) {
        console.log("Node created - Class:", node.comfyClass, "Type:", node.type, "Title:", node.title);
        if (node.comfyClass !== IMAGE_LOADER_NODE && node.type !== IMAGE_LOADER_NODE) {
            return;
        }
        console.log("🖼️ Processing ImageLoaderWithPreviews node!");

        let isGridExpanded = false;
        let selectedImageName = "";
        let currentPath = "/home/nhk/comfy/ComfyUI/output";

        // Find the widgets
        const pathWidget = node.widgets?.find(w => w.name === "folder_path");
        const imageWidget = node.widgets?.find(w => w.name === "image");

        // Set initial values
        currentPath = pathWidget?.value || currentPath;
        
        // Add path input
        const pathInput = $el("input.nhk-path-input", {
            type: "text",
            value: currentPath,
            placeholder: "Enter folder path...",
            onchange: () => {
                currentPath = pathInput.value;
                if (isGridExpanded) {
                    loadImages();
                }
            }
        });

        // Add toggle button
        const toggleBtn = $el("button.nhk-toggle-button", {
            textContent: "📁",
            onclick: () => {
                isGridExpanded = !isGridExpanded;
                toggleBtn.textContent = isGridExpanded ? "🔼" : "📁";
                imageGrid.classList.toggle('expanded', isGridExpanded);
                
                if (isGridExpanded) {
                    // Hide selected image when opening grid
                    selectedImageDisplay.style.display = "none";
                    if (imageGrid.children.length === 0) {
                        loadImages();
                    }
                }
            }
        });

        // Create image grid container
        const imageGrid = $el("div.nhk-image-grid");

        // Function to load and display images
        const loadImages = async () => {
            if (!isGridExpanded) return;
            
            imageGrid.innerHTML = "Loading...";
            
            const images = await loadImageList(currentPath);
            const imageNames = Object.keys(images);
            
            // Clear grid
            imageGrid.innerHTML = "";
            
            if (imageNames.length === 0) {
                imageGrid.innerHTML = "No images found in this folder";
                return;
            }

            // Create thumbnail for each image
            imageNames.forEach(filename => {
                const thumbnail = createImageThumbnail(filename, currentPath, (selectedFilename) => {
                    // Remove selection from other items
                    imageGrid.querySelectorAll('.nhk-image-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Select this item
                    thumbnail.classList.add('selected');
                    
                    // Show the selected image on the node
                    showSelectedImage(selectedFilename);
                    
                    // Close the grid
                    isGridExpanded = false;
                    toggleBtn.textContent = "📁";
                    imageGrid.classList.remove('expanded');
                });
                
                imageGrid.appendChild(thumbnail);
            });
        };

        // Container for toggle button only (path is already shown in widget above)
        const pathContainer = $el("div", {
            style: { display: "flex", alignItems: "center", margin: "0", gap: "0" }
        }, [toggleBtn]);

        // Create selected image display
        const selectedImageDisplay = $el("div.nhk-selected-image", {
            style: { display: "none" }
        });

        // Function to show selected image on node
        const showSelectedImage = async (filename) => {
            selectedImageName = filename;
            
            // Update the widget value for execution
            if (imageWidget) {
                imageWidget.value = filename;
            }
            if (pathWidget) {
                pathWidget.value = currentPath;
            }
            
            // Show the selected image using ComfyUI's built-in image serving
            selectedImageDisplay.innerHTML = "";
            if (filename) {
                const img = $el("img", {
                    src: `/nhknodes/view?folder_path=${encodeURIComponent(currentPath)}&filename=${encodeURIComponent(filename)}&${+new Date()}`,
                    style: {
                        width: "100%",
                        height: "100%",
                        objectFit: "contain"
                    },
                    onload: function() {
                        this.style.opacity = "1";
                    },
                    onerror: function() {
                        this.style.display = "none";
                        const errorText = document.createElement("div");
                        errorText.textContent = "Failed to load image";
                        errorText.style.color = "#666";
                        selectedImageDisplay.appendChild(errorText);
                    }
                });
                
                selectedImageDisplay.appendChild(img);
                selectedImageDisplay.style.display = "flex";
            }
        };

        // Main container
        const container = $el("div", {
            style: { 
                width: "100%", 
                height: "100%",
                padding: "2px",
                background: "#1e1e1e",
                border: "1px solid #333",
                borderRadius: "4px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column"
            }
        }, [
            pathContainer,
            selectedImageDisplay,
            imageGrid
        ]);

        // Add container to node
        const widget = node.addDOMWidget("image_selector", "div", container);
        widget.computeSize = (width, height) => {
            return [width || 600, height || 400];
        };

        // Use percentage-based sizing to fill available space
        container.style.width = "100%";
        container.style.height = "100%";
    }
});