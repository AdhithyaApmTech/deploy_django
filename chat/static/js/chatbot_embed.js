// Ensure the div with id "django-content" exists
let contentDiv123 = document.getElementById("django-content");
if (!contentDiv123) {
    contentDiv123 = document.createElement("div");
    contentDiv123.id = "django-content";
    document.body.appendChild(contentDiv123);
}

// Fetch the chatbot HTML
fetch("http://13.61.143.104/updated_template/")  // Fixed the URL
    .then(response => response.text())
    .then(html => {
        contentDiv123.innerHTML = html;

        // Load chatbot script only after HTML is added
        let script = document.createElement("script");
        script.src = "http://13.61.143.104/static/js/updated_bot.js";
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
