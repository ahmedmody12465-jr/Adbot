
/* =====================================
   API BASE URL
===================================== */

const API_BASE = (window.location.port === "8000" || window.location.port === "3001")
    ? ""
    : "http://localhost:3001";

/* =====================================
   ANALYTICS TRACKING HELPERS
===================================== */

function getVisitorId() {
    let id = localStorage.getItem("adbotVisitorId");
    if (!id) {
        id = "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        localStorage.setItem("adbotVisitorId", id);
    }
    return id;
}

function trackEvent(payload) {
    try {
        fetch(`${API_BASE}/api/analytics/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
                visitorId: getVisitorId(),
                ...payload
            })
        }).catch(function() {});
    } catch (e) {}
}

function trackVisitAndPageView() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    if (!sessionStorage.getItem("adbotSessionVisited")) {
        sessionStorage.setItem("adbotSessionVisited", "1");
        trackEvent({ type: "visit", page: page });
    }
    trackEvent({ type: "page_view", page: page });
}

/* =====================================
   LOAD CATEGORIES FROM DATABASE
===================================== */

async function loadCategories() {

    const categoriesContainer =
        document.getElementById("category-cards");

    if (!categoriesContainer) return;

    try {

        const response = await fetch(`${API_BASE}/api/categories`);

        if (!response.ok) {
            throw new Error("Failed to load categories");
        }

        const result = await response.json();

        const categoryIcons = {
            Children: "🧒",
            Teenagers: "🧑",
            Adults: "👨",
            Family: "👨‍👩‍👧‍👦",
            Friends: "👫",
            Visitors: "👋"
        };

        const categoryDescriptions = {
            Children: "Fun offers and exciting experiences for children.",
            Teenagers: "Discover exciting deals and trendy offers.",
            Adults: "Explore products and offers made for adults.",
            Family: "Enjoy special offers for the whole family.",
            Friends: "Find great deals to enjoy with your friends.",
            Visitors: "Discover interesting offers and experiences."
        };

        categoriesContainer.innerHTML = "";

        result.data.forEach(function(category) {

            const categoryName = category.category_name;

            const card = document.createElement("div");
            card.className = "category-card";

            const icon = document.createElement("div");
            icon.className = "category-icon";
            icon.textContent = categoryIcons[categoryName] || "📢";

            const title = document.createElement("h3");
            title.textContent = categoryName;

            const description = document.createElement("p");
            description.textContent =
                categoryDescriptions[categoryName] ||
                "Discover our offers.";

            const button = document.createElement("button");
            button.textContent = "Select";

            button.addEventListener("click", function() {
                selectCategory(categoryName);
            });

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(description);
            card.appendChild(button);

            categoriesContainer.appendChild(card);

        });

    } catch (error) {

        console.error("Categories Error:", error);

        categoriesContainer.innerHTML =
            "<p>Unable to load categories. Please try again.</p>";

    }

}


/* =====================================
   SELECT CATEGORY
===================================== */

function selectCategory(category) {

    localStorage.setItem("selectedCategory", category);
    localStorage.removeItem("selectedInterests");
    trackEvent({ type: "category_select", category: category });

    window.location.href = "interests.html";

}


/* =====================================
   LOAD INTERESTS STEP
===================================== */

async function loadInterests() {

    const interestsContainer =
        document.getElementById("interest-cards");

    if (!interestsContainer) return;

    const selectedCategory =
        localStorage.getItem("selectedCategory");

    if (!selectedCategory) {
        window.location.href = "categories.html";
        return;
    }

    const badge =
        document.getElementById("selected-category-badge");

    if (badge) {
        badge.textContent =
            "CATEGORY: " + selectedCategory.toUpperCase() + " • STEP 2";
    }

    let chosenInterests = [];
    try {
        chosenInterests = JSON.parse(
            localStorage.getItem("selectedInterests") || "[]"
        );
    } catch (e) {
        chosenInterests = [];
    }

    try {

        const response = await fetch(`${API_BASE}/api/interests`);

        if (!response.ok) {
            throw new Error("Failed to load interests");
        }

        const result = await response.json();

        interestsContainer.innerHTML = "";

        result.data.forEach(function(interest) {

            const card = document.createElement("div");
            card.className = "category-card interest-card";
            if (chosenInterests.includes(interest.id)) {
                card.classList.add("selected");
            }

            const icon = document.createElement("div");
            icon.className = "category-icon";
            icon.textContent = interest.icon || "✨";

            const title = document.createElement("h3");
            title.textContent = interest.label || interest.id;

            const description = document.createElement("p");
            description.textContent =
                interest.description || "Explore matching video offers.";

            const statusBtn = document.createElement("button");
            statusBtn.type = "button";
            statusBtn.textContent =
                chosenInterests.includes(interest.id) ? "Selected ✓" : "Choose";

            function toggleInterest() {
                const idx = chosenInterests.indexOf(interest.id);
                if (idx >= 0) {
                    chosenInterests.splice(idx, 1);
                    card.classList.remove("selected");
                    statusBtn.textContent = "Choose";
                } else {
                    chosenInterests.push(interest.id);
                    card.classList.add("selected");
                    statusBtn.textContent = "Selected ✓";
                }
                localStorage.setItem(
                    "selectedInterests",
                    JSON.stringify(chosenInterests)
                );
            }

            card.addEventListener("click", toggleInterest);

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(description);
            card.appendChild(statusBtn);

            interestsContainer.appendChild(card);

        });

    } catch (error) {

        console.error("Interests Error:", error);

        interestsContainer.innerHTML =
            "<p>Unable to load interests. Please try again.</p>";

    }

    const continueBtn =
        document.getElementById("continue-to-ads-btn");
    const skipBtn =
        document.getElementById("skip-interests-btn");

    if (continueBtn) {
        continueBtn.addEventListener("click", function() {
            localStorage.setItem(
                "selectedInterests",
                JSON.stringify(chosenInterests)
            );
            trackEvent({
                type: "interests_select",
                category: selectedCategory,
                interests: chosenInterests
            });
            window.location.href = "ads.html";
        });
    }

    if (skipBtn) {
        skipBtn.addEventListener("click", function() {
            localStorage.setItem("selectedInterests", JSON.stringify([]));
            window.location.href = "ads.html";
        });
    }

}


/* =====================================
   LOAD ADVERTISEMENTS FROM DATABASE
===================================== */

async function displaySelectedCategory() {

    const selectedCategory =
        localStorage.getItem("selectedCategory");

    let selectedInterests = [];
    try {
        selectedInterests = JSON.parse(
            localStorage.getItem("selectedInterests") || "[]"
        );
    } catch (e) {
        selectedInterests = [];
    }

    const categoryElement =
        document.getElementById("selected-category");

    const interestsElement =
        document.getElementById("selected-interests");

    const adsContainer =
        document.getElementById("ads-container");

    if (!categoryElement || !adsContainer) return;

    if (!selectedCategory) {

        categoryElement.textContent = "No category selected";

        adsContainer.innerHTML =
            "<p>Please select a category first.</p>";

        return;
    }

    categoryElement.textContent =
        "Category: " + selectedCategory;

    if (interestsElement) {
        interestsElement.textContent =
            selectedInterests.length > 0
                ? "Interests: " + selectedInterests.join(" • ")
                : "Interests: All";
    }

    adsContainer.innerHTML =
        "<p>Loading advertisements...</p>";

    try {

        const query =
            selectedInterests.length > 0
                ? "?interests=" + encodeURIComponent(selectedInterests.join(","))
                : "";

        const response = await fetch(
            `${API_BASE}/api/advertisements/` +
            encodeURIComponent(selectedCategory) +
            query
        );

        if (!response.ok) {
            throw new Error("Failed to load advertisements");
        }

        const result = await response.json();

        const categoryAds = result.data;

        adsContainer.innerHTML = "";

        if (categoryAds.length === 0) {

            adsContainer.innerHTML =
                "<p>No advertisements available yet.</p>";

            return;
        }

        categoryAds.forEach(function(ad) {

            const adCard = document.createElement("div");
            adCard.className = "ad-card";

            const video = document.createElement("video");
            video.controls = true;

            let playTracked = false;
            let completeTracked = false;
            video.addEventListener("play", function() {
                if (!playTracked) {
                    playTracked = true;
                    trackEvent({
                        type: "video_play",
                        adId: ad.ad_id,
                        title: ad.title,
                        category: selectedCategory,
                        videoUrl: ad.video_url,
                        interests: ad.interests || []
                    });
                }
            });
            video.addEventListener("ended", function() {
                if (!completeTracked) {
                    completeTracked = true;
                    trackEvent({
                        type: "video_complete",
                        adId: ad.ad_id,
                        title: ad.title,
                        category: selectedCategory,
                        videoUrl: ad.video_url
                    });
                }
            });

            const source = document.createElement("source");
            source.src = ad.video_url;
            source.type = "video/mp4";

            video.appendChild(source);

            const title = document.createElement("h3");
            title.textContent = ad.title;

            const description = document.createElement("p");
            description.textContent = ad.description;

            adCard.appendChild(video);
            adCard.appendChild(title);
            adCard.appendChild(description);

            if (Array.isArray(ad.interests) && ad.interests.length > 0) {
                const tagsRow = document.createElement("div");
                tagsRow.className = "ad-tags";
                ad.interests.forEach(function(tag) {
                    const badge = document.createElement("span");
                    badge.className = "ad-tag";
                    badge.textContent = tag;
                    tagsRow.appendChild(badge);
                });
                adCard.appendChild(tagsRow);
            }

            const offerButton = document.createElement("button");
            offerButton.className = "get-offer-btn";
            offerButton.textContent = "Get Offer";

            offerButton.addEventListener("click", function() {

                trackEvent({
                    type: "offer_click",
                    title: ad.title,
                    category: selectedCategory
                });

                localStorage.setItem(
                    "selectedOfferTitle",
                    ad.title
                );

                localStorage.setItem(
                    "selectedOfferDescription",
                    ad.description
                );

                localStorage.setItem(
                    "selectedOfferCategory",
                    selectedCategory
                );

                window.location.href = "coupon.html";

            });

            adCard.appendChild(offerButton);

            adsContainer.appendChild(adCard);

        });

    } catch (error) {

        console.error("Advertisements Error:", error);

        adsContainer.innerHTML =
            "<p>Unable to load advertisements. Please try again.</p>";

    }

}


/* =====================================
   DISPLAY COUPON DETAILS
===================================== */

function displayCouponDetails() {

    const title =
        localStorage.getItem("selectedOfferTitle");

    const description =
        localStorage.getItem("selectedOfferDescription");

    const category =
        localStorage.getItem("selectedOfferCategory");

    const couponTitle =
        document.getElementById("coupon-title");

    const couponDescription =
        document.getElementById("coupon-description");

    const qrContainer =
        document.getElementById("qr-code");

    const discountCodeElement =
        document.getElementById("discount-code");

    if (!couponTitle || !couponDescription || !qrContainer) {
        return;
    }

    couponTitle.textContent =
        title || "Special Offer";

    couponDescription.textContent =
        description || "Enjoy your exclusive offer.";

    // Generate Discount Code

    const safeCategory = (category || "GENERAL")
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase();

    const safeTitle = (title || "OFFER")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .substring(0, 6);

    const discountCode =
        "ADBOT-" +
        safeCategory.substring(0, 3) +
        "-" +
        safeTitle +
        "-2026";

    if (discountCodeElement) {
        discountCodeElement.textContent = discountCode;
    }

    // Generate QR Code

    qrContainer.innerHTML = "";

    if (typeof QRCode !== "undefined") {

        const offerDetails =
            "AdBot Offer\n" +
            "Category: " + (category || "General") + "\n" +
            "Advertisement: " + (title || "Special Offer") + "\n" +
            "Discount Code: " + discountCode + "\n" +
            "Description: " +
            (description || "Enjoy your exclusive offer.");

        new QRCode(qrContainer, {
            text: offerDetails,
            width: 180,
            height: 180
        });

    } else {

        qrContainer.textContent =
            "QR Code library could not be loaded.";

    }

}


/* =====================================
   COPY DISCOUNT CODE
===================================== */

function copyDiscountCode() {

    const discountCodeElement =
        document.getElementById("discount-code");

    const copyMessage =
        document.getElementById("copy-message");

    const copyButton =
        document.getElementById("copy-code-btn");

    if (!discountCodeElement || !copyMessage || !copyButton) {
        return;
    }

    const discountCode =
        discountCodeElement.textContent;

    navigator.clipboard.writeText(discountCode)

        .then(function() {

            copyMessage.textContent =
                "Code Copied Successfully!";

            copyButton.textContent = "Copied!";

        })

        .catch(function() {

            copyMessage.textContent =
                "Unable to copy the code.";

        });

}


/* =====================================
   RUN WHEN PAGE LOADS
===================================== */

document.addEventListener("DOMContentLoaded", function() {

    trackVisitAndPageView();

    loadCategories();

    loadInterests();

    displaySelectedCategory();

    displayCouponDetails();

    const copyButton =
        document.getElementById("copy-code-btn");

    if (copyButton) {
        copyButton.addEventListener(
            "click",
            copyDiscountCode
        );
    }

});
