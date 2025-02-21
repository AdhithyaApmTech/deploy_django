// Ensure the div with id "django-content" exists
let contentDiv = document.getElementById("django-content");
if (!contentDiv) {
    contentDiv = document.createElement("div");
    contentDiv.id = "django-content";
    document.body.appendChild(contentDiv);
}

// Fetch the chatbot HTML
fetch("http://13.61.143.104/updated_template/")  // Fixed the URL
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
    })
    .then(html => {
        contentDiv.innerHTML = html;

        // Load chatbot script only after HTML is added
        let script = document.createElement("script");
        script.src = "http://13.61.143.104/static/js/updated_bot.js";
        script.onload = function () {
            console.log("✅ Chatbot script loaded, initializing chat history...");

            if (typeof window.loadChatHistory === "function") {
                window.loadChatHistory();
            } else {
                console.error("❌ loadChatHistory function not found. Ensure it's defined in updated_bot.js.");
            }
        };

        script.onerror = function () {
            console.error("❌ Failed to load updated_bot.js. Check if the file exists and is accessible.");
        };

        document.body.appendChild(script);
    })
    .catch(error => console.error("❌ Error loading chatbot HTML:", error));
