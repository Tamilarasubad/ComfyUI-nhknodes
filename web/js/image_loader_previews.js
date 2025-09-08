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
            src: `/nhknodes/view?folder_path=${encodeURIComponent(folderPath)}&filename=${encodeURIComponent(filename)}`,
            loading: "lazy"
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

        let isGridExpanded = true;
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
                    imageGrid.style.display = "none";
                });
                
                imageGrid.appendChild(thumbnail);
            });
        };


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
            
            // Show the selected image
            selectedImageDisplay.innerHTML = "";
            if (filename) {
                const img = $el("img", {
                    src: `/nhknodes/view?folder_path=${encodeURIComponent(currentPath)}&filename=${encodeURIComponent(filename)}`,
                    style: {
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        cursor: "pointer"
                    },
                    onclick: () => {
                        // Close selected image and show grid
                        selectedImageDisplay.style.display = "none";
                        isGridExpanded = true;
                        if (imageGrid.children.length > 0) {
                            imageGrid.style.display = "grid";
                        }
                    }
                });
                
                selectedImageDisplay.appendChild(img);
                selectedImageDisplay.style.display = "flex";
                selectedImageDisplay.style.flex = "1";
                selectedImageDisplay.style.minHeight = "100px";
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
            selectedImageDisplay,
            imageGrid
        ]);

        // Add container to node
        const widget = node.addDOMWidget("image_selector", "div", container);
        widget.computeSize = () => {
            return [400, 250];
        };

        // Monitor node size changes and reveal grid when scaled vertically
        const updateContainerHeight = () => {
            if (node.size && node.size[1] > 120) {
                const availableHeight = node.size[1] - 130;
                container.style.height = availableHeight + "px";
                // Show grid when node is scaled tall enough AND user wants grid visible
                if (availableHeight > 100 && isGridExpanded) {
                    imageGrid.style.display = "grid";
                } else {
                    imageGrid.style.display = "none";
                }
            } else {
                container.style.height = "50px";
                imageGrid.style.display = "none";
            }
        };

        container.style.width = "100%";
        updateContainerHeight();

        // Load images on startup since grid is visible by default
        loadImages();

        // Monitor for size changes
        const sizeObserver = setInterval(updateContainerHeight, 100);
    }
});