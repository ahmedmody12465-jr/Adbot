const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const ANALYTICS_PATH = path.join(DATA_DIR, "analytics.json");

function createEmptyAnalytics() {
    return {
        totalVisits: 0,
        totalPageViews: 0,
        uniqueVisitorIds: [],
        categoryCounts: {},
        interestCounts: {},
        videoViews: {},
        offerClicks: {},
        totalOfferClicks: 0,
        chatStats: {
            totalMessages: 0,
            languages: { ar: 0, en: 0 },
            detectedCategories: {},
            detectedInterests: {}
        },
        dailyStats: {},
        recentActivity: []
    };
}

function ensureLoaded() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(ANALYTICS_PATH)) {
            const initial = createEmptyAnalytics();
            fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(initial, null, 2), "utf-8");
            return initial;
        }
        const raw = fs.readFileSync(ANALYTICS_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        return { ...createEmptyAnalytics(), ...parsed };
    } catch (err) {
        console.warn("Failed to read analytics.json, starting fresh:", err.message);
        return createEmptyAnalytics();
    }
}

function saveAnalytics(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
        console.error("Failed to save analytics.json:", err.message);
    }
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

function ensureDailyBucket(data, dateKey) {
    if (!data.dailyStats[dateKey]) {
        data.dailyStats[dateKey] = {
            visits: 0,
            pageViews: 0,
            categorySelections: 0,
            videoViews: 0,
            offerClicks: 0,
            chatMessages: 0
        };
    }
    return data.dailyStats[dateKey];
}

function pushActivity(data, entry) {
    data.recentActivity.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        ...entry
    });
    if (data.recentActivity.length > 50) {
        data.recentActivity = data.recentActivity.slice(0, 50);
    }
}

function recordEvent(payload = {}) {
    const data = ensureLoaded();
    const today = getTodayKey();
    const daily = ensureDailyBucket(data, today);
    const visitorId = payload.visitorId || "anonymous";
    const type = payload.type;

    if (visitorId && visitorId !== "anonymous" && !data.uniqueVisitorIds.includes(visitorId)) {
        data.uniqueVisitorIds.push(visitorId);
    }

    switch (type) {
        case "visit": {
            data.totalVisits += 1;
            daily.visits += 1;
            pushActivity(data, {
                type: "visit",
                visitorId,
                details: payload.page ? `Visited ${payload.page}` : "Started a new site visit"
            });
            break;
        }
        case "page_view": {
            data.totalPageViews += 1;
            daily.pageViews += 1;
            break;
        }
        case "category_select": {
            const category = (payload.category || "").trim();
            if (category) {
                data.categoryCounts[category] = (data.categoryCounts[category] || 0) + 1;
                daily.categorySelections += 1;
                pushActivity(data, {
                    type: "category_select",
                    visitorId,
                    category,
                    details: `Selected category: ${category}`
                });
            }
            break;
        }
        case "interests_select": {
            const interests = Array.isArray(payload.interests) ? payload.interests : [];
            const category = payload.category || "";
            interests.forEach((interest) => {
                const key = String(interest).trim();
                if (key) {
                    data.interestCounts[key] = (data.interestCounts[key] || 0) + 1;
                }
            });
            if (interests.length > 0) {
                pushActivity(data, {
                    type: "interests_select",
                    visitorId,
                    category,
                    interests,
                    details: `Selected interests (${interests.join(", ")})` + (category ? ` for ${category}` : "")
                });
            }
            break;
        }
        case "video_play": {
            const adId = String(payload.adId || payload.title || "unknown");
            if (!data.videoViews[adId]) {
                data.videoViews[adId] = {
                    ad_id: payload.adId || null,
                    title: payload.title || "Unknown Video",
                    category_name: payload.category || "General",
                    video_url: payload.videoUrl || "",
                    interests: Array.isArray(payload.interests) ? payload.interests : [],
                    views: 0,
                    completions: 0
                };
            }
            data.videoViews[adId].views += 1;
            daily.videoViews += 1;
            pushActivity(data, {
                type: "video_play",
                visitorId,
                category: payload.category || "",
                details: `Watched video: ${data.videoViews[adId].title}`
            });
            break;
        }
        case "video_complete": {
            const adId = String(payload.adId || payload.title || "unknown");
            if (!data.videoViews[adId]) {
                data.videoViews[adId] = {
                    ad_id: payload.adId || null,
                    title: payload.title || "Unknown Video",
                    category_name: payload.category || "General",
                    video_url: payload.videoUrl || "",
                    interests: [],
                    views: 1,
                    completions: 0
                };
            }
            data.videoViews[adId].completions += 1;
            break;
        }
        case "offer_click": {
            const title = (payload.title || "Special Offer").trim();
            const category = payload.category || "General";
            const key = `${title}__${category}`;
            if (!data.offerClicks[key]) {
                data.offerClicks[key] = { title, category_name: category, clicks: 0 };
            }
            data.offerClicks[key].clicks += 1;
            data.totalOfferClicks += 1;
            daily.offerClicks += 1;
            pushActivity(data, {
                type: "offer_click",
                visitorId,
                category,
                details: `Claimed coupon for: ${title}`
            });
            break;
        }
        default:
            break;
    }

    saveAnalytics(data);
    return data;
}

function recordChatInteraction({ message, detectedCategory, detectedInterests }) {
    const data = ensureLoaded();
    const today = getTodayKey();
    const daily = ensureDailyBucket(data, today);

    data.chatStats.totalMessages += 1;
    daily.chatMessages += 1;

    const isAr = /[\u0600-\u06FF]/.test(message || "");
    if (isAr) data.chatStats.languages.ar += 1;
    else data.chatStats.languages.en += 1;

    if (detectedCategory) {
        data.chatStats.detectedCategories[detectedCategory] =
            (data.chatStats.detectedCategories[detectedCategory] || 0) + 1;
    }
    if (Array.isArray(detectedInterests)) {
        detectedInterests.forEach((interest) => {
            data.chatStats.detectedInterests[interest] =
                (data.chatStats.detectedInterests[interest] || 0) + 1;
        });
    }

    pushActivity(data, {
        type: "chat",
        visitorId: "chat-user",
        category: detectedCategory || "",
        details: `Chatbot query (${isAr ? "AR" : "EN"}): "${String(message || "").slice(0, 60)}"`
    });

    saveAnalytics(data);
}

function toSortedBreakdown(countsMap) {
    const entries = Object.entries(countsMap || {});
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries
        .map(([name, count]) => ({
            name,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);
}

function getAnalyticsSummary(catalogAds = []) {
    const data = ensureLoaded();

    const categoriesBreakdown = toSortedBreakdown(data.categoryCounts);
    const interestsBreakdown = toSortedBreakdown(data.interestCounts);

    // Merge catalog ads with tracked video views so even 0-view videos can be inspected if desired
    const videoMap = { ...data.videoViews };
    catalogAds.forEach((ad) => {
        const key = String(ad.ad_id);
        if (!videoMap[key]) {
            videoMap[key] = {
                ad_id: ad.ad_id,
                title: ad.title,
                category_name: ad.category_name,
                video_url: ad.video_url,
                interests: ad.interests || [],
                views: 0,
                completions: 0
            };
        } else if (!videoMap[key].interests || videoMap[key].interests.length === 0) {
            videoMap[key].interests = ad.interests || [];
        }
    });

    const videosBreakdown = Object.values(videoMap).sort((a, b) => b.views - a.views);
    const totalVideoViews = videosBreakdown.reduce((sum, v) => sum + (v.views || 0), 0);

    const offersBreakdown = Object.values(data.offerClicks).sort((a, b) => b.clicks - a.clicks);

    const dailySeries = Object.entries(data.dailyStats || {})
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const totalCategorySelections = categoriesBreakdown.reduce((s, c) => s + c.count, 0);
    const totalInterestSelections = interestsBreakdown.reduce((s, i) => s + i.count, 0);

    const topWatchedVideo = videosBreakdown.find((v) => v.views > 0) || null;

    return {
        overview: {
            uniqueVisitors: data.uniqueVisitorIds.length,
            totalVisits: data.totalVisits,
            totalPageViews: data.totalPageViews,
            totalCategorySelections,
            totalInterestSelections,
            totalVideoViews,
            totalOfferClicks: data.totalOfferClicks,
            totalChatMessages: data.chatStats.totalMessages
        },
        highlights: {
            topCategory: categoriesBreakdown[0] || null,
            topInterest: interestsBreakdown[0] || null,
            topVideo: topWatchedVideo,
            topOffer: offersBreakdown[0] || null
        },
        categoriesBreakdown,
        interestsBreakdown,
        videosBreakdown,
        offersBreakdown,
        chatStats: {
            totalMessages: data.chatStats.totalMessages,
            languages: data.chatStats.languages,
            detectedCategories: toSortedBreakdown(data.chatStats.detectedCategories),
            detectedInterests: toSortedBreakdown(data.chatStats.detectedInterests)
        },
        dailySeries,
        recentActivity: data.recentActivity || []
    };
}

function resetAnalytics() {
    const fresh = createEmptyAnalytics();
    saveAnalytics(fresh);
    return fresh;
}

module.exports = {
    recordEvent,
    recordChatInteraction,
    getAnalyticsSummary,
    resetAnalytics
};
