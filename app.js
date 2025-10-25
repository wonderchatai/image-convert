
console.log("app.js script started.");

import photonRs from 'https://cdn.jsdelivr.net/npm/photon-rs@0.3.1/+esm';

const imageInput = document.getElementById('image-input');
const formatSelect = document.getElementById('format-select');
const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const convertButton = document.getElementById('convert-button');
const outputImage = document.getElementById('output-image');
const downloadLink = document.getElementById('download-link');
const logOutput = document.getElementById('log-output');

function log(message) {
    console.log(message);
    // Ensure logOutput exists before trying to append
    if (logOutput) {
        if (typeof message === 'object') {
            message = JSON.stringify(message, null, 2);
        }
        logOutput.textContent += `> ${message}\n`;
    }
}

let image = null;
let photon = null; // Declare a variable to hold the initialized photon module

async function main() {
    log('Dynamically importing and initializing Photon WASM module...');
    try {
        // Initialize the photon-rs module as an ES module.
        photon = await photonRs();
        log('Photon WASM module loaded and ready.');
    } catch (error) {
        log('Error loading Photon WASM module:');
        log(error);
        return; // Don't set up listeners if wasm fails to load
    }

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            log('No file selected.');
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            log('Image file loaded.');
            image = new Image();
            image.onload = () => log(`Image dimensions: ${image.width}x${image.height}`);
            image.onerror = () => log('Error loading image data.');
            image.src = event.target.result;
        };

        reader.onerror = () => {
            log('Error reading file.');
        };

        reader.readAsDataURL(file);
    });

    convertButton.addEventListener('click', () => {
        if (!image || !image.src) {
            alert('Please select an image first.');
            log('Convert button clicked without an image.');
            return;
        }
        log('Convert button clicked.');
        let photonImage = null;

        try {
            log('Starting conversion process...');

            // 1. Draw image to a canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            log('Drawn input image to canvas.');

            // 2. Open image in Photon using the initialized photon object
            photonImage = photon.open_image(canvas, ctx);
            log('Image opened in Photon.');

            // 3. Get resize dimensions
            const newWidth = parseInt(widthInput.value) || image.width;
            const newHeight = parseInt(heightInput.value) || image.height;

            // 4. Resize if necessary
            if (newWidth !== image.width || newHeight !== image.height) {
                log(`Resizing from ${image.width}x${image.height} to ${newWidth}x${newHeight}...`);
                photonImage = photon.resize(photonImage, newWidth, newHeight, 1); // 1 = Lanczos3
                log('Resize complete.');
            } else {
                log('No resizing needed.');
            }

            // 5. Get the processed image data from Photon
            const outputCanvas = document.createElement('canvas');
            const outputCtx = outputCanvas.getContext('2d');
            outputCanvas.width = newWidth;
            outputCanvas.height = newHeight;

            const imageData = photon.to_image_data(photonImage);
            log('Converted Photon image back to ImageData.');

            outputCtx.putImageData(imageData, 0, 0);
            log('Placed final ImageData onto output canvas.');

            // 6. Encode to desired format and display
            const outputFormat = formatSelect.value;
            log(`Encoding image to ${outputFormat}...`);
            const dataUrl = outputCanvas.toDataURL(`image/${outputFormat}`);
            log('Encoding complete.');

            outputImage.src = dataUrl;
            outputImage.style.display = 'block';

            downloadLink.href = dataUrl;
            downloadLink.download = `converted.${outputFormat}`;
            downloadLink.style.display = 'block';
            log('Output image displayed and download link updated.');

        } catch (error) {
            log('An error occurred during conversion:');
            log(error);
        } finally {
            if (photonImage) {
                photonImage.free(); // Free WASM memory
                log("Freed wasm memory");
            }
        }
    });
}

main();
