import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const firebaseConfig = window.SAIVEX_FIREBASE_CONFIG;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let confirmationResult = null;

function setStatus(text){
    document.getElementById("status").innerText = text;
}

function setupRecaptcha(){
    if(window.recaptchaVerifier) return;

    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "normal",
        callback: () => setStatus("reCAPTCHA verified. You can send OTP."),
        "expired-callback": () => setStatus("reCAPTCHA expired. Refresh the page.")
    });
}

window.sendPhoneOTP = async function(){
    const phoneNumber = document.getElementById("phoneNumber").value.trim();

    if(!phoneNumber.startsWith("+")){
        setStatus("Use country code. Example: +91XXXXXXXXXX");
        return;
    }

    try{
        setupRecaptcha();
        setStatus("Sending OTP...");
        confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        document.getElementById("phoneBox").style.display = "none";
        document.getElementById("otpBox").style.display = "block";
        setStatus("OTP sent successfully.");
    }catch(error){
        console.log(error);
        setStatus("OTP failed: " + error.message);
    }
};

window.verifyPhoneOTP = async function(){
    const otp = document.getElementById("otpCode").value.trim();

    if(!confirmationResult){
        setStatus("Send OTP first.");
        return;
    }

    if(!otp){
        setStatus("Enter OTP.");
        return;
    }

    try{
        setStatus("Verifying OTP...");
        const result = await confirmationResult.confirm(otp);
        const user = result.user;
        const idToken = await user.getIdToken();

        const response = await fetch("/phone_login_complete", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({idToken:idToken, phone:user.phoneNumber})
        });

        const data = await response.json();

        if(data.status === "success"){
            setStatus("Login successful. Opening SAIVEX...");
            window.location.href = data.redirect || "/";
        }else{
            setStatus(data.message || "Login failed.");
        }
    }catch(error){
        console.log(error);
        setStatus("Verification failed: " + error.message);
    }
};

window.goBackToPhone = function(){
    document.getElementById("otpBox").style.display = "none";
    document.getElementById("phoneBox").style.display = "block";
    setStatus("");
};
