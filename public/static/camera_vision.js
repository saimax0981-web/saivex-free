let saivexCameraStream = null;

async function openSaivexCamera(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        alert("Camera is not supported in this browser.");
        return;
    }

    const panel = document.createElement("div");
    panel.id = "cameraPanel";
    panel.style.position = "fixed";
    panel.style.inset = "0";
    panel.style.zIndex = "9999";
    panel.style.background = "rgba(0,0,0,.92)";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.alignItems = "center";
    panel.style.justifyContent = "center";
    panel.innerHTML = `
        <video id="saivexCamera" autoplay playsinline style="width:92%;max-width:520px;border-radius:18px;border:2px solid #ffbf3c"></video>
        <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
            <button onclick="captureSaivexCamera()" style="padding:12px 18px;border-radius:12px;background:#ffbf3c;border:none;font-weight:bold">Analyze</button>
            <button onclick="closeSaivexCamera()" style="padding:12px 18px;border-radius:12px;background:#6b1f1f;color:white;border:none">Close</button>
        </div>
    `;
    document.body.appendChild(panel);

    try{
        saivexCameraStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
        document.getElementById("saivexCamera").srcObject = saivexCameraStream;
    }catch(error){
        alert("Camera permission denied or unavailable.");
        closeSaivexCamera();
    }
}

function closeSaivexCamera(){
    if(saivexCameraStream){
        saivexCameraStream.getTracks().forEach(track => track.stop());
    }
    let panel = document.getElementById("cameraPanel");
    if(panel) panel.remove();
}

async function captureSaivexCamera(){
    let video = document.getElementById("saivexCamera");
    let canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(async function(blob){
        let formData = new FormData();
        formData.append("image", blob, "camera_capture.png");
        formData.append("question", "Analyze this camera image clearly.");

        addUserMessage("📷 Camera image captured");
        addBotMessage("SAIVEX Camera Vision is analyzing...");

        let response = await fetch("/upload_camera_image", {
            method:"POST",
            body:formData
        });

        let data = await response.json();

        removeLastBot();
        addBotMessage(data.reply, data.image);

        closeSaivexCamera();
    }, "image/png");
}
