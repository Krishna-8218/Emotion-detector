const video = document.getElementById("video");
const output = document.getElementById("output");
const toggleCameraBtn = document.getElementById("toggle-camera");
const emotionLog = document.getElementById("emotion-log");

let isCameraOn = true; // Camera state
let lastCheckedTime = 0; // To track the last emotion check time

async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error("Error accessing webcam:", error);
        output.innerText = "Error accessing webcam!";
    }
}

function stopVideo() {
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        video.srcObject = null;
    }
}

async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceExpressionNet.loadFromUri("/models");
    console.log("Models loaded");
    output.innerText = "Models loaded. Starting video...";
    startVideo();
}

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (!isCameraOn) return; // Skip processing if the camera is off

        const currentTime = Date.now();
        if (currentTime - lastCheckedTime < 5000) {
            // Wait for 5 seconds before checking emotions
            return;
        }

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); // Clear previous canvas frame

        // Draw face guider boxes around detected faces
        detections.forEach((detection) => {
            console.log("here")
            const box = detection.detection.box;
            const ctx = canvas.getContext("2d");
            ctx.strokeStyle = "lime"; // Green rectangle for face guider
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
        });

        // Draw face expressions
        faceapi.draw.drawDetections(canvas, detections);
        faceapi.draw.drawFaceExpressions(canvas, detections);

        if (detections.length > 0) {
            const emotions = detections[0].expressions;
            const dominantEmotion = Object.keys(emotions).reduce((a, b) =>
                emotions[a] > emotions[b] ? a : b
            );

            output.innerText = `Detected Emotion: ${dominantEmotion}`;
            logEmotion(dominantEmotion);
            lastCheckedTime = currentTime; // Update the last checked time
        } else {
            output.innerText = "No face detected.";
        }
    }, 100);
});

function logEmotion(emotion) {
    const listItem = document.createElement("li");
    listItem.textContent = `${new Date().toLocaleTimeString()}: ${emotion}`;
    emotionLog.prepend(listItem);

    // Limit the log to 20 entries
    if (emotionLog.children.length > 20) {
        emotionLog.removeChild(emotionLog.lastChild);
    }
}

// Toggle the camera on and off
toggleCameraBtn.addEventListener("click", () => {
    isCameraOn = !isCameraOn;

    if (isCameraOn) {
        startVideo();
        toggleCameraBtn.textContent = "Turn Off Camera";
        output.innerText = "Camera is on.";
    } else {
        stopVideo();
        toggleCameraBtn.textContent = "Turn On Camera";
        output.innerText = "Camera is off.";
    }
});

// Load models and start the application
loadModels();
