window.addEventListener("popstate", function (event) {
    // Refresh the page
    window.location.reload();
});

// Push the current state to the history stack
history.pushState(null, document.title, window.location.href);

function toggleSound() {
    var soundLink = document.getElementById("sound-toggle");
    var icon = soundLink.querySelector("i");

    if (soundLink.innerText.includes("Sound On")) {
        soundLink.innerHTML = '<i class="bi bi-volume-mute me-2"></i> Sound Off';
    } else {
        soundLink.innerHTML = '<i class="bi bi-volume-up me-2"></i> Sound On';
    }
}



function handleButtonClick(button) {
    var buttonText = button.innerText.trim(); // Get text inside the button
    sendMessage(buttonText); // Call sendMessage with button text
}

async function sendMessage(userMessage=null) {
    if (!userMessage) {
        userMessage = document.getElementById("user-input").value.trim(); // Get input field value
    }
    if (userMessage !== "") {
        displayMessage(userMessage, "user");

        var botResponse =await getApiResponse(userMessage);
        if (botResponse !== null){
            displayMessage(botResponse, "bot");
        }

        document.getElementById("user-input").value = ""; // Clear input
    }
}

var chatSocket = null;  // Initialize WebSocket variable as null
var room_id = "room_" + Date.now().toString();  // Generate a unique room ID

function room_closed() {
    if (!room_id) {
        console.error("No room is currently active.");
        return;
    }

    let formData = new FormData();
    formData.append("room_id", room_id);

    fetch("/room_update_status/", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "Success") {
            showToast({
                eleWrapper: "#toastContainer",
                msg: "Chat marked as completed!",
                theme: "success",
                autoClose: true,
                autoCloseTime: 2000
            });
        }
    })
    .catch(error => console.error("Error updating status:", error));
}

function showToast(option) {
    var wrapper = document.querySelector(option.eleWrapper);
    if (!wrapper) {
        console.error("Toast wrapper element not found!");
        return;
    }

    var toast = document.createElement("div");
    toast.className = "hs-toast hs-theme-" + option.theme.toLowerCase();
    toast.innerHTML = `
        <div class="hs-toast-inner">
            <div class="hs-toast-msg">${option.msg}</div>
        </div>`;

    wrapper.appendChild(toast);
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.5s";
    setTimeout(() => { toast.style.opacity = "1"; }, 10);

    if (option.autoClose) {
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 500);
        }, option.autoCloseTime || 2000);
    }
}

let peerConnection;
const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};
let pendingICECandidates = [];

function connectWebSocket() {
    document.getElementById("fileInput").disabled = false;
    document.getElementById("chatcomplete").disabled = false;
    document.getElementById("record").disabled = false;
    let chats = document.getElementById("chatMessages"); // Get the chat container
    if (!chats) {
        console.error("Chat container not found!");
        return;
    }
    let chatHTML = chats.innerHTML; // Get chat content as HTML

    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = chatHTML; 

    let chatData = []; 

    tempDiv.querySelectorAll(".support-message, .user-message").forEach(elem => {
        let text = elem.textContent.trim();
        let sender = elem.classList.contains("support-message") ? "bot" : "user";

        if (sender === "user") {
            text = text.replace(/^You\s*:\s*/, "").trim();
        }
    
        if (text !== "" && !elem.querySelector("button") && !elem.querySelector("img") && !elem.querySelector(".domain")) {
            chatData.push({
                room_id: room_id, // Assuming room_id is globally available
                content: text,
                sender: sender
            });
        }
    });
    
    console.log("Chat Messages (Ordered Flow):", chatData);

    if (!chatSocket || chatSocket.readyState === WebSocket.CLOSED) { 
        // Create WebSocket only if not already open
        chatSocket = new WebSocket(`ws://${window.location.host}/ws/chat/${room_id}/`);

        chatSocket.onopen = function() {
            console.log("WebSocket connection established.");
            fetch("/save_messages/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: chatData })
            })
            .then(response => response.json())
            .then(data => {
                console.log("Messages saved:", data);
            })
            .catch(error => console.error("Error saving messages:", error));

            var userMessage = document.getElementById("user-input").value.trim();
            chatSocket.send(JSON.stringify({
                'message': userMessage,
                'sender': 'user'
            }));
            document.getElementById("user-input").value = '';
        };

        chatSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            if (data.message_type === "file_upload"){
                var fileElement = `<a href="${data.file_url}" target="_blank" style="color:black;">${data.filename}</a>`
                if(data.sender == "user"){
                    displayMessage_support(fileElement, "user");
                }else{
                    displayMessage_support(fileElement, "bot");
                }
                
            }else if(data.message_type === "audio_upload"){
                var fileElement = `<audio src="${data.file_url}" controls>${data.filename}</audio>`
                if(data.sender == "user"){
                    displayMessage_support(fileElement, "user");
                }else{
                    displayMessage_support(fileElement, "bot");
                }
                
            }else if (data.message_type === "offer"){
                if(data.sender=="employee"){
                    showIncomingCallPopup(data.message);
                }
            }else if (data.message_type === "request"){
                if(data.sender=="employee"){
                    request_screen();
                }
            }
           else if (data.message_type === "answer"){
               if(data.sender=="employee"){
                    handleAnswer(data.message);
               }
            }
           else if (data.message_type === "ice-candidate"){
               if (data.sender=="employee"){
                if (peerConnection) {
                    console.log("Adding ICE candidate:", data.message);
                    peerConnection.addIceCandidate(new RTCIceCandidate(data.message))
                        .catch(e => console.error("Error adding ICE candidate", e));
                } else {
                    console.warn("PeerConnection not ready. Storing ICE candidate.");
                    pendingICECandidates.push(data.message);
                }
               }
           }else if(data.message_type === "accept"){
            if (data.sender=="employee"){
                peerConnection.setRemoteDescription(new RTCSessionDescription(data.message));
            }
           }
            else{
                if(data.message_type !== "share"){
                    if (data.sender == 'user') {
                        displayMessage_support(data.message, "user");
                        document.getElementById("user-input").value = "";
                    } else {
                        displayMessage_support(data.message, "bot");
                    }
                }
            }
        };

        chatSocket.onclose = function() {
            console.log("WebSocket connection closed.");
        };

        chatSocket.onerror = function(error) {
            console.error("WebSocket error:", error);
        };
    }
}

function showIncomingCallPopup(offer) {
    // Create the popup container
    var popup = document.createElement("div");
    popup.id = "callPopup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "white";
    popup.style.padding = "20px";
    popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
    popup.style.borderRadius = "10px";
    popup.style.zIndex = "1000";
    popup.style.textAlign = "center"; 
    // Popup title
    var title = document.createElement("p");
    title.innerText = "Incoming Call from Support...";
    popup.appendChild(title);

    // Timer display
    var timerDisplay = document.createElement("p");
    timerDisplay.id = "callTimer";
    timerDisplay.innerText = "Call Duration: 00:00";
    timerDisplay.style.fontWeight = "bold";
    timerDisplay.style.display = "none"; // Hide timer initially
    popup.appendChild(timerDisplay);

    let callDuration = 0; // Timer in seconds
    let timerInterval;

    function startTimer() {
        timerDisplay.style.display = "block"; // Show the timer after call starts
        timerInterval = setInterval(() => {
            callDuration++;
            let minutes = Math.floor(callDuration / 60);
            let seconds = callDuration % 60;
            timerDisplay.innerText = `Call Duration: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // **🔔 Add Ringtone Audio**
    var ringtone = new Audio("/static/js/ringtone.mp3"); // Replace with your ringtone file path
    ringtone.loop = true; // Keep playing until call is accepted or rejected
    ringtone.play().catch((error) => console.error("Autoplay failed:", error)); // Handle autoplay issues

    // Create "Attend Call" button
    var attendCallButton = document.createElement("button");
    attendCallButton.innerText = "Accept Call";
    attendCallButton.className = "btn btn-success";
    attendCallButton.style.margin = "10px";
    attendCallButton.onclick = function () {
        ringtone.pause(); // Stop ringtone when call is accepted
        ringtone.currentTime = 0; // Reset ringtone for future calls
        handleOffer(offer); // Start the WebRTC connection
        attendCallButton.remove(); // Remove only the Accept button
        title.innerText = "Ongoing Call..."; // Update title
        startTimer(); // Start the call timer
    };

    // Create "End Call" button
    var endCallButton = document.createElement("button");
    endCallButton.innerText = "Reject Call";
    endCallButton.className = "btn btn-danger";
    endCallButton.style.margin = "10px";
    endCallButton.onclick = function () {
        ringtone.pause(); // Stop ringtone when call is rejected
        ringtone.currentTime = 0; // Reset ringtone
        popup.remove(); // Remove the popup
        chatSocket.send(JSON.stringify({ type: "call-ended", sender: "user",message:"I cutted the call"}));
    };

    // Append buttons to popup
    popup.appendChild(attendCallButton);
    popup.appendChild(endCallButton);

    // Add popup to the body
    document.body.appendChild(popup);
}

function request_screen(){
    var popup = document.createElement("div");
    popup.id = "callPopup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "white";
    popup.style.padding = "20px";
    popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
    popup.style.borderRadius = "10px";
    popup.style.zIndex = "1000";
    popup.style.textAlign = "center"; 
    // Popup title
    var title = document.createElement("p");
    title.innerText = "Request for screen sharing...";
    popup.appendChild(title);
    // Create "Attend Call" button
    var attendCallButton = document.createElement("button");
    attendCallButton.innerText = "Accept screen share";
    attendCallButton.className = "btn btn-success";
    attendCallButton.style.margin = "10px";
    var endCallButton = document.createElement("button");
    endCallButton.innerText = "Reject Call";
    endCallButton.className = "btn btn-danger";
    endCallButton.style.margin = "10px";
    attendCallButton.onclick = function () {
        screen_share();
    };
    endCallButton.onclick = function () {
        popup.remove();
        chatSocket.send(JSON.stringify({ type: "request_cancel", sender: "user",message:"Screen share cancelled"}));
        popup.style.display="none"
    };
    // Append buttons to popup
    popup.appendChild(attendCallButton);
    popup.appendChild(endCallButton);
    // Add popup to the body
    document.body.appendChild(popup);
}

// async function screen_share(){
//     var remov =document.getElementById("callPopup");
//     remov.remove();
//     var video = document.getElementById("video_src");
//     var popup = document.getElementById("screen");
//     popup.style.display="block";
//     popup.style.position = "fixed";
//     popup.style.height="50%"
//     popup.style.width="50%"
//     popup.style.top = "50%";
//     popup.style.left = "50%";
//     popup.style.transform = "translate(-50%, -50%)";
//     popup.style.background = "white";
//     popup.style.padding = "20px";
//     popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
//     popup.style.borderRadius = "10px";
//     popup.style.zIndex = "1000";
//     popup.style.textAlign = "center";
//     var close = document.createElement("button");
//     close.innerText="X";
//     close.style.color="black";
//     close.style.backgroundColor="red";
//     close.style.position="fixed";
//     close.style.right="0rem";
//     close.style.top="0rem";
//     close.style.borderRadius="7px";
//     close.onclick =function(){
//         popup.style.display="none";
//         close.remove();
//         stopSharing();
//     }
//     var stopshare = document.createElement("button");
//     stopshare.innerText="stop sharing";
//     stopshare.style.color="black";
//     stopshare.style.backgroundColor="red";
//     peerConnection = new RTCPeerConnection(config);
//     const stream = await navigator.mediaDevices.getDisplayMedia({ 
//         video: true ,
//         audio: true
//     });
//     const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
//     stream.getAudioTracks().forEach(track => {
//         stream.addTrack(track)
//         track.onended = () => {
//             console.log("Screen sharing stopped by the user.");
            
//             // Send stop signal to receiver
//             chatSocket.send(JSON.stringify({
//                 type: "stop-sharing",
//                 sender: "user",
//                 message:"screen sharing stopped"
//             }));
//             peerConnection.close();
//             popup.style.display="none";
//         };
//     });
//     // stream.getVideoTracks()[0].onended = () => {
//     //     console.log("Screen sharing stopped by the user.");
    
//     //     // Send stop signal to receiver
//     //     chatSocket.send(JSON.stringify({
//     //         type: "stop-sharing",
//     //         sender: "user",
//     //         message: "Screen sharing stopped"
//     //     }));
//     //     peerConnection.close();
//     //     popup.style.display = "none";
//     // };
//     video.srcObject=stream;
//     stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer);
    
//     chatSocket.send(JSON.stringify({
//         type: "share",
//         sender:"user",
//         message: offer
//     }));
//     peerConnection.onicecandidate = (event) => {
//         if (event.candidate) {
//             chatSocket.send(JSON.stringify({
//                 type: "ice-candidate",
//                 sender:"user",
//                 message: event.candidate
//             }));
//         }
//         console.log("from sender",event.candidate);
//     };
    
//     stopshare.onclick=function(){
//         video.srcObject.getTracks().forEach(track => track.stop());
//         peerConnection.close();
//         popup.style.display="none";
//     }
//     popup.appendChild(stopshare);
//     popup.appendChild(close);
//     document.body.appendChild(popup);
// }

async function screen_share() {
    var remov = document.getElementById("callPopup");
    remov.remove();
    
    var video = document.getElementById("video_src");
    var popup = document.getElementById("screen");

    // Popup Styling
    popup.style.display = "block";
    popup.style.position = "fixed";
    popup.style.height = "50%";
    popup.style.width = "50%";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "white";
    popup.style.padding = "20px";
    popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
    popup.style.borderRadius = "10px";
    popup.style.zIndex = "1000";
    popup.style.textAlign = "center";

    // Close Button
    var close = document.createElement("button");
    close.innerText = "X";
    close.style.color = "black";
    close.style.backgroundColor = "red";
    close.style.position = "absolute";
    close.style.right = "0.5rem";
    close.style.top = "0.5rem";
    close.style.borderRadius = "7px";
    close.onclick = function () {
        stopSharing();
    };

    // Stop Sharing Button
    var stopshare = document.createElement("button");
    stopshare.innerText = "Stop Sharing";
    stopshare.style.color = "black";
    stopshare.style.backgroundColor = "red";
    stopshare.style.marginTop = "10px";
    stopshare.onclick = function () {
        stopSharing();
    };

    // WebRTC Connection Setup
    peerConnection = new RTCPeerConnection(config);

    // Get Display Media (Screen Sharing)
    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
    });

    // Get Audio from Microphone
    // const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // audioStream.getAudioTracks().forEach(track => stream.addTrack(track));

    // Assign to Video Element
    video.srcObject = stream;

    // Add Tracks to Peer Connection
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    // Send Offer to Receiver
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    chatSocket.send(JSON.stringify({
        type: "share",
        sender: "user",
        message: offer
    }));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            chatSocket.send(JSON.stringify({
                type: "ice-candidate",
                sender: "user",
                message: event.candidate
            }));
        }
    };

    // Handle Screen Share Stop Event
    stream.getVideoTracks()[0].onended = () => {
        stopSharing();
    };

    function stopSharing() {
        // Stop all tracks (audio & video)
        stream.getTracks().forEach(track => track.stop());
        // audioStream.getTracks().forEach(track => track.stop());

        // Close WebRTC Peer Connection
        peerConnection.close();

        // Hide Popup
        popup.style.display = "none";

        // Notify Receiver to Stop Displaying Shared Screen
        chatSocket.send(JSON.stringify({
            type: "stop-sharing",
            sender: "user",
            message: "Screen sharing stopped"
        }));
    }

    popup.appendChild(stopshare);
    popup.appendChild(close);
    document.body.appendChild(popup);
}


async function handleOffer(offer) {
    const remoteAudio = document.getElementById("remoteAudio");
    console.log("inside handle offer handling received offer",offer);
    peerConnection = new RTCPeerConnection(config);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            chatSocket.send(JSON.stringify({
                type: "ice-candidate",
                sender:"user",
                message: event.candidate
            }));
        }
    };

    peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    pendingICECandidates.forEach(candidate => {
        console.log("Adding stored ICE candidate:", candidate);
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(e => console.error("Error adding stored ICE candidate", e));
    });
    pendingICECandidates = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    chatSocket.send(JSON.stringify({
        type: "answer",
        sender:"user",
        message: answer
    }));
    console.log("answer from receiver",answer);
    
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleICECandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("sender ice candidate",peerConnection.addIceCandidate);
    } catch (error) {
        console.error("Error adding ICE candidate:", error);
    }
}

async function recorddisplay(){
    let mediaRecorder;
    let audioChunks = [];
    var display_message = document.getElementById("record_display");
    if (display_message.style.display=="none"){
        display_message.style.display="block";
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true, 
                autoGainControl: true  } 
            });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        startWaveformVisualization(stream);
        document.getElementById("send-audio").addEventListener("click", async () => {
            mediaRecorder.stop();
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                const formData = new FormData();
                formData.append("file", audioBlob);
                formData.append("room_name", room_id);
                formData.append("sender", "user");
                stopWaveformVisualization();
                fetch("/upload-file/", {
                    method: "POST",
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    // Notify WebSocket about file upload
                    chatSocket.send(JSON.stringify({
                        type: "audio_upload",
                        filename:room_id,
                        file_url: data.file , // URL of uploaded file
                        sender:"user"
                    }));
                })
                .catch(error => console.error("File upload error:", error));
                audioChunks = [];
                display_message.style.display="none";
            };
        });
    }else{
        display.style.display="none";
    }
}

let audioContext, analyser, source, canvas, canvasCtx;
function startWaveformVisualization(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;

    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    canvas = document.getElementById("waveform");
    canvasCtx = canvas.getContext("2d");

    function drawWaveform() {
        requestAnimationFrame(drawWaveform);

        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        // **Green Gradient Background**
        let gradientBg = canvasCtx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradientBg.addColorStop(0, "#043927"); // Dark Green
        gradientBg.addColorStop(1, "#0f6b37"); // Lighter Green

        canvasCtx.fillStyle = gradientBg;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        // **Wave Style Settings**
        let gradientWave = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
        gradientWave.addColorStop(0, "#00ff99"); // Neon Green
        gradientWave.addColorStop(1, "#33ff33"); // Light Green

        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = gradientWave;
        canvasCtx.beginPath();

        let sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            let y = (dataArray[i] / 128.0) * (canvas.height / 2);

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }

    drawWaveform();
}


function stopWaveformVisualization() {
    if (audioContext) {
        audioContext.close();
    }
}


function ws_sendMessage_button() {
    
    connectWebSocket();  // Ensure connection is established before sending messages
    var userMessage = document.getElementById("user-input").value.trim();
    if (userMessage !== "" && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            'message': userMessage,
            'sender': 'user'
        }));
        document.getElementById("user-input").value = '';  // Clear input field
    }
}

function uploadFile(file) {
    let formData = new FormData();
    formData.append("file", file);
    formData.append("room_name", room_id); // Send room name
    formData.append("sender", "user"); // Replace with actual sender info

    fetch("/upload-file/", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Notify WebSocket about file upload
        chatSocket.send(JSON.stringify({
            type: "file_upload",
            filename: file.name,
            file_url: data.file , // URL of uploaded file
            sender:"user"
        }));
    })
    .catch(error => console.error("File upload error:", error));
}

function displayMessage(message, sender) {
    var chatBox = document.getElementById("chatMessages");
    var sound = document.getElementById("sound-toggle");
    if (!chatBox) {
        console.error("Error: #chat-box not found!");
        return;
    }
    console.log("received format",message);
    if(message !== null){
        if (Array.isArray(message)) {
            message.forEach(msg => addMessageToChat(msg, sender));  
        } else {
            addMessageToChat(message, sender);
        }
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;

    // var sound = document.getElementById("sound-toggle");
    // if (sound.innerText == "Sound On"){
    //     sound_play();
    // }
}

function addMessageToChat(msg, sender) {
    var chatBox = document.getElementById("chatMessages");
    var outer = document.createElement("div");
    var inner = document.createElement("div");

    if (sender === "user") {
        outer.classList.add("d-flex", "align-items-end", "justify-content-end", "mb-2");
        inner.classList.add("user-message", "p-2", "mb-2");
        console.log("inside user message to add");
    } else {
        outer.classList.add("d-flex", "align-items-start", "flex-column", "mb-2");
        inner.classList.add("support-message", "p-2", "mb-2");
    }

    if(sender=="user"){
        inner.innerHTML =`<strong>You</strong> : ${msg}.`;
    }else{
        inner.innerHTML = msg;
    }

    // Append the inner div to the outer div first
    outer.appendChild(inner);

    // Then append the outer div to the chatBox
    chatBox.appendChild(outer);
}
function displayMessage_support(message, sender) {
    var chatBox = document.getElementById("chatMessages");
    var sound = document.getElementById("sound-toggle");
    if (!chatBox) {
        console.error("Error: #chat-box not found!");
        return;
    }
    console.log("received format",message);
    if(message !== null){
        if (Array.isArray(message)) {
            message.forEach(msg => addMessageToChat_support(msg, sender));  
        } else {
            addMessageToChat_support(message, sender);
        }
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;

    // var sound = document.getElementById("sound-toggle");
    // if (sound.innerText == "Sound On"){
    //     sound_play();
    // }
}

function addMessageToChat_support(msg, sender) {
    var chatBox = document.getElementById("chatMessages");
    var outer = document.createElement("div");
    var inner = document.createElement("div");

    if (sender === "user") {
        outer.classList.add("d-flex", "align-items-end", "justify-content-end", "mb-2");
        inner.classList.add("user-message", "p-2", "mb-2");
        console.log("inside user message to add");
    } else {
        outer.classList.add("d-flex", "align-items-start", "flex-column", "mb-2");
        inner.classList.add("support-message", "p-2", "mb-2");
    }

    if(sender=="user"){
        inner.innerHTML =`<strong>You</strong> : ${msg}.`;
    }else{
        inner.innerHTML = `<strong>Support </strong> : ${msg}.`;
    }

    // Append the inner div to the outer div first
    outer.appendChild(inner);

    // Then append the outer div to the chatBox
    chatBox.appendChild(outer);
}


function sound_play(){
    var sound = new Audio('/static/js/sound.mp3');  // Use the correct URL
    sound.play();
}

function getBotResponse(input) {
    console.log("input keyword",input);
    if (input.includes("hello") || input.includes("hi")) {
        return "Hello! How can I help you today?";
    }else {
        getApiResponse(input);
        return '';
    }
}

async function getApiResponse(userInput) {
    console.log("Sending request to Django API...");
    const csrfToken = document.getElementById('csrf-token')?.value;

    if (!csrfToken) {
        console.error("Error: CSRF token not found!");
        return;
    }

    try {
        const response = await fetch('http://13.61.143.104/chat-widget/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken
            },
            body: `input=${encodeURIComponent(userInput)}`,
        });

        if (!response.ok) {
            console.error('Request failed with status:', response.status);
            throw new Error('Request failed');
        }

        const data = await response.json();
        console.log("Django response:", data);

        // ✅ Handle button responses
        if (data?.type === "button" && Array.isArray(data.response)) {
            console.log("i am executed before button created");
            createButtons(data.response);
            return null;
        } 
        // ✅ Handle normal text responses
        else {
            displayMessage(data?.response ?? "Sorry, I couldn't get a valid response.", "bot");
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        displayMessage("Sorry, there was an error with the request.", "bot");
    }
}

function createButtons(buttonNames) {
    var chatBox = document.getElementById("chatMessages");
    var buttonContainer = document.createElement("div");
    buttonContainer.classList.add("d-flex", "align-items-start", "mb-2", "flex-column");
    buttonNames.forEach(name => {
        let button = document.createElement("button");
        button.innerHTML = name;
        button.classList.add("support-message","p-2","mb-2","border-0"); // Add a class for styling
        button.onclick = function () {
            displayMessage(name, "user"); // Show selected button text in chat
            getApiResponse(name); // Send the selected option to API
        };

        buttonContainer.appendChild(button);
    });

    chatBox.appendChild(buttonContainer);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll down to show buttons
}
