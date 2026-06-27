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
    if(activeConversationId){
        let existing = conversations.find(c => String(c.id) === String(activeConversationId));
        if(existing) return existing;
    }
    let c = {id: Date.now(), title:"New Chat", icon:"💬", folder:"General", messages:[]};
    conversations.unshift(c);
    activeConversationId = c.id;
    saveState();
    return c;
}

function toggleSidebar(){
    document.getElementById("sidebar")?.classList.toggle("open");
    document.getElementById("overlay")?.classList.toggle("show");
}

function closeSidebarMobile(){
    if(window.innerWidth <= 800){
        document.getElementById("sidebar")?.classList.remove("open");
        document.getElementById("overlay")?.classList.remove("show");
    }
}

function setPrompt(text){
    const input = document.getElementById("message");
    if(input){ input.value = text; input.focus(); }
}

function hideEmptyState(){
    let empty = document.getElementById("emptyState");
    if(empty) empty.remove();
}

function formatMessage(text){
    return String(text || "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replace(/\*\*(.*?)\*\*/g,"<b>$1</b>")
        .replace(/\n/g,"<br>");
}

function addUserMessage(message){
    hideEmptyState();
    let chatbox = document.getElementById("chatbox");
    if(!chatbox) return;
    chatbox.innerHTML += `<div class="message-row"><div class="user">${formatMessage(message)}</div></div>`;
    chatbox.scrollTop = chatbox.scrollHeight;
}

function mediaHTML(image="", file="", preview=""){
    let extra = "";
    if(image){
        extra += `<br><br><img src="${image}" class="generated-image"><div class="image-actions"><a href="${image}" target="_blank" class="view-btn">View</a><a href="${image}" download class="download-btn">Download</a></div>`;
    }
    if(file || preview){
        extra += `<div class="file-actions">`;
        if(file) extra += `<a href="${file}" target="_blank" class="file-btn">Download File</a>`;
        if(preview) extra += `<a href="${preview}" target="_blank" class="preview-btn">Preview</a>`;
        extra += `</div>`;
    }
    return extra;
}

function addBotMessage(message, image="", file="", preview=""){
    hideEmptyState();
    let chatbox = document.getElementById("chatbox");
    if(!chatbox) return;
    chatbox.innerHTML += `<div class="message-row"><div class="bot">${formatMessage(message)}${mediaHTML(image,file,preview)}</div></div>`;
    chatbox.scrollTop = chatbox.scrollHeight;
}

function addBotShell(){
    hideEmptyState();
    let id = "bot_" + Date.now();
    let chatbox = document.getElementById("chatbox");
    if(!chatbox) return id;
    chatbox.innerHTML += `<div class="message-row"><div class="bot" id="${id}"><span class="thinking">SAIVEX is thinking...</span></div></div>`;
    chatbox.scrollTop = chatbox.scrollHeight;
    return id;
}

async function typeBotText(id, text, image="", file="", preview=""){
    typingStopped = false;
    let box = document.getElementById(id);
    if(!box){ addBotMessage(text, image, file, preview); return; }
    let output = "";
    text = String(text || "");
    for(let i=0; i<text.length; i++){
        if(typingStopped) break;
        output += text[i];
        box.innerHTML = formatMessage(output);
        const chatbox = document.getElementById("chatbox");
        if(chatbox) chatbox.scrollTop = chatbox.scrollHeight;
        await new Promise(r => setTimeout(r, 5));
    }
    if(!typingStopped) box.innerHTML = formatMessage(text) + mediaHTML(image, file, preview);
}

function stopTyping(){ typingStopped = true; }

async function sendMessage(){
    let input = document.getElementById("message");
    let msg = input?.value.trim();
    if(!msg) return;
    lastUserMessage = msg;
    addUserMessage(msg);
    input.value = "";
    let conv = ensureConversation();
    conv.messages.push({sender:"user", message:msg});
    if(conv.title === "New Chat") conv.title = msg.slice(0, 40);
    saveState();
    renderConversations();
    let botId = addBotShell();
    try{
        let response = await fetch("/api/chat", {
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
        let data = await response.json();
        let reply = data.reply || "No reply received.";
        conv.messages.push({sender:"bot", message:reply, image:data.image || "", file_url:data.file_url || "", preview_url:data.preview_url || ""});
        saveState();
        await typeBotText(botId, reply, data.image, data.file_url, data.preview_url);
        speakText(reply);
        loadConversations(); loadMemories(); loadDocuments();
    }catch(error){
        console.log(error);
        let box = document.getElementById(botId);
        if(box) box.innerHTML = "AI is not connected yet. Deploy on Cloudflare Pages and add OPENROUTER_API_KEY.";
    }
}

function speakText(text){
    if(!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    let speech = new SpeechSynthesisUtterance(String(text || ""));
    speech.lang = "en-US"; speech.rate = 1; speech.pitch = 1;
    speechSynthesis.speak(speech);
}

function startVoice(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){ alert("Voice works best in Google Chrome."); return; }
    let recognition = new SpeechRecognition();
    recognition.lang = document.getElementById("voiceLang")?.value || "en-US";
    recognition.start();
    recognition.onresult = event => { document.getElementById("message").value = event.results[0][0].transcript; };
}

function uploadFile(){ document.getElementById("fileInput")?.click(); }
function uploadImage(){ document.getElementById("imageInput")?.click(); }

async function handleFileUpload(){
    let input = document.getElementById("fileInput");
    if(!input || input.files.length === 0) return;
    let file = input.files[0];
    addUserMessage("Uploaded document: " + file.name);
    let botId = addBotShell();
    documents.unshift({id:Date.now(), filename:file.name});
    saveState();
    await typeBotText(botId, "File selected and saved in this browser. Full cloud upload will be connected with Cloudinary/Supabase in the next phase.");
    input.value = ""; loadDocuments();
}

async function handleImageUpload(){
    let input = document.getElementById("imageInput");
    if(!input || input.files.length === 0) return;
    let image = input.files[0];
    addUserMessage("Uploaded image: " + image.name);
    let botId = addBotShell();
    let reader = new FileReader();
    reader.onload = async () => {
        await typeBotText(botId, "Image preview saved in this browser. Cloud image analysis will be connected in the next phase.", reader.result);
        let conv = ensureConversation();
        conv.messages.push({sender:"bot", message:"Image preview saved in this browser.", image:reader.result});
        saveState(); loadConversations();
    };
    reader.readAsDataURL(image);
    input.value = "";
}

async function loadConversations(){ conversations = JSON.parse(localStorage.getItem("saivex_conversations") || "[]"); renderConversations(); }

function renderConversations(){
    let panel = document.getElementById("conversationPanel"); if(!panel) return;
    let search = (document.getElementById("searchBox")?.value || "").toLowerCase();
    panel.innerHTML = "";
    let filtered = conversations.filter(c => (c.title||"").toLowerCase().includes(search) || (c.folder||"").toLowerCase().includes(search));
    if(filtered.length === 0){ panel.innerHTML = `<div class="conversation-item">No chats found.</div>`; return; }
    filtered.forEach(c => {
        let active = String(c.id) === String(activeConversationId) ? " active" : "";
        panel.innerHTML += `<div class="conversation-item${active}" onclick="openConversation(${c.id})"><span>${c.icon || "💬"}</span><span class="conv-title">${formatMessage(c.title || "New Chat")}</span></div>`;
    });
}

async function openConversation(id){
    activeConversationId = id;
    localStorage.setItem("saivex_active_conversation_id", id);
    let c = conversations.find(x => String(x.id) === String(id));
    document.getElementById("chatbox").innerHTML = "";
    (c?.messages || []).forEach(m => {
        if(m.sender === "user") addUserMessage(m.message);
        else addBotMessage(m.message, m.image, m.file_url, m.preview_url);
    });
    closeSidebarMobile(); renderConversations();
}

async function newChat(){
    let c = {id: Date.now(), title:"New Chat", icon:"💬", folder:"General", messages:[]};
    conversations.unshift(c); activeConversationId = c.id; saveState();
    document.getElementById("chatbox").innerHTML = `<div class="empty-state" id="emptyState"><h2>New Chat</h2><p>Start a new conversation with SAIVEX.</p></div>`;
    loadConversations(); closeSidebarMobile();
}

async function clearHistory(){
    if(!activeConversationId) return;
    if(!confirm("Delete this chat?")) return;
    conversations = conversations.filter(c => String(c.id) !== String(activeConversationId));
    activeConversationId = null; saveState();
    document.getElementById("chatbox").innerHTML = ""; loadConversations();
}

async function loadMemories(){
    memories = JSON.parse(localStorage.getItem("saivex_memories") || "[]");
    let panel = document.getElementById("memoryPanel"); if(!panel) return;
    panel.innerHTML = "";
    if(memories.length === 0){ panel.innerHTML = `<div class="memory-box"><div class="memory-text">No memories yet.</div></div>`; return; }
    memories.forEach(m => { panel.innerHTML += `<div class="memory-box"><div class="memory-text">${formatMessage(m.value)}</div><button class="delete-memory" onclick="deleteMemory(${m.id})">x</button></div>`; });
}

async function deleteMemory(id){ memories = memories.filter(m => m.id !== id); saveState(); loadMemories(); }

async function loadDocuments(){
    documents = JSON.parse(localStorage.getItem("saivex_documents") || "[]");
    let panel = document.getElementById("documentPanel"); if(!panel) return;
    panel.innerHTML = "";
    if(documents.length === 0){ panel.innerHTML = `<div class="document-box"><div class="document-text">No documents.</div></div>`; return; }
    documents.forEach(d => { panel.innerHTML += `<div class="document-box"><div class="document-text">${formatMessage(d.filename)}</div><button class="delete-document" onclick="deleteDocument(${d.id})">x</button></div>`; });
}

async function deleteDocument(id){ documents = documents.filter(d => d.id !== id); saveState(); loadDocuments(); }

function toolPrompt(type){
    if(type === "ppt") setPrompt("create ppt about ");
    if(type === "pdf") setPrompt("create pdf about ");
    if(type === "website") setPrompt("create website for ");
    if(type === "code") setPrompt("run code: print('Hello from SAIVEX')");
    if(type === "search") setPrompt("search: ");
    if(type === "vision") setPrompt("explain my uploaded image");
    if(type === "agent") setPrompt("agent: ");
}

window.addEventListener("DOMContentLoaded", () => {
    const msg = document.getElementById("message");
    if(msg){ msg.addEventListener("keydown", e => { if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); } }); }
    loadConversations(); loadMemories(); loadDocuments();
});
