/* ==========================================================================
   AdBot AI Chatbot Widget
   ========================================================================== */

(function () {
    // Determine backend API endpoint
    const API_CHAT_ENDPOINT = (window.location.port === "8000" || window.location.port === "3001")
        ? "/api/chat"
        : "http://localhost:3001/api/chat";

    let currentAgeGroup = localStorage.getItem("selectedCategory") || "Children";

    function getStoredInterests() {
        try {
            const parsed = JSON.parse(localStorage.getItem("selectedInterests") || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    // Inject Chatbot HTML
    function initChatbotUI() {
        if (document.getElementById("adbot-chat-container")) return;

        const storedInterests = getStoredInterests();
        const welcomeInterestNote = storedInterests.length > 0
            ? `<br><small>Active interests: <strong>${storedInterests.join(", ")}</strong></small>`
            : "";

        const container = document.createElement("div");
        container.id = "adbot-chat-container";
        container.className = "adbot-chat-wrapper";

        container.innerHTML = `
            <!-- Chat Trigger Button -->
            <button id="adbot-chat-toggle" class="adbot-chat-toggle-btn" aria-label="Open AI Assistant">
                <span class="chat-icon">🤖</span>
                <span class="chat-toggle-text">Ask AI</span>
                <span class="chat-badge-pulse"></span>
            </button>

            <!-- Chat Window Box -->
            <div id="adbot-chat-window" class="adbot-chat-window hidden">
                <!-- Header -->
                <div class="adbot-chat-header">
                    <div class="adbot-header-info">
                        <div class="adbot-avatar">🤖</div>
                        <div>
                            <h4>AdBot AI Assistant</h4>
                            <span class="status-online"><span class="dot"></span> Online • EN / AR</span>
                        </div>
                    </div>
                    <button id="adbot-chat-close" class="adbot-close-btn">&times;</button>
                </div>

                <!-- Age Category Selector Quick Chips -->
                <div class="adbot-age-chips">
                    <span class="chips-label">Target:</span>
                    <button class="chip ${currentAgeGroup === 'Children' ? 'active' : ''}" data-age="Children">🧒 Kids</button>
                    <button class="chip ${currentAgeGroup === 'Teenagers' ? 'active' : ''}" data-age="Teenagers">🧑 Teens</button>
                    <button class="chip ${currentAgeGroup === 'Adults' ? 'active' : ''}" data-age="Adults">👨 Adults</button>
                    <button class="chip ${currentAgeGroup === 'Family' ? 'active' : ''}" data-age="Family">👨‍👩‍👧‍👦 Family</button>
                    <button class="chip ${currentAgeGroup === 'Friends' ? 'active' : ''}" data-age="Friends">👫 Friends</button>
                    <button class="chip ${currentAgeGroup === 'Visitors' ? 'active' : ''}" data-age="Visitors">👋 Visitors</button>
                </div>

                <!-- Messages Container -->
                <div id="adbot-messages" class="adbot-messages-area">
                    <div class="chat-msg bot">
                        <div class="msg-bubble">
                            Hello! 👋 I'm your trained <strong>AdBot AI</strong> assistant (English &amp; عربي).
                            Ask me for offers by category, age, or interests (Gaming, Food, Entertainment, Shopping, Travel)!${welcomeInterestNote}
                        </div>
                    </div>
                </div>

                <!-- Quick Trained Prompts -->
                <div class="adbot-quick-prompts" id="adbot-quick-prompts">
                    <button type="button" class="quick-prompt-btn" data-prompt="Best offers for me">🔥 Best for me</button>
                    <button type="button" class="quick-prompt-btn" data-prompt="Food deals">🍔 Food</button>
                    <button type="button" class="quick-prompt-btn" data-prompt="Gaming offers">🎮 Gaming</button>
                    <button type="button" class="quick-prompt-btn" data-prompt="عروض الترفيه والسينما">🎬 عربي</button>
                    <button type="button" class="quick-prompt-btn" data-prompt="How to get coupon?">🎟️ Coupon</button>
                </div>

                <!-- Input Footer -->
                <form id="adbot-input-form" class="adbot-input-area">
                    <input 
                        type="text" 
                        id="adbot-user-input" 
                        placeholder="Ask in English or عربي..." 
                        autocomplete="off"
                        required
                    />
                    <button type="submit" id="adbot-send-btn" class="send-btn" aria-label="Send">
                        ➤
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(container);
        setupChatbotEvents();
    }

    // Bind UI Interactions
    function setupChatbotEvents() {
        const toggleBtn = document.getElementById("adbot-chat-toggle");
        const closeBtn = document.getElementById("adbot-chat-close");
        const chatWindow = document.getElementById("adbot-chat-window");
        const form = document.getElementById("adbot-input-form");
        const input = document.getElementById("adbot-user-input");
        const chips = document.querySelectorAll(".adbot-age-chips .chip");

        // Toggle open/close
        toggleBtn.addEventListener("click", () => {
            chatWindow.classList.toggle("hidden");
            if (!chatWindow.classList.contains("hidden")) {
                input.focus();
            }
        });

        closeBtn.addEventListener("click", () => {
            chatWindow.classList.add("hidden");
        });

        // Age chip selection
        chips.forEach(chip => {
            chip.addEventListener("click", (e) => {
                chips.forEach(c => c.classList.remove("active"));
                e.currentTarget.classList.add("active");
                currentAgeGroup = e.currentTarget.getAttribute("data-age");
                localStorage.setItem("selectedCategory", currentAgeGroup);
                
                appendMessage("bot", `Great! I've set your category to <strong>${currentAgeGroup}</strong>. How can I help you find offers?`);
            });
        });

        // Quick prompt buttons
        document.querySelectorAll(".quick-prompt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                input.value = btn.getAttribute("data-prompt");
                form.dispatchEvent(new Event("submit", { cancelable: true }));
            });
        });

        // Form Submission
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            // Render user bubble
            appendMessage("user", text);
            input.value = "";

            // Show typing indicator
            const typingId = showTypingIndicator();

            try {
                const response = await fetch(API_CHAT_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        age_group: currentAgeGroup,
                        interests: getStoredInterests()
                    })
                });

                removeTypingIndicator(typingId);

                if (!response.ok) {
                    throw new Error("Chat service responded with " + response.status);
                }

                const data = await response.json();

                if (data.detected_age_group) {
                    currentAgeGroup = data.detected_age_group;
                    chips.forEach(c => {
                        c.classList.toggle("active", c.getAttribute("data-age") === currentAgeGroup);
                    });
                }

                // Render bot reply with recommended ads if present
                appendBotReplyWithAds(data.reply, data.recommended_ads || []);

            } catch (err) {
                console.error("Chat error:", err);
                removeTypingIndicator(typingId);
                appendMessage("bot", "I am currently unable to reach the AI service. Please ensure the server is running.");
            }
        });
    }

    // Append standard message
    function appendMessage(sender, htmlText) {
        const area = document.getElementById("adbot-messages");
        if (!area) return;

        const row = document.createElement("div");
        row.className = `chat-msg ${sender}`;

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        bubble.innerHTML = htmlText;

        row.appendChild(bubble);
        area.appendChild(row);
        area.scrollTop = area.scrollHeight;
    }

    // Append Bot Reply along with interactive Ad cards
    function appendBotReplyWithAds(replyText, ads) {
        const area = document.getElementById("adbot-messages");
        if (!area) return;

        const row = document.createElement("div");
        row.className = "chat-msg bot";

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        bubble.innerHTML = replyText;

        // Render mini ad card recommendations
        if (ads && ads.length > 0) {
            const adsList = document.createElement("div");
            adsList.className = "chat-ads-recommendations";

            ads.slice(0, 2).forEach(ad => {
                const adItem = document.createElement("div");
                adItem.className = "chat-ad-item";
                adItem.innerHTML = `
                    <div class="chat-ad-title">📢 ${ad.title}</div>
                    <div class="chat-ad-desc">${ad.description}</div>
                    <button class="chat-ad-btn">View Offer</button>
                `;

                adItem.querySelector("button").addEventListener("click", () => {
                    const offerCategory = ad.category_name || currentAgeGroup;
                    try {
                        const eventEndpoint = API_CHAT_ENDPOINT.replace("/api/chat", "/api/analytics/event");
                        fetch(eventEndpoint, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            keepalive: true,
                            body: JSON.stringify({
                                type: "offer_click",
                                visitorId: localStorage.getItem("adbotVisitorId") || "chat-user",
                                title: ad.title,
                                category: offerCategory
                            })
                        }).catch(() => {});
                    } catch (e) {}
                    localStorage.setItem("selectedOfferTitle", ad.title);
                    localStorage.setItem("selectedOfferDescription", ad.description);
                    localStorage.setItem("selectedOfferCategory", offerCategory);
                    window.location.href = "coupon.html";
                });

                adsList.appendChild(adItem);
            });

            bubble.appendChild(adsList);
        }

        row.appendChild(bubble);
        area.appendChild(row);
        area.scrollTop = area.scrollHeight;
    }

    // Typing animation
    function showTypingIndicator() {
        const area = document.getElementById("adbot-messages");
        const typingId = "typing-" + Date.now();
        const row = document.createElement("div");
        row.id = typingId;
        row.className = "chat-msg bot typing";
        row.innerHTML = `
            <div class="msg-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        area.appendChild(row);
        area.scrollTop = area.scrollHeight;
        return typingId;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Initialize on DOM load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initChatbotUI);
    } else {
        initChatbotUI();
    }
})();
