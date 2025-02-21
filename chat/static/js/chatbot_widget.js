function toggleSound() {
    var soundLink = document.getElementById("sound-toggle");

    if (soundLink.innerText === "Sound On") {
        soundLink.innerText = "Sound Off";
        // You can also stop the sound here if needed
    } else {
        soundLink.innerText = "Sound On";
        // You can play a sound here if needed
    }
}

// function toggleChat() {
//     document.getElementById("user-input").autofocus = true;
//     const chatContainer = document.getElementById('chat-container');
//     const chatToggle = document.getElementById('chat-toggle');
//     var chat_close = document.getElementById("chat-close");
//     chatContainer.style.display = 'flex'; // Show chat
//     setTimeout(() => {
//         chatContainer.style.opacity = '1';
//         chatContainer.style.transform = 'translateY(-1rem)';
//         console.log("container_opacity", chatContainer.style.opacity);
//         console.log("container_transform", chatContainer.style.transform);
//         sessionStorage.setItem("container_opacity", chatContainer.style.opacity);
//         sessionStorage.setItem("container_transform", chatContainer.style.transform);
//     }, 10);
//     chatToggle.style.display = 'none'; // Hide button
//     chat_close.style.display = 'block';
//     console.log("chat_close",chat_close.style.display);
//     sessionStorage.setItem("chat_close",chat_close.style.display);
//     sessionStorage.setItem("chatcontainer", chatContainer.style.display);
//     console.log("container_display", chatContainer.style.display);
//     console.log("toggle_display", chatToggle.style.display);
//     sessionStorage.setItem("container_display", chatContainer.style.display);
//     sessionStorage.setItem("toggle_display", chatToggle.style.display);
// }
// function closeChat() {
//     const chatContainer = document.getElementById('chat-container');
//     const chatToggle = document.getElementById('chat-toggle');
//     var chat_close = document.getElementById("chat-close");
//     chatContainer.style.opacity = '0';
//     chatContainer.style.transform = 'translateY(20px)';

//     // Hide the chat after transition
//     setTimeout(() => {
//         chatContainer.style.display = 'none';
//         console.log("container_display", chatContainer.style.display);
//         sessionStorage.setItem("container_display", chatContainer.style.display);
//     }, 300); // Match transition duration

//     chatToggle.style.display = 'block'; // Show button
//     chat_close.style.display = "none";
//     sessionStorage.setItem("chat_close",chat_close.style.display);
//     console.log("container_opacity", chatContainer.style.opacity);
//     sessionStorage.setItem("container_opacity", chatContainer.style.opacity);
//     console.log("container_transform", chatContainer.style.transform);
//     sessionStorage.setItem("container_transform", chatContainer.style.transform);
//     console.log("toggle_display", chatToggle.style.display);
//     sessionStorage.setItem("toggle_display", chatToggle.style.display);
// }

// ✅ Load chat history when page loads
document.addEventListener("DOMContentLoaded", function () {
    console.log("Loading chat history...");
    loadChatHistory();
    container_and_toggle_state();
});

function container_and_toggle_state() {
    var chatContainer = document.getElementById('chat-container');
    // var chatToggle = document.getElementById('chat-toggle');
    var saved_container_diplay = sessionStorage.getItem("container_display");
    var saved_container_opacity = sessionStorage.getItem("container_opacity");
    var saved_conatiner_transform = sessionStorage.getItem("container_transform");
    // var saved_toggle_display = sessionStorage.getItem("toggle_display");
    chatContainer.style.display = saved_container_diplay;
    chatContainer.style.opacity = saved_container_opacity;
    chatContainer.style.transform = saved_conatiner_transform;
    // chatToggle.style.display = saved_toggle_display; 
}


function handleButtonClick(button) {
    var buttonText = button.innerText.trim(); // Get text inside the button
    sendMessage(buttonText); // Call sendMessage with button text
}
function contact(button) {
    var buttonText = button.innerText.trim(); // Get text inside the button
    sendMessage(buttonText+"_contact"); // Call sendMessage with button text
}

function handleButtonClick_hardware(button){
    var buttonText = button.innerText.trim();
    sendMessage(buttonText+"_hardware");
}

function handleButtonClick_software(button){
    var buttonText = button.innerText.trim();
    sendMessage(buttonText+"_software");
}

function dealer(product){
    var buttonText = product+"_dealer";
    console.log("button",buttonText);
    sendMessage(buttonText);
}
function user(product){
    var buttonText = product+"_user";
    console.log("button",buttonText);
    sendMessage(buttonText);
}
// ✅ Send message and save chat history
function sendMessage(userMessage=null) {
    if (!userMessage) {
        userMessage = document.getElementById("user-input").value.trim(); // Get input field value
    }
    if (userMessage !== "") {
        displayMessage(userMessage, "user");

        var botResponse = getBotResponse(userMessage);
        displayMessage(botResponse, "bot");

        saveChatHistory(); // ✅ Save chat after new messages

        document.getElementById("user-input").value = ""; // Clear input
    }
}



// ✅ Display messages in chat and save history
function displayMessage(message, sender) {
    var chatBox = document.getElementById("chat-box");
    var sound = document.getElementById("sound-toggle");
    if (!chatBox) {
        console.error("Error: #chat-box not found!");
        return;
    }
    console.log("received format",message);
    if (Array.isArray(message)) {
        message.forEach(msg => addMessageToChat(msg, sender));  
    } else {
        addMessageToChat(message, sender);
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;

    saveChatHistory(); // ✅ Save after every message
    // var sound = document.getElementById("sound-toggle");
    // if (sound.innerText == "Sound On"){
    //     sound_play();
    // }
}

function addMessageToChat(msg, sender) {
    var chatBox = document.getElementById("chat-box");
    var messageElement = document.createElement("div");
    messageElement.classList.add("message");

    if (sender === "user") {
        messageElement.classList.add("user-message");
    } else {
        messageElement.classList.add("bot-message");
    }

    messageElement.innerHTML = msg;
    chatBox.appendChild(messageElement);
    return messageElement;
}


function sound_play(){
    var sound = new Audio('/static/js/sound.mp3');  // Use the correct URL
    sound.play();
}

// ✅ Save chat history to sessionStorage
function saveChatHistory() {
    var chatBox = document.getElementById("chat-box");
    if (!chatBox) {
        console.error("Error: Cannot save chat history - #chat-box not found!");
        return;
    }

    sessionStorage.setItem("chatHistory", chatBox.innerHTML);
    console.log("✅ Chat history saved!", chatBox.innerHTML);
}

// ✅ Load chat history from sessionStorage
function loadChatHistory() {
    var chatBox = document.getElementById("chat-box");
    if (!chatBox) {
        console.error("Error: Cannot load chat history - #chat-box not found!");
        return;
    }

    var savedChat = sessionStorage.getItem("chatHistory");
    if (savedChat) {
        chatBox.innerHTML = savedChat;
        console.log("✅ Chat history restored!", savedChat);
    } else {
        console.log("⚠️ No chat history found in sessionStorage.");
    }
}

// ✅ Bot response logic
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
        const response = await fetch('http://127.0.0.1:8000/chat-widget/', {
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
        } 
        // ✅ Handle normal text responses
        else {
            displayMessage(data?.response ?? "Sorry, I couldn't get a valid response.", "bot");
        }

        saveChatHistory(); // ✅ Save after bot response

    } catch (error) {
        console.error('Error:', error);
        displayMessage("Sorry, there was an error with the request.", "bot");
        saveChatHistory();
    }
}


function createButtons(buttonNames) {
    var chatBox = document.getElementById("chat-box");
    var buttonContainer = document.createElement("div");
    buttonContainer.classList.add("chat-box1");
    buttonNames.forEach(name => {
        let button = document.createElement("button");
        button.innerText = name;
        button.classList.add("message"); // Add a class for styling
        button.classList.add("bot-message"); // Add a class for styling
        button.onclick = function () {
            displayMessage(name, "user"); // Show selected button text in chat
            getApiResponse(name); // Send the selected option to API
        };

        buttonContainer.appendChild(button);
    });

    chatBox.appendChild(buttonContainer);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll down to show buttons
}
