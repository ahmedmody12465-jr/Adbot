const express = require("express");
const path = require("path");
const db = require("./db");
const {
    loadTrainingData,
    filterAdsByCategoryAndInterests,
    generateSmartChatReply
} = require("./chatbotBrain");
const {
    recordEvent,
    recordChatInteraction,
    getAnalyticsSummary,
    resetAnalytics
} = require("./analyticsStore");

const app = express();
const PORT = process.env.PORT || 3001;

// Fallback catalog used when MySQL is not running or configured
const DEFAULT_CATEGORIES = [
    { category_id: 1, category_name: "Children" },
    { category_id: 2, category_name: "Teenagers" },
    { category_id: 3, category_name: "Adults" },
    { category_id: 4, category_name: "Family" },
    { category_id: 5, category_name: "Friends" },
    { category_id: 6, category_name: "Visitors" }
];

const DEFAULT_ADVERTISEMENTS = [
    // Children
    {
        ad_id: 1,
        title: "Kids Fun Zone & Arcade",
        description: "Fun playground games, interactive activities, and arcade surprises for kids.",
        video_url: "videos/children.mp4",
        category_name: "Children",
        interests: ["Gaming", "Travel"]
    },
    {
        ad_id: 2,
        title: "Children Story & Cartoon World",
        description: "Magical stories and creative animation experiences for young minds.",
        video_url: "videos/children2.mp4",
        category_name: "Children",
        interests: ["Entertainment", "Shopping"]
    },
    {
        ad_id: 3,
        title: "Kids Toy & Gift Wonderland",
        description: "Special discounts on educational toys, games, and gifts for children.",
        video_url: "videos/children3.mp4",
        category_name: "Children",
        interests: ["Shopping", "Gaming"]
    },
    {
        ad_id: 4,
        title: "Sweet Treats & Kids Meal Deals",
        description: "Delicious kids meals, ice cream, and fun family restaurant treats.",
        video_url: "videos/children4.mp4",
        category_name: "Children",
        interests: ["Food", "Entertainment"]
    },
    {
        ad_id: 5,
        title: "Junior Adventure & Play Park",
        description: "Exciting outdoor rides, kids theme park passes, and weekend fun.",
        video_url: "videos/children5.mp4",
        category_name: "Children",
        interests: ["Travel", "Entertainment"]
    },
    // Teenagers
    {
        ad_id: 6,
        title: "Youth Tech & Gaming Hub",
        description: "Latest gaming consoles, gadgets, and trendy tech deals for teenagers.",
        video_url: "videos/visitors.mp4",
        category_name: "Teenagers",
        interests: ["Gaming", "Shopping"]
    },
    {
        ad_id: 7,
        title: "Cinema & Music Hangout Pass",
        description: "Student discounts on movie tickets, live music nights, and snacks.",
        video_url: "videos/visitors5.mp4",
        category_name: "Teenagers",
        interests: ["Entertainment", "Food"]
    },
    {
        ad_id: 8,
        title: "Streetwear & Trendy Gear Sale",
        description: "Fresh fashion, sneakers, and accessories curated for teens.",
        video_url: "videos/visitors2.mp4",
        category_name: "Teenagers",
        interests: ["Shopping", "Entertainment"]
    },
    {
        ad_id: 9,
        title: "VR Arena & Adventure Park",
        description: "High-energy VR gaming sessions and thrill rides for teens.",
        video_url: "videos/children5.mp4",
        category_name: "Teenagers",
        interests: ["Travel", "Gaming"]
    },
    {
        ad_id: 10,
        title: "Burger & Boba Teen Combos",
        description: "Exclusive teen hangout combos at top burger spots and boba cafes.",
        video_url: "videos/children4.mp4",
        category_name: "Teenagers",
        interests: ["Food", "Entertainment"]
    },
    // Adults
    {
        ad_id: 11,
        title: "Gourmet Dining Experience",
        description: "Fine dining and exclusive discounts at top-tier restaurants for adults.",
        video_url: "videos/visitors2.mp4",
        category_name: "Adults",
        interests: ["Food", "Travel"]
    },
    {
        ad_id: 12,
        title: "Smart Gadgets & Lifestyle Store",
        description: "Exclusive offers on smartwatches, audio gear, and tech accessories.",
        video_url: "videos/visitors.mp4",
        category_name: "Adults",
        interests: ["Gaming", "Shopping"]
    },
    {
        ad_id: 13,
        title: "Luxury Getaway & City Tours",
        description: "Curated weekend trips, boutique stays, and guided city experiences.",
        video_url: "videos/visitors4.mp4",
        category_name: "Adults",
        interests: ["Travel", "Food"]
    },
    {
        ad_id: 14,
        title: "VIP Cinema & Live Shows",
        description: "Premium theater seating, concerts, and cultural night passes.",
        video_url: "videos/visitors3.mp4",
        category_name: "Adults",
        interests: ["Entertainment", "Food"]
    },
    // Family
    {
        ad_id: 15,
        title: "Family Weekend Adventure Park",
        description: "Special family packages, theme park passes, and bundle discounts.",
        video_url: "videos/visitors3.mp4",
        category_name: "Family",
        interests: ["Travel", "Entertainment"]
    },
    {
        ad_id: 16,
        title: "Family Feast & Restaurant Bundle",
        description: "Save big on family-sized meals and weekend dining bundles.",
        video_url: "videos/children4.mp4",
        category_name: "Family",
        interests: ["Food", "Shopping"]
    },
    {
        ad_id: 17,
        title: "Family Movie Night & Arcade",
        description: "Combo tickets for family blockbusters plus arcade game tokens.",
        video_url: "videos/children2.mp4",
        category_name: "Family",
        interests: ["Entertainment", "Gaming"]
    },
    {
        ad_id: 18,
        title: "Family Mall & Gift Shopping",
        description: "Bundle offers on apparel, toys, and home essentials for the whole family.",
        video_url: "videos/children3.mp4",
        category_name: "Family",
        interests: ["Shopping", "Travel"]
    },
    // Friends
    {
        ad_id: 19,
        title: "Friends Cafe & Lounge Deals",
        description: "Group discounts on cafes, restaurants, and hangout spots for friends.",
        video_url: "videos/visitors5.mp4",
        category_name: "Friends",
        interests: ["Food", "Entertainment"]
    },
    {
        ad_id: 20,
        title: "Multiplayer Gaming & Bowling Night",
        description: "Squad packages for esports lounges, bowling alleys, and arcades.",
        video_url: "videos/visitors.mp4",
        category_name: "Friends",
        interests: ["Gaming", "Entertainment"]
    },
    {
        ad_id: 21,
        title: "Group Roadtrip & Escape Rooms",
        description: "Discounted group adventures, escape rooms, and weekend day trips.",
        video_url: "videos/visitors4.mp4",
        category_name: "Friends",
        interests: ["Travel", "Gaming"]
    },
    {
        ad_id: 22,
        title: "Group Shopping & Fashion Deals",
        description: "Buy-more-save-more fashion and lifestyle vouchers for friend groups.",
        video_url: "videos/visitors2.mp4",
        category_name: "Friends",
        interests: ["Shopping", "Food"]
    },
    // Visitors
    {
        ad_id: 23,
        title: "City Explorer Sightseeing Pass",
        description: "Tour popular city landmarks and attractions with visitor-exclusive offers.",
        video_url: "videos/visitors4.mp4",
        category_name: "Visitors",
        interests: ["Travel", "Entertainment"]
    },
    {
        ad_id: 24,
        title: "Local Cuisine & Fine Dining Tour",
        description: "Taste authentic local dishes and top-rated restaurants at special prices.",
        video_url: "videos/visitors2.mp4",
        category_name: "Visitors",
        interests: ["Food", "Travel"]
    },
    {
        ad_id: 25,
        title: "Souvenir & Duty-Free Shopping",
        description: "Visitor discounts on gifts, crafts, and duty-free mall boutiques.",
        video_url: "videos/visitors5.mp4",
        category_name: "Visitors",
        interests: ["Shopping", "Travel"]
    },
    {
        ad_id: 26,
        title: "Cultural Shows & Entertainment Pass",
        description: "Live performances, museums, and evening entertainment for visitors.",
        video_url: "videos/visitors3.mp4",
        category_name: "Visitors",
        interests: ["Entertainment", "Gaming"]
    }
];

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.json());
app.use(express.static(__dirname));

// Home Page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Test API
app.get("/api", (req, res) => {
    res.send("Welcome to AdBot Backend!");
});

// Test Database Connection
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS result");

        res.json({
            message: "Database connected successfully!",
            result: rows[0].result
        });
    } catch (error) {
        console.error("Database Error:", error.message);

        res.status(500).json({
            message: "Database connection failed."
        });
    }
});

// Get All Categories
app.get("/api/categories", async (req, res) => {
    try {
        const [categories] = await db.query(
            "SELECT * FROM categories"
        );

        res.json({
            message: "Categories retrieved successfully!",
            data: categories
        });
    } catch (error) {
        console.warn("MySQL unavailable for /api/categories, using fallback data:", error.message);

        res.json({
            message: "Categories retrieved successfully (local fallback)!",
            data: DEFAULT_CATEGORIES
        });
    }
});

// Get Available Interests
app.get("/api/interests", (req, res) => {
    const training = loadTrainingData();
    res.json({
        message: "Interests retrieved successfully!",
        data: training.interests || []
    });
});

// Get Advertisements By Category (and optional ?interests=Gaming,Food)
app.get("/api/advertisements/:categoryName", async (req, res) => {
    const categoryName = req.params.categoryName;
    const interestsParam = req.query.interests || "";
    const selectedInterests = interestsParam
        ? interestsParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    try {
        const [advertisements] = await db.query(
            `SELECT
                a.ad_id,
                a.title,
                a.description,
                a.video_url
             FROM advertisements a
             JOIN categories c
             ON a.category_id = c.category_id
             WHERE c.category_name = ?`,
            [categoryName]
        );

        const filtered = filterAdsByCategoryAndInterests(
            advertisements,
            null,
            selectedInterests
        );

        res.json({
            message: "Advertisements retrieved successfully!",
            data: filtered
        });

    } catch (error) {
        console.warn("MySQL unavailable for /api/advertisements, using fallback data:", error.message);

        const filteredAds = filterAdsByCategoryAndInterests(
            DEFAULT_ADVERTISEMENTS,
            categoryName,
            selectedInterests
        );

        res.json({
            message: "Advertisements retrieved successfully (local fallback)!",
            data: filteredAds
        });
    }
});

// Chatbot Endpoint (proxies to Python FastAPI if running, otherwise uses trained local NLU)
app.post("/api/chat", async (req, res) => {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
            signal: AbortSignal.timeout(1500)
        });
        if (!response.ok) {
            throw new Error("FastAPI responded with " + response.status);
        }
        const data = await response.json();
        recordChatInteraction({
            message: req.body?.message || "",
            detectedCategory: data.detected_age_group,
            detectedInterests: data.detected_interests || req.body?.interests || []
        });
        res.json(data);
    } catch (error) {
        const result = generateSmartChatReply({
            message: req.body?.message || "",
            ageGroup: req.body?.age_group,
            userAge: req.body?.user_age,
            interests: req.body?.interests || [],
            ads: DEFAULT_ADVERTISEMENTS
        });
        recordChatInteraction({
            message: req.body?.message || "",
            detectedCategory: result.detected_age_group,
            detectedInterests: result.detected_interests
        });
        res.json(result);
    }
});

// Analytics: Track visitor events
app.post("/api/analytics/event", (req, res) => {
    try {
        recordEvent(req.body || {});
        res.json({ status: "recorded" });
    } catch (error) {
        console.error("Analytics event error:", error.message);
        res.status(500).json({ message: "Failed to record analytics event." });
    }
});

// Analytics: Get complete dashboard summary
app.get("/api/analytics", (req, res) => {
    try {
        const summary = getAnalyticsSummary(DEFAULT_ADVERTISEMENTS);
        res.json(summary);
    } catch (error) {
        console.error("Analytics read error:", error.message);
        res.status(500).json({ message: "Failed to load analytics." });
    }
});

// Analytics: Reset all stored analytics
app.post("/api/analytics/reset", (req, res) => {
    try {
        resetAnalytics();
        res.json({ status: "reset", message: "Analytics cleared." });
    } catch (error) {
        console.error("Analytics reset error:", error.message);
        res.status(500).json({ message: "Failed to reset analytics." });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`AdBot Server is running on http://localhost:${PORT}`);
});
