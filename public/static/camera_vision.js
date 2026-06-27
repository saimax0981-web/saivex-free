let saivexCameraStream = null;
async function openSaivexCamera(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ alert("Camera is not supported in this browser."); return; }
    document.getElementById("cameraPanel")?.remove();
    const panel=document.createElement("div"); panel.id="cameraPanel"; panel.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center";
    panel.innerHTML=`<video id="saivexCamera" autoplay playsinline style="width:92%;max-width:520px;border-radius:18px;border:2px solid #ffbf3c"></video><div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button onclick="captureSaivexCamera()" style="padding:12px 18px;border-radius:12px;background:#ffbf3c;border:none;font-weight:bold">Analyze</button><button onclick="closeSaivexCamera()" style="padding:12px 18px;border-radius:12px;background:#6b1f1f;color:white;border:none">Close</button></div>`;
    document.body.appendChild(panel);
    try{ saivexCameraStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); document.getElementById("saivexCamera").srcObject=saivexCameraStream; }catch(e){ alert("Camera permission denied or unavailable."); closeSaivexCamera(); }
}
function closeSaivexCamera(){ if(saivexCameraStream){ saivexCameraStream.getTracks().forEach(t=>t.stop()); saivexCameraStream=null; } document.getElementById("cameraPanel")?.remove(); }
async function captureSaivexCamera(){ const video=document.getElementById("saivexCamera"); if(!video) return; const canvas=document.createElement("canvas"); canvas.width=video.videoWidth||640; canvas.height=video.videoHeight||480; canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height); const imageData=canvas.toDataURL("image/png"); closeSaivexCamera(); await analyzeImageData(imageData,"📷 Camera image captured"); }
