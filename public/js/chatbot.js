// Iskolaris AI Scholar Assistant

let chatbotInitialized = false;

/**
 * Initializes the chatbot after student-chatbot.html
 * has been loaded into the SPA content container.
 */
function loadChatbot() {
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-input");
  const messages = document.getElementById("chatbot-messages");
  const sendButton = document.getElementById("chatbot-send-button");
  const newChatButton = document.getElementById("chatbot-new-chat");

  if (!form || !input || !messages || !sendButton) {
    console.error("Chatbot elements were not found.");
    return;
  }

  populateChatbotProfile();

  // The view is recreated each time the tab loads,
  // so new event listeners must be attached.
  chatbotInitialized = true;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const message = input.value.trim();

    if (!message) {
      return;
    }

    await sendChatbotMessage(message);
  });

  input.addEventListener("input", () => {
    resizeChatbotInput(input);
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document
    .querySelectorAll(".chatbot-prompt-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        const prompt = button.getAttribute("data-prompt") || "";

        input.value = prompt;
        resizeChatbotInput(input);
        input.focus();
      });
    });

  if (newChatButton) {
    newChatButton.addEventListener("click", resetChatbotConversation);
  }

  input.focus();
}

/**
 * Shows current scholar information in the side panel.
 */
function populateChatbotProfile() {
  const studentName = document.getElementById("chatbot-student-name");
  const scholarshipName = document.getElementById(
    "chatbot-scholarship-name"
  );
  const cgpa = document.getElementById("chatbot-cgpa");
  const renewalStatus = document.getElementById(
    "chatbot-renewal-status"
  );

  if (!currentUser) {
    return;
  }

  if (studentName) {
    studentName.textContent = currentUser.name || "Student";
  }

  if (scholarshipName) {
    scholarshipName.textContent =
      currentUser.scholarshipType ||
      currentUser.scholarship_name ||
      "Scholarship";
  }

  if (cgpa) {
    const value = Number.parseFloat(currentUser.cgpa);

    cgpa.textContent = Number.isFinite(value)
      ? value.toFixed(2)
      : "0.00";
  }

  if (renewalStatus) {
    renewalStatus.textContent = normalizeRenewalStatus(
      currentUser.renewalStatus
    );
  }
}

/**
 * Sends a user message to the chatbot backend.
 */
async function sendChatbotMessage(message) {
  const input = document.getElementById("chatbot-input");
  const sendButton = document.getElementById(
    "chatbot-send-button"
  );
  const promptContainer = document.getElementById(
    "chatbot-prompts"
  );

  addChatbotMessage(message, "user");

  input.value = "";
  resizeChatbotInput(input);

  if (promptContainer) {
    promptContainer.classList.add("chatbot-prompts-hidden");
  }

  sendButton.disabled = true;
  input.disabled = true;

  const typingId = showChatbotTypingIndicator();

  try {
    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        studentId: currentUser ? currentUser.id : null,
        context: {
          name: currentUser ? currentUser.name : null,
          scholarship: currentUser
            ? currentUser.scholarshipType ||
              currentUser.scholarship_name
            : null,
          cgpa: currentUser ? currentUser.cgpa : null,
          renewalStatus: currentUser
            ? currentUser.renewalStatus
            : null
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        `Chatbot request failed with status ${response.status}.`
      );
    }

    removeChatbotTypingIndicator(typingId);

    let assistantReply =
  data.reply ||
  "I could not generate a response. Please try again.";

addChatbotMessage(
  assistantReply,
  "assistant"
);
  } catch (error) {
    console.error("Chatbot error:", error);

    removeChatbotTypingIndicator(typingId);

    addChatbotMessage(
      "I am unable to connect to the assistant right now. " +
      "Please check whether the server is running and try again.",
      "assistant"
    );
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

/**
 * Adds a message to the chat window.
 */
function addChatbotMessage(message, sender) {
  const messages = document.getElementById("chatbot-messages");

  if (!messages) {
    return;
  }

  const messageElement = document.createElement("div");

  messageElement.className =
    sender === "user"
      ? "chatbot-message chatbot-message-user"
      : "chatbot-message chatbot-message-assistant";

  const avatar = document.createElement("div");
  avatar.className = "chatbot-message-avatar";

  const avatarIcon = document.createElement("i");
  avatarIcon.className =
    sender === "user"
      ? "bx bx-user"
      : "bx bx-bot";

  avatar.appendChild(avatarIcon);

  const body = document.createElement("div");
  body.className = "chatbot-message-body";

  const bubble = document.createElement("div");
  bubble.className = "chatbot-message-bubble";

  const messageContent = document.createElement("div");
  messageContent.className = "chatbot-markdown-content";

  if (sender === "assistant" && window.marked) {
    messageContent.innerHTML = marked.parse(message);
  } else {
    messageContent.textContent = message;
  }

bubble.appendChild(messageContent);

  const time = document.createElement("span");
  time.className = "chatbot-message-time";
  time.textContent = getChatbotTime();

  body.appendChild(bubble);
  body.appendChild(time);

  messageElement.appendChild(avatar);
  messageElement.appendChild(body);

  messages.appendChild(messageElement);
  scrollChatbotToBottom();
}

/**
 * Displays a typing indicator.
 */
function showChatbotTypingIndicator() {
  const messages = document.getElementById("chatbot-messages");

  if (!messages) {
    return null;
  }

  const typingId = `chatbot-typing-${Date.now()}`;

  const typingElement = document.createElement("div");
  typingElement.id = typingId;
  typingElement.className =
    "chatbot-message chatbot-message-assistant";

  typingElement.innerHTML = `
    <div class="chatbot-message-avatar">
      <i class="bx bx-bot"></i>
    </div>

    <div class="chatbot-message-body">
      <div class="chatbot-message-bubble chatbot-typing-bubble">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  messages.appendChild(typingElement);
  scrollChatbotToBottom();

  return typingId;
}

/**
 * Removes the typing indicator.
 */
function removeChatbotTypingIndicator(typingId) {
  if (!typingId) {
    return;
  }

  const typingElement = document.getElementById(typingId);

  if (typingElement) {
    typingElement.remove();
  }
}

/**
 * Clears the current conversation.
 */
function resetChatbotConversation() {
  const messages = document.getElementById("chatbot-messages");
  const prompts = document.getElementById("chatbot-prompts");
  const input = document.getElementById("chatbot-input");

  if (!messages) {
    return;
  }

  messages.innerHTML = `
    <div class="chatbot-message chatbot-message-assistant">
      <div class="chatbot-message-avatar">
        <i class="bx bx-bot"></i>
      </div>

      <div class="chatbot-message-body">
        <div class="chatbot-message-bubble">
          <p>
            Hello! I am your AI Scholar Assistant. How can I help you
            today?
          </p>
        </div>

        <span class="chatbot-message-time">Just now</span>
      </div>
    </div>
  `;

  if (prompts) {
    prompts.classList.remove("chatbot-prompts-hidden");
  }

  if (input) {
    input.value = "";
    resizeChatbotInput(input);
    input.focus();
  }
}

/**
 * Automatically adjusts the textarea height.
 */
function resizeChatbotInput(input) {
  if (!input) {
    return;
  }

  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
}

/**
 * Scrolls to the latest message.
 */
function scrollChatbotToBottom() {
  const messages = document.getElementById("chatbot-messages");

  if (messages) {
    messages.scrollTop = messages.scrollHeight;
  }
}

/**
 * Returns the current local message time.
 */
function getChatbotTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}