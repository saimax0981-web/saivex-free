let saivexVoiceActive = false;
let saivexRecognition = null;

function speakSaivex(text){
    if(!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    let speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    speechSynthesis.speak(speech);
}

function startVoiceConversation(){
    if(!("webkitSpeechRecognition" in window)){
        alert("Voice conversation works best in Chrome.");
        return;
    }

    saivexVoiceActive = true;
    saivexRecognition = new webkitSpeechRecognition();
    saivexRecognition.lang = "en-US";
    saivexRecognition.continuous = true;
    saivexRecognition.interimResults = false;

    saivexRecognition.onresult = async function(event){
        let text = event.results[event.results.length - 1][0].transcript;
        document.getElementById("message").value = text;

        let response = await fetch("/voice_chat", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({message:text})
        });

        let data = await response.json();

        addUserMessage(text);
        addBotMessage(data.reply);
        speakSaivex(data.reply);
    };

    saivexRecognition.onend = function(){
        if(saivexVoiceActive){
            saivexRecognition.start();
        }
    };

    saivexRecognition.start();
    alert("SAIVEX Voice Conversation started.");
}

function stopVoiceConversation(){
    saivexVoiceActive = false;
    if(saivexRecognition){
        saivexRecognition.stop();
    }
    speechSynthesis.cancel();
    alert("SAIVEX Voice Conversation stopped.");
}
