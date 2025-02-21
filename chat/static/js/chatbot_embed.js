// Ensure the div with id "django-content" exists
let contentDiv = document.getElementById("django-content");
if (!contentDiv) {
    contentDiv = document.createElement("div");
    contentDiv.id = "django-content";
    document.body.appendChild(contentDiv);
}

// Fetch the chatbot HTML
fetch("http://13.61.143.104/updated_template/")  // Fixed the URL
    .then(response => response.text())
    .then(html => {
        contentDiv.innerHTML = html;

        // Load chatbot script only after HTML is added
        let script = document.createElement("script");
        script.src = "http://127.0.0.1:8000/static/js/chatbot.js";
        script.onload = function () {
            console.log("✅ Chatbot script loaded, initializing chat history...");
            if (typeof loadChatHistory === "function") {
                loadChatHistory();
            } else {
                console.error("❌ loadChatHistory function not found.");
            }
        };
        document.body.appendChild(script);
    })
    .catch(error => console.error("❌ Error loading chatbot HTML:", error));
