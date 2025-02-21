 document.getElementById("popout-widget").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent default anchor behavior

    // Open a new pop-out window
    let popout = window.open(
      "chatbot_popout/", // Django URL where chatbot is rendered
      "Chatbot",
      "width=400,height=600,resizable=yes,scrollbars=yes"
    );

    if (!popout || popout.closed || typeof popout.closed == 'undefined') { 
      alert("Pop-up blocked! Please allow pop-ups for this site.");
    }
  });

