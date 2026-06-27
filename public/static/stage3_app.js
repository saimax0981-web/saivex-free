let conversations = JSON.parse(localStorage.getItem("saivex_conversations") || "[]");
let memories = JSON.parse(localStorage.getItem("saivex_memories") || "[]");
let documents = JSON.parse(localStorage.getItem("saivex_documents") || "[]");
let activeConversationId = localStorage.getItem("saivex_active_conversation_id") || null;
let lastUserMessage = "";
let typingStopped = false;
window.saivexGeneratedFiles = window.saivexGeneratedFiles || {};

function saveState(){
    localStorage.setItem("saivex_conversations", JSON.stringify(conversations));
    localStorage.setItem("saivex_memories", JSON.stringify(memories));
    localStorage.setItem("saivex_documents", JSON.stringify(documents));
    if(activeConversationId) localStorage.setItem("saivex_active_conversation_id", activeConversationId);
}
function ensureConversation(){
    if(activeConversationId){
        const existing = conversations.find(c => String(c.id) === String(activeConversationId));
        if(existing) return existing;
    }
    const c = {id: Date.now(), title:"New Chat", icon:"💬", folder:"General", messages:[]};
    conversations.unshift(c);
    activeConversationId = c.id;
    saveState();
    return c;
}
function toggleSidebar(){ document.getElementById("sidebar")?.classList.toggle("open"); document.getElementById("overlay")?.classList.toggle("show"); }
function closeSidebarMobile(){ if(window.innerWidth <= 800){ document.getElementById("sidebar")?.classList.remove("open"); document.getElementById("overlay")?.classList.remove("show"); } }
function setPrompt(text){ const input = document.getElementById("message"); if(input){ input.value = text; input.focus(); autoResize(input); } }
function hideEmptyState(){ document.getElementById("emptyState")?.remove(); }
function htmlEscape(text){ return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function formatMessage(text){
    return htmlEscape(text)
        .replace(/\*\*(.*?)\*\*/g,"<b>$1</b>")
        .replace(/```([\s\S]*?)```/g,"<pre><code>$1</code></pre>")
        .replace(/\n/g,"<br>");
}
function blobUrl(content, mime){ return URL.createObjectURL(content instanceof Blob ? content : new Blob([content || ""], {type:mime || "text/plain"})); }
function registerGenerated(meta){ const id = "file_" + Date.now() + "_" + Math.random().toString(36).slice(2); window.saivexGeneratedFiles[id] = meta || {}; return id; }
function mediaHTML(image="", file="", preview="", meta={}){
    let extra = "";
    if(image){
        extra += `<br><br><img src="${image}" class="generated-image" alt="SAIVEX generated image"><div class="image-actions"><a href="${image}" target="_blank" class="view-btn">View Image</a><a href="${image}" download class="download-btn">Download Image</a></div>`;
    }
    const id = registerGenerated(meta);
    if(meta && meta.intent === "pdf" && meta.document_text){
        extra += `<div class="file-actions"><button class="file-btn" onclick="downloadSaivexPdf('${id}')">Download PDF</button></div>`;
    } else if(meta && meta.intent === "ppt" && meta.ppt_slides){
        extra += `<div class="file-actions"><button class="file-btn" onclick="downloadSaivexPpt('${id}')">Download PPTX</button></div>`;
    } else if(meta && meta.file_content){
        const url = blobUrl(meta.file_content, meta.file_mime || "text/plain");
        extra += `<div class="file-actions"><a href="${url}" download="${meta.file_name || 'saivex-file.txt'}" class="file-btn">Download File</a></div>`;
    }
    if(meta && meta.preview_content){
        const previewUrl = blobUrl(meta.preview_content, "text/html");
        extra += `<div class="file-actions"><a href="${previewUrl}" target="_blank" class="preview-btn">Preview Website</a></div>`;
    }
    if(file || preview){
        extra += `<div class="file-actions">`;
        if(file) extra += `<a href="${file}" download class="file-btn">Download File</a>`;
        if(preview) extra += `<a href="${preview}" target="_blank" class="preview-btn">Preview</a>`;
        extra += `</div>`;
    }
    return extra;
}
function addUserMessage(message){ hideEmptyState(); const chatbox = document.getElementById("chatbox"); if(!chatbox) return; chatbox.innerHTML += `<div class="message-row"><div class="user">${formatMessage(message)}</div></div>`; chatbox.scrollTop = chatbox.scrollHeight; }
function addBotMessage(message, image="", file="", preview="", meta={}){ hideEmptyState(); const chatbox = document.getElementById("chatbox"); if(!chatbox) return; chatbox.innerHTML += `<div class="message-row"><div class="bot">${formatMessage(message)}${mediaHTML(image,file,preview,meta)}</div></div>`; chatbox.scrollTop = chatbox.scrollHeight; }
function addBotShell(){ hideEmptyState(); const id = "bot_" + Date.now(); const chatbox = document.getElementById("chatbox"); if(!chatbox) return id; chatbox.innerHTML += `<div class="message-row"><div class="bot" id="${id}"><span class="thinking">SAIVEX is thinking...</span></div></div>`; chatbox.scrollTop = chatbox.scrollHeight; return id; }
async function typeBotText(id, text, image="", file="", preview="", meta={}){
    typingStopped = false;
    const box = document.getElementById(id);
    if(!box){ addBotMessage(text,image,file,preview,meta); return; }
    let output = ""; text = String(text || "");
    for(let i=0;i<text.length;i++){
        if(typingStopped) break;
        output += text[i];
        box.innerHTML = formatMessage(output);
        const chatbox = document.getElementById("chatbox");
        if(chatbox) chatbox.scrollTop = chatbox.scrollHeight;
        await new Promise(r=>setTimeout(r,2));
    }
    if(!typingStopped) box.innerHTML = formatMessage(text) + mediaHTML(image,file,preview,meta);
}
function stopTyping(){ typingStopped = true; }

function loadExternalScript(src){
    return new Promise((resolve, reject)=>{
        if(document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load " + src));
        document.head.appendChild(script);
    });
}
async function downloadSaivexPdf(id){
    const meta = window.saivexGeneratedFiles[id];
    if(!meta) return alert("PDF data missing. Please generate again.");
    try{
        await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit:"pt", format:"a4" });
        const margin = 46;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = 55;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(21);
        doc.text("SAIVEX", margin, y);
        y += 28;
        doc.setFontSize(15);
        doc.text(String(meta.file_name || "SAIVEX Document").replace(/\.pdf$/i, "").slice(0, 68), margin, y);
        y += 28;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const clean = String(meta.document_text || "").replace(/[#*_`>]/g, "");
        const lines = doc.splitTextToSize(clean, pageWidth - margin * 2);
        for(const line of lines){
            if(y > pageHeight - 45){ doc.addPage(); y = 50; }
            doc.text(line, margin, y);
            y += 14;
        }
        doc.save(meta.file_name || "saivex-document.pdf");
    }catch(err){
        console.error(err);
        alert("PDF library failed to load. Check internet connection/CDN and try again.");
    }
}
async function downloadSaivexPpt(id){
    const meta = window.saivexGeneratedFiles[id];
    if(!meta) return alert("PPT data missing. Please generate again.");
    try{
        await loadExternalScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");
        const pptx = new pptxgen();
        pptx.layout = "LAYOUT_WIDE";
        pptx.author = "SAIVEX";
        pptx.company = "SAIVEX";
        const slides = Array.isArray(meta.ppt_slides) && meta.ppt_slides.length ? meta.ppt_slides : [{title:"SAIVEX", bullets:["Generated by SAIVEX"]}];
        slides.slice(0, 12).forEach((item, index)=>{
            const slide = pptx.addSlide();
            slide.background = { color: "120600" };
            slide.addText("SAIVEX", { x:0.4, y:0.25, w:2.2, h:0.35, fontSize:14, bold:true, color:"FFBF3C" });
            slide.addShape(pptx.ShapeType.line, { x:0.4, y:0.72, w:12.4, h:0, line:{color:"FFBF3C", transparency:30} });
            slide.addText(String(item.title || `Slide ${index+1}`).slice(0,90), { x:0.75, y:1.0, w:11.7, h:0.75, fontSize:29, bold:true, color:"FFE7A3", fit:"shrink" });
            const bullets = (item.bullets || []).filter(Boolean).slice(0,6).map(b => ({ text:String(b).slice(0,210), options:{ bullet:{ type:"ul" } } }));
            slide.addText(bullets.length ? bullets : [{text:"Generated by SAIVEX", options:{bullet:{type:"ul"}}}], { x:1.0, y:2.0, w:11.1, h:4.3, fontSize:18, color:"FFFFFF", breakLine:false, fit:"shrink" });
            slide.addText(String(index+1), { x:12.25, y:6.83, w:0.5, h:0.25, fontSize:10, color:"FFBF3C" });
        });
        await pptx.writeFile({ fileName: meta.file_name || "saivex-presentation.pptx" });
    }catch(err){
        console.error(err);
        alert("PPTX library failed to load. Check internet connection/CDN and try again.");
    }
}

async function sendMessage(){
    const input = document.getElementById("message");
    const msg = input?.value.trim();
    if(!msg) return;
    lastUserMessage = msg;
    addUserMessage(msg);
    input.value = "";
    autoResize(input);
    const conv = ensureConversation();
    conv.messages.push({sender:"user", message:msg});
    if(conv.title === "New Chat") conv.title = msg.slice(0,40);
    saveState(); renderConversations();
    const botId = addBotShell();
    try{
        const response = await fetch("/api/chat", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                message:msg,
                conversation_id:activeConversationId,
                history:conv.messages.slice(-12),
                style:document.getElementById("imageStyle")?.value || "cinematic",
                ratio:document.getElementById("imageRatio")?.value || "1:1"
            })
        });
        const data = await response.json();
        const reply = data.reply || "No reply received.";
        const meta = {
            intent:data.intent,
            file_name:data.file_name,
            file_mime:data.file_mime,
            file_content:data.file_content,
            preview_content:data.preview_content,
            document_text:data.document_text,
            ppt_slides:data.ppt_slides,
            sources:data.sources || []
        };
        conv.messages.push({sender:"bot", message:reply, image:data.image || "", meta});
        saveState();
        await typeBotText(botId, reply, data.image || "", data.file_url || "", data.preview_url || "", meta);
        speakText(reply);
        loadConversations(); loadMemories(); loadDocuments();
    }catch(error){
        console.error(error);
        const box = document.getElementById(botId);
        if(box) box.innerHTML = "SAIVEX tool request failed. Open browser console and Cloudflare Functions logs for details.";
    }
}
function speakText(text){
    if(!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(String(text || "").slice(0, 700));
    const lang = document.getElementById("voiceLang")?.value || "en-US";
    speech.lang = lang;
    speech.rate = 1;
    speech.pitch = 1;
    speechSynthesis.speak(speech);
}
function startVoice(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){ alert("Speech recognition is not supported in this browser. Try Chrome."); return; }
    const rec = new SpeechRecognition();
    rec.lang = document.getElementById("voiceLang")?.value || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = e => { const text = e.results[0][0].transcript; setPrompt(text); };
    rec.onerror = e => alert("Voice error: " + e.error);
    rec.start();
}
function uploadFile(){ document.getElementById("fileInput")?.click(); }
function uploadImage(){ document.getElementById("imageInput")?.click(); }
function handleFileUpload(){
    const file = document.getElementById("fileInput")?.files?.[0];
    if(!file) return;
    documents.unshift({name:file.name, type:file.type || "file", time:new Date().toLocaleString()});
    saveState(); renderDocuments();
    addBotMessage(`File selected: ${file.name}\nFor full document analysis, upload-to-storage support will be connected after login/storage setup.`);
}
function handleImageUpload(){
    const file = document.getElementById("imageInput")?.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { addBotMessage("Image loaded. For vision analysis, use Camera/Vision or ask SAIVEX to explain this image after the vision endpoint is connected.", reader.result); };
    reader.readAsDataURL(file);
}
function toolPrompt(type){
    const templates = {
        ppt:"create ppt about ", pdf:"create pdf about ", website:"generate website about ", code:"write code for ", search:"search: ", agent:"agent: "
    };
    setPrompt(templates[type] || "");
}
function newChat(){ activeConversationId = null; localStorage.removeItem("saivex_active_conversation_id"); const chatbox=document.getElementById("chatbox"); if(chatbox) chatbox.innerHTML=""; ensureConversation(); renderConversations(); }
function clearHistory(){ if(confirm("Clear all SAIVEX local chat history?")){ conversations=[]; memories=[]; documents=[]; activeConversationId=null; saveState(); location.reload(); } }
function loadConversation(id){ activeConversationId = id; saveState(); const conv = conversations.find(c => String(c.id) === String(id)); const chatbox=document.getElementById("chatbox"); if(!conv || !chatbox) return; chatbox.innerHTML=""; for(const m of conv.messages){ if(m.sender === "user") addUserMessage(m.message); else addBotMessage(m.message, m.image || "", "", "", m.meta || {}); } closeSidebarMobile(); }
function renderConversations(){
    const panel = document.getElementById("conversationPanel"); if(!panel) return;
    const q = (document.getElementById("searchBox")?.value || "").toLowerCase();
    panel.innerHTML = "";
    conversations.filter(c => (c.title || "").toLowerCase().includes(q)).forEach(c => {
        panel.innerHTML += `<button class="panel-item" onclick="loadConversation('${c.id}')"><span>${c.icon || '💬'}</span><span>${htmlEscape(c.title || 'New Chat')}</span></button>`;
    });
}
function renderMemories(){ const p=document.getElementById("memoryPanel"); if(!p) return; p.innerHTML = memories.length ? memories.map(m=>`<div class="panel-item">🧠 ${htmlEscape(m.text || m)}</div>`).join("") : `<div class="panel-item">No memories yet</div>`; }
function renderDocuments(){ const p=document.getElementById("documentPanel"); if(!p) return; p.innerHTML = documents.length ? documents.map(d=>`<div class="panel-item">📄 ${htmlEscape(d.name || d)}</div>`).join("") : `<div class="panel-item">No documents yet</div>`; }
function loadConversations(){ renderConversations(); }
function loadMemories(){ renderMemories(); }
function loadDocuments(){ renderDocuments(); }
function autoResize(textarea){ if(!textarea) return; textarea.style.height="auto"; textarea.style.height=Math.min(textarea.scrollHeight, 180)+"px"; }
function openSaivexCamera(){ if(typeof window.openSaivexCamera === "function" && window.openSaivexCamera !== openSaivexCamera) return window.openSaivexCamera(); alert("Camera module is loading or not available yet."); }

document.addEventListener("DOMContentLoaded", ()=>{
    ensureConversation();
    renderConversations(); renderMemories(); renderDocuments();
    const input = document.getElementById("message");
    if(input){
        input.addEventListener("input", () => autoResize(input));
        input.addEventListener("keydown", e => { if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); } });
    }
    const drop = document.getElementById("dropZone");
    if(drop){
        drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("dragging"); });
        drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
        drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("dragging"); addBotMessage("Drag and drop detected. Full cloud upload will be enabled after storage setup."); });
    }
});
