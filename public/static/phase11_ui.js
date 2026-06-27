document.addEventListener("DOMContentLoaded", () => {
    const messageBox = document.getElementById("message");
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const imageInput = document.getElementById("imageInput");

    if(messageBox){
        messageBox.addEventListener("input", () => {
            messageBox.style.height = "auto";
            messageBox.style.height = Math.min(messageBox.scrollHeight, 120) + "px";
        });
    }

    if(dropZone){
        ["dragenter","dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                dropZone.classList.add("dragging");
            });
        });

        ["dragleave","drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                dropZone.classList.remove("dragging");
            });
        });

        dropZone.addEventListener("drop", async e => {
            const file = e.dataTransfer.files[0];
            if(!file) return;

            const imageTypes = ["image/png","image/jpeg","image/jpg","image/webp"];

            if(imageTypes.includes(file.type)){
                const dt = new DataTransfer();
                dt.items.add(file);
                imageInput.files = dt.files;
                handleImageUpload();
            }else{
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                handleFileUpload();
            }
        });
    }
});
