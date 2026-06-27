let conversations = JSON.parse(localStorage.getItem("saivex_conversations") || "[]");
let memories = JSON.parse(localStorage.getItem("saivex_memories") || "[]");
let documents = JSON.parse(localStorage.getItem("saivex_documents") || "[]");
let activeConversationId = localStorage.getItem("saivex_active_conversation_id") || null;
let lastUserMessage = "";
let typingStopped = false;

function saveState(){
    localStorage.setItem("saivex_conversations", JSON.stringify(conversations));
    localStorage.setItem("saivex_memories", JSON.stringify(memories));
    localStorage.setItem("saivex_documents", JSON.stringify(documents));
    if(activeConversationId) localStorage.setItem("saivex_active_conversation_id", activeConversationId);
}
function ensureConversation(){
    if(activeConversationId){ const existing = conversations.find(c => String(c.id) === String(activeConversationId)); if(existing) return existing; }
    const c = {id: Date.now(), title:"New Chat", icon:"💬", folder:"General", messages:[]};
    conversations.unshift(c); activeConversationId = c.id; saveState(); return c;
}
function toggleSidebar(){ document.getElementById("sidebar")?.classList.toggle("open"); document.getElementById("overlay")?.classList.toggle("show"); }
function closeSidebarMobile(){ if(window.innerWidth <= 800){ document.getElementById("sidebar")?.classList.remove("open"); document.getElementById("overlay")?.classList.remove("show"); } }
function setPrompt(text){ const input = document.getElementById("message"); if(input){ input.value = text; input.focus(); autoResize(input); } }
function hideEmptyState(){ document.getElementById("emptyState")?.remove(); }
function formatMessage(text){ return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replace(/\*\*(.*?)\*\*/g,"<b>$1</b>").replace(/```([\s\S]*?)```/g,"<pre><code>$1</code></pre>").replace(/\n/g,"<br>"); }
function blobUrl(content, mime){
    if(content instanceof Blob) return URL.createObjectURL(content);
    return URL.createObjectURL(new Blob([content], {type:mime || "text/plain"}));
}
function mediaHTML(image="", file="", preview="", meta={}){
    let extra = "";
    if(image){ extra += `<br><br><img src="${image}" class="generated-image"><div class="image-actions"><a href="${image}" target="_blank" class="view-btn">View</a><a href="${image}" download class="download-btn">Download</a></div>`; }
    let fileUrl = file, previewUrl = preview;
    if(meta.file_content) fileUrl = blobUrl(meta.file_content, meta.file_mime || "text/plain");
    if(meta.preview_content) previewUrl = blobUrl(meta.preview_content, "text/html");
    if(fileUrl || previewUrl){
        extra += `<div class="file-actions">`;
        if(fileUrl) extra += `<a href="${fileUrl}" download="${meta.file_name || 'saivex-file.txt'}" class="file-btn">Download File</a>`;
        if(previewUrl) extra += `<a href="${previewUrl}" target="_blank" class="preview-btn">Preview</a>`;
        extra += `</div>`;
    }
    return extra;
}
function addUserMessage(message){ hideEmptyState(); const chatbox = document.getElementById("chatbox"); if(!chatbox) return; chatbox.innerHTML += `<div class="message-row"><div class="user">${formatMessage(message)}</div></div>`; chatbox.scrollTop = chatbox.scrollHeight; }
function addBotMessage(message, image="", file="", preview="", meta={}){ hideEmptyState(); const chatbox = document.getElementById("chatbox"); if(!chatbox) return; chatbox.innerHTML += `<div class="message-row"><div class="bot">${formatMessage(message)}${mediaHTML(image,file,preview,meta)}</div></div>`; chatbox.scrollTop = chatbox.scrollHeight; }
function addBotShell(){ hideEmptyState(); const id = "bot_" + Date.now(); const chatbox = document.getElementById("chatbox"); if(!chatbox) return id; chatbox.innerHTML += `<div class="message-row"><div class="bot" id="${id}"><span class="thinking">SAIVEX is thinking...</span></div></div>`; chatbox.scrollTop = chatbox.scrollHeight; return id; }
async function typeBotText(id, text, image="", file="", preview="", meta={}){ typingStopped=false; const box=document.getElementById(id); if(!box){ addBotMessage(text,image,file,preview,meta); return; } let output=""; text=String(text||""); for(let i=0;i<text.length;i++){ if(typingStopped) break; output+=text[i]; box.innerHTML=formatMessage(output); const chatbox=document.getElementById("chatbox"); if(chatbox) chatbox.scrollTop=chatbox.scrollHeight; await new Promise(r=>setTimeout(r,3)); } if(!typingStopped) box.innerHTML=formatMessage(text)+mediaHTML(image,file,preview,meta); }
function stopTyping(){ typingStopped=true; }

function loadExternalScript(src){
    return new Promise((resolve, reject)=>{
        if(document.querySelector(`script[src="${src}"]`)) return resolve();
        const script=document.createElement("script");
        script.src=src; script.onload=resolve; script.onerror=reject;
        document.head.appendChild(script);
    });
}

async function createSaivexPdfBlob(text, title="SAIVEX Document"){
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SAIVEX", margin, y);
    y += 28;
    doc.setFontSize(15);
    doc.text(title.slice(0, 70), margin, y);
    y += 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const clean = String(text || "").replace(/[#*_`>-]/g, "");
    const lines = doc.splitTextToSize(clean, pageWidth - margin * 2);
    for(const line of lines){
        if(y > pageHeight - 55){ doc.addPage(); y = 55; }
        doc.text(line, margin, y);
        y += 15;
    }
    return doc.output("blob");
}

async function createSaivexPptBlob(slides, title="SAIVEX Presentation"){
    await loadExternalScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "SAIVEX";
    pptx.subject = title;
    const safeSlides = Array.isArray(slides) && slides.length ? slides : [{title, bullets:["Generated by SAIVEX"]}];
    safeSlides.slice(0, 12).forEach((item, index)=>{
        const slide = pptx.addSlide();
        slide.background = { color: "120600" };
        slide.addText("SAIVEX", { x:0.4, y:0.25, w:2, h:0.3, fontSize:13, bold:true, color:"FFBF3C" });
        slide.addText(String(item.title || `Slide ${index+1}`).slice(0,80), { x:0.7, y:0.9, w:11.8, h:0.8, fontSize:30, bold:true, color:"FFE7A3" });
        const bullets = (item.bullets || []).slice(0,6).map(b=>({ text:String(b).slice(0,180), options:{ bullet:{type:"ul"} } }));
        slide.addText(bullets.length ? bullets : [{text:"Generated by SAIVEX", options:{bullet:{type:"ul"}}}], { x:1.0, y:2.0, w:11.2, h:4.4, fontSize:18, color:"FFFFFF", breakLine:false, fit:"shrink" });
        slide.addText(String(index+1), { x:12.3, y:6.8, w:0.5, h:0.2, fontSize:10, color:"FFBF3C" });
    });
    return await pptx.write("blob");
}

async function buildRealDownloadIfNeeded(data){
    const meta={file_content:data.file_content,file_mime:data.file_mime,file_name:data.file_name,preview_content:data.preview_content};
    try{
        if(data.intent === "pdf" && data.document_text){
            meta.file_content = await createSaivexPdfBlob(data.document_text, data.file_name || "SAIVEX Document");
            meta.file_mime = "application/pdf";
            meta.file_name = data.file_name || "saivex-document.pdf";
        }
        if(data.intent === "ppt" && data.ppt_slides){
            meta.file_content = await createSaivexPptBlob(data.ppt_slides, data.file_name || "SAIVEX Presentation");
            meta.file_mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            meta.file_name = data.file_name || "saivex-presentation.pptx";
        }
    }catch(err){
        console.error("File generation failed", err);
        if(data.preview_content && !meta.file_content){
            meta.file_content = data.preview_content;
            meta.file_mime = "text/html";
            meta.file_name = (data.file_name || "saivex-file.html").replace(/\.(pdf|pptx)$/i,".html");
        }
    }
    return meta;
}

async function sendMessage(){
    const input=document.getElementById("message"); const msg=input?.value.trim(); if(!msg) return;
    lastUserMessage=msg; addUserMessage(msg); input.value=""; autoResize(input);
    const conv=ensureConversation(); conv.messages.push({sender:"user", message:msg}); if(conv.title==="New Chat") conv.title=msg.slice(0,40); saveState(); renderConversations();
    const botId=addBotShell();
    try{
        const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,conversation_id:activeConversationId,history:conv.messages.slice(-12),style:document.getElementById("imageStyle")?.value||"cinematic",ratio:document.getElementById("imageRatio")?.value||"1:1"})});
        const data=await response.json(); const reply=data.reply||"No reply received.";
        const meta=await buildRealDownloadIfNeeded(data);
        conv.messages.push({sender:"bot",message:reply,image:data.image||"",file_url:data.file_url||"",preview_url:data.preview_url||"",meta}); saveState();
        await typeBotText(botId,reply,data.image,data.file_url,data.preview_url,meta); speakText(reply); loadConversations(); loadMemories(); loadDocuments();
    }catch(error){ console.log(error); const box=document.getElementById(botId); if(box) box.innerHTML="SAIVEX tool request failed. Check Cloudflare deployment and environment variables."; }
}
function speakText(text){ if(!("speechSynthesis" in window)) return; speechSynthesis.cancel(); const speech=new SpeechSynthesisUtterance(String(text||"").replace(/```[\s\S]*?```/g,"code block")); speech.lang=document.getElementById("voiceLang")?.value||"en-US"; speech.rate=1; speech.pitch=1; speechSynthesis.speak(speech); }
function startVoice(){ const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SpeechRecognition){ alert("Voice works best in Google Chrome."); return; } const recognition=new SpeechRecognition(); recognition.lang=document.getElementById("voiceLang")?.value||"en-US"; recognition.start(); recognition.onresult=e=>{ document.getElementById("message").value=e.results[0][0].transcript; }; recognition.onend=()=>{}; }
function uploadFile(){ document.getElementById("fileInput")?.click(); }
function uploadImage(){ document.getElementById("imageInput")?.click(); }
async function handleFileUpload(){ const input=document.getElementById("fileInput"); if(!input||!input.files.length) return; const file=input.files[0]; addUserMessage("Uploaded document: "+file.name); const botId=addBotShell(); documents.unshift({id:Date.now(),filename:file.name}); saveState(); await typeBotText(botId,"Document selected. Ask SAIVEX to summarize it after we connect advanced document extraction. For now, TXT files can be pasted directly into chat."); input.value=""; loadDocuments(); }
async function analyzeImageData(imageData, label="Uploaded image"){
    addUserMessage(label); const botId=addBotShell();
    try{ const response=await fetch("/api/vision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageData,question:"Analyze this image clearly and helpfully."})}); const data=await response.json(); await typeBotText(botId,data.reply||"No vision reply.",imageData); const conv=ensureConversation(); conv.messages.push({sender:"bot",message:data.reply||"Image analyzed.",image:imageData}); saveState(); }
    catch(e){ await typeBotText(botId,"Vision request failed. Check OpenRouter vision model access.",imageData); }
}
async function handleImageUpload(){ const input=document.getElementById("imageInput"); if(!input||!input.files.length) return; const image=input.files[0]; const reader=new FileReader(); reader.onload=()=>analyzeImageData(reader.result,"Uploaded image: "+image.name); reader.readAsDataURL(image); input.value=""; }
async function loadConversations(){ conversations=JSON.parse(localStorage.getItem("saivex_conversations")||"[]"); renderConversations(); }
function renderConversations(){ const panel=document.getElementById("conversationPanel"); if(!panel) return; const search=(document.getElementById("searchBox")?.value||"").toLowerCase(); panel.innerHTML=""; const filtered=conversations.filter(c=>(c.title||"").toLowerCase().includes(search)||(c.folder||"").toLowerCase().includes(search)); if(!filtered.length){ panel.innerHTML=`<div class="conversation-item">No chats found.</div>`; return; } filtered.forEach(c=>{ const active=String(c.id)===String(activeConversationId)?" active":""; panel.innerHTML+=`<div class="conversation-item${active}" onclick="openConversation(${c.id})"><span>${c.icon||"💬"}</span><span class="conv-title">${formatMessage(c.title||"New Chat")}</span></div>`; }); }
async function openConversation(id){ activeConversationId=id; localStorage.setItem("saivex_active_conversation_id",id); const c=conversations.find(x=>String(x.id)===String(id)); document.getElementById("chatbox").innerHTML=""; (c?.messages||[]).forEach(m=>{ if(m.sender==="user") addUserMessage(m.message); else addBotMessage(m.message,m.image,m.file_url,m.preview_url,m.meta||{}); }); closeSidebarMobile(); renderConversations(); }
async function newChat(){ const c={id:Date.now(),title:"New Chat",icon:"💬",folder:"General",messages:[]}; conversations.unshift(c); activeConversationId=c.id; saveState(); document.getElementById("chatbox").innerHTML=`<div class="empty-state" id="emptyState"><h2>New Chat</h2><p>Start a new conversation with SAIVEX.</p></div>`; loadConversations(); closeSidebarMobile(); }
async function clearHistory(){ if(!confirm("Delete this chat?")) return; conversations=conversations.filter(c=>String(c.id)!==String(activeConversationId)); activeConversationId=null; saveState(); document.getElementById("chatbox").innerHTML=""; loadConversations(); }
async function loadMemories(){ memories=JSON.parse(localStorage.getItem("saivex_memories")||"[]"); const panel=document.getElementById("memoryPanel"); if(!panel) return; panel.innerHTML=""; if(!memories.length){ panel.innerHTML=`<div class="memory-box"><div class="memory-text">No memories yet.</div></div>`; return; } memories.forEach(m=>panel.innerHTML+=`<div class="memory-box"><div class="memory-text">${formatMessage(m.value)}</div><button class="delete-memory" onclick="deleteMemory(${m.id})">x</button></div>`); }
async function deleteMemory(id){ memories=memories.filter(m=>m.id!==id); saveState(); loadMemories(); }
async function loadDocuments(){ documents=JSON.parse(localStorage.getItem("saivex_documents")||"[]"); const panel=document.getElementById("documentPanel"); if(!panel) return; panel.innerHTML=""; if(!documents.length){ panel.innerHTML=`<div class="document-box"><div class="document-text">No documents.</div></div>`; return; } documents.forEach(d=>panel.innerHTML+=`<div class="document-box"><div class="document-text">${formatMessage(d.filename)}</div><button class="delete-document" onclick="deleteDocument(${d.id})">x</button></div>`); }
async function deleteDocument(id){ documents=documents.filter(d=>d.id!==id); saveState(); loadDocuments(); }
function toolPrompt(type){ const map={ppt:"create ppt about ",pdf:"create pdf about ",website:"create website for ",code:"write code for ",search:"search: ",vision:"explain my uploaded image",agent:"agent: create a full plan for "}; setPrompt(map[type]||""); }
function autoResize(el){ if(!el) return; el.style.height="auto"; el.style.height=Math.min(el.scrollHeight,160)+"px"; }
function applyLoggedInUser(){ const user=JSON.parse(localStorage.getItem("saivex_user")||"null"); const name=user?.name||user?.email||"Sai Venkat"; document.querySelectorAll(".profile-name,#profileName").forEach(e=>e.textContent=name); }
window.addEventListener("DOMContentLoaded",()=>{ const msg=document.getElementById("message"); if(msg){ msg.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); }}); msg.addEventListener("input",()=>autoResize(msg)); } applyLoggedInUser(); loadConversations(); loadMemories(); loadDocuments(); });
