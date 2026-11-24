const fs = require("fs");
const path = require("path");

const TRAINING_PATH = path.join(__dirname, "data", "chatbot-training.json");

function loadTrainingData() {
    try {
        const raw = fs.readFileSync(TRAINING_PATH, "utf-8");
        return JSON.parse(raw);
    } catch (err) {
        console.warn("Could not load chatbot-training.json:", err.message);
        return { interests: [], categories: {}, intents: [] };
    }
}

function isArabicText(text) {
    return /[\u0600-\u06FF]/.test(text || "");
}

function normalizeText(text) {
    return (text || "")
        .toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .trim();
}

function matchKeyword(normalizedMsg, keyword) {
    const kw = normalizeText(keyword);
    if (!kw) return false;
    // Use word-boundary matching for short ASCII words so e.g. "hi" doesn't match "this"
    if (/^[a-z0-9 ]+$/.test(kw)) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "i");
        return regex.test(normalizedMsg);
    }
    return normalizedMsg.includes(kw);
}

function detectAgeFromText(text) {
    const match = (text || "").match(/\b(\d{1,2})\b/);
    if (!match) return null;
    const age = parseInt(match[1], 10);
    if (isNaN(age) || age < 1 || age > 99) return null;

    // Only treat number as age if age context exists or message is very short
    const norm = normalizeText(text);
    const hasAgeContext = /(age|years|yr|old|سنه|سنين|عمر|عمري|عندي|ابني|بنتي)/i.test(norm) || norm.split(/\s+/).length <= 3;
    if (!hasAgeContext) return null;

    if (age <= 12) return "Children";
    if (age <= 19) return "Teenagers";
    return "Adults";
}

function detectCategory(normalizedMsg, training, fallbackCategory) {
    for (const [category, keywords] of Object.entries(training.categories || {})) {
        if (keywords.some((kw) => matchKeyword(normalizedMsg, kw))) {
            return category;
        }
    }
    const ageCategory = detectAgeFromText(normalizedMsg);
    if (ageCategory) return ageCategory;
    return fallbackCategory || "Children";
}

function detectInterests(normalizedMsg, training, selectedInterests) {
    const detected = [];
    for (const item of training.interests || []) {
        if ((item.keywords || []).some((kw) => matchKeyword(normalizedMsg, kw))) {
            detected.push(item.id);
        }
    }
    if (detected.length > 0) return detected;
    if (Array.isArray(selectedInterests) && selectedInterests.length > 0) {
        return selectedInterests;
    }
    return [];
}

function detectIntent(normalizedMsg, training) {
    for (const intent of training.intents || []) {
        if ((intent.patterns || []).some((p) => matchKeyword(normalizedMsg, p))) {
            return intent;
        }
    }
    return null;
}

function filterAdsByCategoryAndInterests(ads, categoryName, interests) {
    let pool = ads;
    if (categoryName) {
        const catMatches = ads.filter(
            (ad) => (ad.category_name || "").toLowerCase() === categoryName.toLowerCase()
        );
        if (catMatches.length > 0) {
            pool = catMatches;
        }
    }

    if (!Array.isArray(interests) || interests.length === 0) {
        return pool;
    }

    const interestSet = new Set(interests.map((i) => String(i).trim().toLowerCase()).filter(Boolean));
    if (interestSet.size === 0) return pool;

    const scored = pool
        .map((ad) => {
            const adInterests = (ad.interests || []).map((i) => i.toLowerCase());
            const score = adInterests.filter((i) => interestSet.has(i)).length;
            return { ad, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
        return scored.map((entry) => entry.ad);
    }

    // If no ad in that category matches the interest directly, try matching across all ads
    const crossCategory = ads
        .map((ad) => {
            const adInterests = (ad.interests || []).map((i) => i.toLowerCase());
            const score = adInterests.filter((i) => interestSet.has(i)).length;
            return { ad, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    return crossCategory.length > 0 ? crossCategory.map((e) => e.ad) : pool;
}

function generateSmartChatReply({ message, ageGroup, userAge, interests, ads }) {
    const training = loadTrainingData();
    const arabic = isArabicText(message);
    const norm = normalizeText(message);

    let resolvedCategory = ageGroup || "Children";
    if (userAge !== undefined && userAge !== null) {
        if (userAge <= 12) resolvedCategory = "Children";
        else if (userAge <= 19) resolvedCategory = "Teenagers";
        else resolvedCategory = "Adults";
    }
    resolvedCategory = detectCategory(norm, training, resolvedCategory);

    const detectedInterests = detectInterests(norm, training, interests);
    const explicitInterestMentioned = (training.interests || []).some((item) =>
        (item.keywords || []).some((kw) => matchKeyword(norm, kw))
    );
    const explicitCategoryMentioned =
        Object.values(training.categories || {}).some((kws) => kws.some((kw) => matchKeyword(norm, kw))) ||
        detectAgeFromText(norm) !== null;

    const intent = detectIntent(norm, training);
    const matchedAds = filterAdsByCategoryAndInterests(ads, resolvedCategory, detectedInterests);

    // Non-recommendation conversational intents (greeting, thanks, goodbye, coupon_help, help_options)
    if (intent && !explicitInterestMentioned && !explicitCategoryMentioned) {
        const reply = arabic ? intent.reply_ar : intent.reply_en;
        const showAds = intent.tag === "greeting" ? matchedAds.slice(0, 2) : [];
        return {
            reply,
            detected_age_group: resolvedCategory,
            detected_interests: detectedInterests,
            recommended_ads: showAds
        };
    }

    // Build personalized recommendation reply
    const topAds = matchedAds.slice(0, 2);
    const interestLabel = detectedInterests.length > 0 ? detectedInterests.join(", ") : null;

    let reply;
    if (topAds.length > 0) {
        if (arabic) {
            reply = interestLabel
                ? `ممتاز! بناءً على فئة **${resolvedCategory}** واهتماماتك (${interestLabel})، دي أفضل العروض المناسبة ليك:`
                : `أهلاً! دي أفضل العروض المتاحة لفئة **${resolvedCategory}**:`;
            reply += ` أنصحك تشوف "${topAds[0].title}" — ${topAds[0].description}`;
        } else {
            reply = interestLabel
                ? `Awesome! For the ${resolvedCategory} category and your interest in ${interestLabel}, here are the best matching offers:`
                : `Great choice! Here are top offers for the ${resolvedCategory} category:`;
            reply += ` Check out "${topAds[0].title}" — ${topAds[0].description}`;
        }
    } else {
        reply = arabic
            ? "لم أجد عروضاً مطابقة حالياً، جرّب اختيار فئة أو اهتمامات أخرى."
            : "I couldn't find matching offers right now. Try selecting a different category or interest!";
    }

    return {
        reply,
        detected_age_group: resolvedCategory,
        detected_interests: detectedInterests,
        recommended_ads: topAds
    };
}

module.exports = {
    loadTrainingData,
    filterAdsByCategoryAndInterests,
    generateSmartChatReply
};
