const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

// API Setup
const API_KEY = "AIzaSyBLuu_KpVUEi80FVC-tf7KgldDVWwCEtB4"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", files: [] }; // Changed to support multiple files

// Travel-focused system instruction
const SYSTEM_INSTRUCTION = `You are a travel assistant chatbot for Bayard Vacations, a premium travel agency located in Bangalore, India. You ONLY respond to questions and requests about:
- Travel destinations and recommendations
- Trip planning and itineraries
- Best places to visit
- Travel tips and advice
- Tourist attractions
- Accommodation suggestions
- Transportation options
- Local cuisine and restaurants
- Travel budgets and costs
- Cultural experiences
- Adventure activities
- Seasonal travel recommendations

IMPORTANT - When users ask about trips, packages, destinations, pricing, or travel planning:
1. Always provide helpful travel information first
2. Then naturally mention that "Bayard Vacations offers customized travel packages for this destination"
3. Suggest that Bayard Vacations has:
   - Competitive and best pricing in the market
   - Fully customizable tour packages tailored to customer preferences
   - Both budget-friendly and luxury travel options
   - Complete trip planning including flights, hotels, activities, and local experiences
   - Expert guidance from experienced travel consultants based in Bangalore
   - 24/7 customer support during trips
   - Special deals and seasonal offers

4. Encourage users to contact Bayard Vacations for personalized quotes and package details
5. Mention that being based in Bangalore, they have excellent connections and local expertise

Example responses should naturally weave in mentions like:
- "Bayard Vacations offers comprehensive packages for this destination with competitive pricing..."
- "At Bayard Vacations, we can customize this itinerary to match your budget and preferences..."
- "Our agency specializes in creating personalized travel experiences with the best rates in the industry..."

If the user asks about anything NOT related to travel, politely redirect them by saying: "I'm a travel assistant for Bayard Vacations and can only help with travel-related questions. Please ask me about destinations, trip planning, or travel packages!"

Keep your responses helpful, friendly, professional, and always position Bayard Vacations as the best choice for their travel needs.`;

// Set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Function to create message elements
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Add restart button to regenerate response
const addRestartButton = (botMsgDiv) => {
  // Check if restart button already exists
  if (botMsgDiv.querySelector(".restart-btn")) return;
  
  const restartBtn = document.createElement("button");
  restartBtn.className = "restart-btn material-symbols-rounded";
  restartBtn.textContent = "refresh";
  restartBtn.title = "Regenerate response";
  
  restartBtn.addEventListener("click", async () => {
    // Remove the restart button
    restartBtn.remove();
    
    // Remove the last response from chat history
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "model") {
      chatHistory.pop();
    }
    
    // Reset the bot message to loading state
    botMsgDiv.classList.add("loading");
    const textElement = botMsgDiv.querySelector(".message-text");
    textElement.textContent = "Just a sec...";
    textElement.style.color = "";
    document.body.classList.add("bot-responding");
    
    // Regenerate the response
    await generateResponse(botMsgDiv);
  });
  
  botMsgDiv.appendChild(restartBtn);
};

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  
  // Set an interval to type each word
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
      
      // Add restart button after response is complete
      addRestartButton(botMsgDiv);
    }
  }, 40);
};

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();
  
  // Prepare file data for API
  const fileParts = userData.files.map(file => ({
    inline_data: { data: file.data, mime_type: file.mime_type }
  }));
  
  // Add user message and file data to the chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...fileParts],
  });
  
  try {
    // Send the chat history to the API with system instruction
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: chatHistory,
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        }
      }),
      signal: controller.signal,
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    
    // Process the response text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    if (error.name === "AbortError") {
      textElement.textContent = "Response generation stopped.";
      textElement.style.color = "#d62939";
    } else {
      textElement.textContent = error.message;
      textElement.style.color = "#d62939";
    }
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    
    // Add restart button even on error
    addRestartButton(botMsgDiv);
    
    scrollToBottom();
  } finally {
    userData.files = []; // Clear files after sending
  }
};

// Add edit functionality to messages
const addEditFunctionality = (userMsgDiv, originalMessage, originalFiles) => {
  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn material-symbols-rounded";
  editBtn.textContent = "edit";
  editBtn.title = "Edit message";
  
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    promptInput.value = originalMessage;
    
    // Restore the original files
    userData.files = originalFiles ? originalFiles.map(f => ({...f})) : [];
    
    // Update file UI to show the restored images
    if (userData.files.length > 0) {
      fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
      
      const firstFile = userData.files[0];
      if (firstFile.isImage) {
        fileUploadWrapper.querySelector(".file-preview").src = `data:${firstFile.mime_type};base64,${firstFile.data}`;
        fileUploadWrapper.classList.add("active", "img-attached");
      } else {
        fileUploadWrapper.classList.add("active", "file-attached");
      }
      
      // Show multiple files indicator
      if (userData.files.length > 1) {
        fileUploadWrapper.classList.add("has-files");
      }
      
      updateFileCount();
    } else {
      // Clear file UI if no files
      fileUploadWrapper.classList.remove("file-attached", "img-attached", "active", "has-files");
      const badge = document.querySelector(".file-count-badge");
      if (badge) badge.remove();
    }
    
    promptInput.focus();
    
    // Find the index of this message in the chat container
    const allMessages = Array.from(chatsContainer.children);
    const messageIndex = allMessages.indexOf(userMsgDiv);
    
    // Remove this message and all subsequent messages from DOM
    for (let i = allMessages.length - 1; i >= messageIndex; i--) {
      allMessages[i].remove();
    }
    
    // Remove corresponding entries from chat history
    // Each user message has a corresponding bot response, so we need to calculate properly
    const historyIndex = Math.floor(messageIndex / 2) * 2;
    chatHistory.splice(historyIndex);
  });
  
  const messageContent = userMsgDiv.querySelector(".message-content");
  if (messageContent) {
    messageContent.appendChild(editBtn);
  }
};

// Handle the form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
  
  // Generate user message HTML with multiple file attachments
  let filesHTML = "";
  if (userData.files.length > 0) {
    filesHTML = '<div class="attachments-container">';
    userData.files.forEach(file => {
      if (file.isImage) {
        filesHTML += `<img src="data:${file.mime_type};base64,${file.data}" class="img-attachment" />`;
      } else {
        filesHTML += `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${file.fileName}</p>`;
      }
    });
    filesHTML += '</div>';
  }
  
  const userMsgHTML = `
    <div class="message-content">
      <p class="message-text"></p>
      ${filesHTML}
    </div>
  `;
  
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  
  // Store a copy of the files for editing
  const filesCopy = userData.files.map(f => ({...f}));
  addEditFunctionality(userMsgDiv, userData.message, filesCopy);
  
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  
  // Update file count display
  updateFileCount();
  
  setTimeout(() => {
    // Generate bot message HTML and add in the chat container
    const botMsgHTML = `<img class="avatar" src="image/b.svg" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// Update file count display
const updateFileCount = () => {
  const fileCountBadge = document.querySelector(".file-count-badge");
  if (userData.files.length > 0) {
    if (!fileCountBadge) {
      const badge = document.createElement("span");
      badge.className = "file-count-badge";
      badge.textContent = userData.files.length;
      fileUploadWrapper.appendChild(badge);
    } else {
      fileCountBadge.textContent = userData.files.length;
    }
    fileUploadWrapper.classList.add("has-files");
  } else {
    if (fileCountBadge) fileCountBadge.remove();
    fileUploadWrapper.classList.remove("has-files");
  }
};

// Handle file input change (multiple files up to 6)
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  if (files.length === 0) return;
  
  // Check total files limit
  if (userData.files.length + files.length > 6) {
    alert("You can upload a maximum of 6 images.");
    fileInput.value = "";
    return;
  }
  
  files.forEach(file => {
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const base64String = e.target.result.split(",")[1];
      
      // Store file data in userData.files array
      userData.files.push({
        fileName: file.name,
        data: base64String,
        mime_type: file.type,
        isImage
      });
      
      // Update display
      if (userData.files.length === 1 && isImage) {
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", "img-attached");
      } else {
        fileUploadWrapper.classList.add("active", "file-attached");
      }
      
      updateFileCount();
    };
  });
  
  fileInput.value = "";
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.files = [];
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active", "has-files");
  const fileCountBadge = document.querySelector(".file-count-badge");
  if (fileCountBadge) fileCountBadge.remove();
});

// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  if (controller) {
    controller.abort();
  }
  clearInterval(typingInterval);
  
  const loadingMsg = chatsContainer.querySelector(".bot-message.loading");
  if (loadingMsg) {
    loadingMsg.classList.remove("loading");
    const textElement = loadingMsg.querySelector(".message-text");
    if (textElement.textContent === "Just a sec...") {
      textElement.textContent = "Response generation stopped.";
      textElement.style.color = "#d62939";
    }
  }
  
  document.body.classList.remove("bot-responding");
});

// Toggle dark/light theme
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", (e) => {
  e.preventDefault();
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
  userData.files = [];
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active", "has-files");
  const badge = document.querySelector(".file-count-badge");
  if (badge) badge.remove();
});

// Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || 
    (wrapper.classList.contains("hide-controls") && 
    (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

// Add event listeners for form submission and file input click
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => {
  fileInput.setAttribute("multiple", "");
  fileInput.click();
});