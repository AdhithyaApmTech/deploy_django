fetch("http://127.0.0.1:8000/chat-widget/")
    .then(response => response.text())
    .then(html => {
        document.getElementById("django-content").innerHTML = html;

        // Load chatbot script only after HTML is added
        let script = document.createElement("script");
        script.src = "http://127.0.0.1:8000/static/js/chatbot.js";
        script.onload = function () {
            console.log("✅ Chatbot script loaded, initializing chat history...");
            loadChatHistory();
        };
        document.body.appendChild(script);
    })
    .catch(error => console.error("Error loading chatbot HTML:", error));