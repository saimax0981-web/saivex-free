let saivexVoice13Active = false;
let saivexVoice13WakeMode = false;
let saivexVoice13Recognition = null;
let saivexVoice13Speaking = false;
let saivexVoice13Lang = "en-US";

function saivexVoice13Status(text){
    let el = document.getElementById("voiceStatus");
    if(!el){
        el = document.createElement("div");
        el.id = "voiceStatus";
        el.style.position = "fixed";
        el.style.right = "18px";
        el.style.bottom = "98px";
        el.style.zIndex = "9998";
        el.style.padding = "12px 16px";
        el.style.borderRadius = "16px";
        el.style.background = "rgba(10,5,1,.82)";
        el.style.color = "#fff0b1";
        el.style.border = "1px solid rgba(255,196,77,.28)";
        el.style.boxShadow = "0 0 30px rgba(255,191,60,.22)";
        el.style.fontFamily = "Poppins, sans-serif";
        el.style.fontSize = "13px";
        document.body.appendChild(el);
    }
    el.textContent = text;
}

function saivexVoice13Speak(text, lang="en-US"){
    if(!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    let speech = new SpeechSynthesisUtterance(text);
    speech.lang = lang;
    speech.rate = 1;
    speech.pitch = 1;

    saivexVoice13Speaking = true;
    speech.onend = () => {
        saivexVoice13Speaking = false;
        if(saivexVoice13Active){
            saivexVoice13Status("🎙️ Listening...");
        }
    };

    speechSynthesis.speak(speech);
}

function saivexVoice13StopSpeaking(){
    if("speechSynthesis" in window){
        speechSynthesis.cancel();
    }
    saivexVoice13Speaking = false;
    saivexVoice13Status("⏹️ Voice stopped");
}

function saivexVoice13CreateRecognition(){
    if(!("webkitSpeechRecognition" in window)){
        alert("Live voice works best in Google Chrome.");
        return null;
    }

    let recognition = new webkitSpeechRecognition();
    recognition.lang = saivexVoice13Lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        saivexVoice13Status(saivexVoice13WakeMode ? "👂 Wake mode: say Hey Saivex" : "🎙️ Listening...");
    };

    recognition.onresult = async (event) => {
        let finalText = "";
        let interimText = "";

        for(let i = event.resultIndex; i < event.results.length; i++){
            let transcript = event.results[i][0].transcript;
            if(event.results[i].isFinal){
                finalText += transcript;
            }else{
                interimText += transcript;
            }
        }

        if(interimText){
            saivexVoice13Status("Hearing: " + interimText);
        }

        if(finalText.trim()){
            let text = finalText.trim();

            if(saivexVoice13Speaking){
                saivexVoice13StopSpeaking();
            }

            if(saivexVoice13WakeMode){
                let low = text.toLowerCase();
                if(!low.includes("hey saivex") && !low.includes("saivex")){
                    saivexVoice13Status("👂 Waiting for Hey Saivex...");
                    return;
                }
                text = text.replace(/hey saivex/ig, "").replace(/saivex/ig, "").trim();
                if(!text){
                    saivexVoice13Status("Yes, Sai. Tell me.");
                    saivexVoice13Speak("Yes, Sai. Tell me.", saivexVoice13Lang);
                    return;
                }
            }

            await saivexVoice13Send(text);
        }
    };

    recognition.onerror = (event) => {
        console.log("Voice error:", event.error);
        saivexVoice13Status("Voice error: " + event.error);
    };

    recognition.onend = () => {
        if(saivexVoice13Active){
            setTimeout(() => {
                try{
                    saivexVoice13Recognition.start();
                }catch(e){}
            }, 400);
        }
    };

    return recognition;
}

async function saivexVoice13Send(text){
    addUserMessage("🎙️ " + text);
    saivexVoice13Status("🧠 SAIVEX thinking...");

    try{
        let response = await fetch("/voice_assistant", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                message:text,
                conversation_id:activeConversationId,
                style:document.getElementById("imageStyle").value,
                ratio:document.getElementById("imageRatio").value
            })
        });

        let data = await response.json();
        activeConversationId = data.conversation_id;

        addBotMessage(data.reply, data.image, data.file_url, data.preview_url);
        saivexVoice13Speak(data.speech || data.reply, data.lang || saivexVoice13Lang);

        loadConversations();
        loadMemories();
        loadDocuments();

    }catch(error){
        console.log(error);
        addBotMessage("Voice request failed. Please check terminal.");
        saivexVoice13Status("Voice request failed");
    }
}

function startSaivexVoice13(){
    saivexVoice13WakeMode = false;
    saivexVoice13Active = true;
    saivexVoice13Lang = document.getElementById("voiceLang")?.value || "en-US";

    saivexVoice13Recognition = saivexVoice13CreateRecognition();
    if(saivexVoice13Recognition){
        saivexVoice13Recognition.start();
    }
}

function startSaivexWakeMode(){
    saivexVoice13WakeMode = true;
    saivexVoice13Active = true;
    saivexVoice13Lang = document.getElementById("voiceLang")?.value || "en-US";

    saivexVoice13Recognition = saivexVoice13CreateRecognition();
    if(saivexVoice13Recognition){
        saivexVoice13Recognition.start();
    }
}

function stopSaivexVoice13(){
    saivexVoice13Active = false;
    saivexVoice13WakeMode = false;

    if(saivexVoice13Recognition){
        saivexVoice13Recognition.stop();
    }

    saivexVoice13StopSpeaking();
    saivexVoice13Status("⏹️ Voice assistant stopped");
}

function interruptSaivexVoice13(){
    saivexVoice13StopSpeaking();
    saivexVoice13Status("🎙️ Interrupted. Listening...");
}
