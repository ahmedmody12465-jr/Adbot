(function () {
    const API_BASE = (window.location.port === "8000" || window.location.port === "3001")
        ? ""
        : "http://localhost:3001";

    let lastData = null;
    let refreshTimer = null;

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function renderBars(containerId, items, fillClass) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = `<p class="empty-msg">No data recorded yet.</p>`;
            return;
        }

        const maxCount = Math.max(...items.map((i) => i.count), 1);

        container.innerHTML = items.map((item) => {
            const width = Math.max(Math.round((item.count / maxCount) * 100), 4);
            return `
                <div class="bar-item">
                    <div class="bar-row-top">
                        <span class="bar-name">${escapeHtml(item.name)}</span>
                        <span class="bar-val">${item.count} (${item.percentage}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill ${fillClass || ""}" style="width: ${width}%"></div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function renderDailyChart(series) {
        const container = document.getElementById("daily-chart");
        if (!container) return;

        if (!series || series.length === 0) {
            container.innerHTML = `<p class="empty-msg">No daily activity yet.</p>`;
            return;
        }

        const recent = series.slice(-7);
        const maxVal = Math.max(
            ...recent.flatMap((d) => [d.visits || 0, d.videoViews || 0]),
            1
        );

        container.innerHTML = recent.map((d) => {
            const visitH = Math.max(Math.round(((d.visits || 0) / maxVal) * 120), 4);
            const videoH = Math.max(Math.round(((d.videoViews || 0) / maxVal) * 120), 4);
            return `
                <div class="daily-col" title="${d.date}: ${d.visits} visits, ${d.videoViews} video views">
                    <div class="daily-counts">👥${d.visits || 0} 🎬${d.videoViews || 0}</div>
                    <div class="daily-bars">
                        <div class="daily-bar visits" style="height:${visitH}px"></div>
                        <div class="daily-bar videos" style="height:${videoH}px"></div>
                    </div>
                    <div class="daily-label">${escapeHtml(d.date.slice(5))}</div>
                </div>
            `;
        }).join("");
    }

    function renderChatInsights(chatStats) {
        const container = document.getElementById("chat-insights");
        if (!container) return;

        if (!chatStats || chatStats.totalMessages === 0) {
            container.innerHTML = `<p class="empty-msg">No chatbot conversations recorded yet.</p>`;
            return;
        }

        const topCats = (chatStats.detectedCategories || []).slice(0, 4)
            .map((c) => `<span class="insight-tag">🏷️ ${escapeHtml(c.name)}: ${c.count}</span>`)
            .join("");

        const topInts = (chatStats.detectedInterests || []).slice(0, 4)
            .map((i) => `<span class="insight-tag">🎯 ${escapeHtml(i.name)}: ${i.count}</span>`)
            .join("");

        container.innerHTML = `
            <div class="lang-split">
                <div class="lang-box">
                    <span>English Queries</span>
                    <strong>${chatStats.languages?.en || 0}</strong>
                </div>
                <div class="lang-box">
                    <span>Arabic Queries (عربي)</span>
                    <strong>${chatStats.languages?.ar || 0}</strong>
                </div>
            </div>
            <div>
                <div class="kpi-sub" style="margin-bottom:8px;">Top Categories &amp; Interests in Chat:</div>
                <div class="chip-tags">
                    ${topCats || ""}
                    ${topInts || ""}
                </div>
            </div>
        `;
    }

    function renderVideosTable(videos) {
        const tbody = document.getElementById("videos-table-body");
        if (!tbody) return;

        if (!videos || videos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No video data available.</td></tr>`;
            return;
        }

        tbody.innerHTML = videos.map((v, idx) => {
            const views = v.views || 0;
            const completions = v.completions || 0;
            const rate = views > 0 ? Math.round((completions / views) * 100) + "%" : "—";
            const tags = (v.interests || [])
                .map((t) => `<span class="mini-tag">${escapeHtml(t)}</span>`)
                .join("");

            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${escapeHtml(v.title)}</strong></td>
                    <td>${escapeHtml(v.category_name)}</td>
                    <td>${tags || "—"}</td>
                    <td><strong>${views}</strong></td>
                    <td>${completions}</td>
                    <td>${rate}</td>
                </tr>
            `;
        }).join("");
    }

    function renderOffersTable(offers) {
        const tbody = document.getElementById("offers-table-body");
        if (!tbody) return;

        if (!offers || offers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="empty-msg">No offers claimed yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = offers.map((o) => `
            <tr>
                <td><strong>${escapeHtml(o.title)}</strong></td>
                <td>${escapeHtml(o.category_name)}</td>
                <td><strong>${o.clicks}</strong></td>
            </tr>
        `).join("");
    }

    function renderActivityFeed(events) {
        const container = document.getElementById("activity-feed");
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = `<p class="empty-msg">No visitor activity yet.</p>`;
            return;
        }

        container.innerHTML = events.slice(0, 20).map((ev) => {
            const timeStr = ev.timestamp
                ? new Date(ev.timestamp).toLocaleTimeString()
                : "";
            return `
                <div class="activity-item">
                    <div>
                        <span class="activity-type ${escapeHtml(ev.type)}">${escapeHtml(ev.type)}</span>
                        <span>${escapeHtml(ev.details)}</span>
                    </div>
                    <span class="activity-time">${escapeHtml(timeStr)}</span>
                </div>
            `;
        }).join("");
    }

    function renderDashboard(data) {
        lastData = data;
        const ov = data.overview || {};
        const hl = data.highlights || {};

        document.getElementById("kpi-visits").textContent = ov.totalVisits ?? 0;
        document.getElementById("kpi-unique").textContent = `${ov.uniqueVisitors ?? 0} unique visitors`;
        document.getElementById("total-page-views-pill").textContent = `Page Views: ${ov.totalPageViews ?? 0}`;

        document.getElementById("kpi-top-category").textContent = hl.topCategory ? hl.topCategory.name : "—";
        document.getElementById("kpi-top-category-sub").textContent = hl.topCategory
            ? `${hl.topCategory.count} selections (${hl.topCategory.percentage}%)`
            : "0 selections";

        document.getElementById("kpi-top-interest").textContent = hl.topInterest ? hl.topInterest.name : "—";
        document.getElementById("kpi-top-interest-sub").textContent = hl.topInterest
            ? `${hl.topInterest.count} selections (${hl.topInterest.percentage}%)`
            : "0 selections";

        document.getElementById("kpi-top-video").textContent = hl.topVideo ? hl.topVideo.title : "—";
        document.getElementById("kpi-top-video").title = hl.topVideo ? hl.topVideo.title : "";
        document.getElementById("kpi-top-video-sub").textContent = hl.topVideo
            ? `${hl.topVideo.views} views • ${ov.totalVideoViews || 0} total`
            : `${ov.totalVideoViews || 0} total video views`;

        document.getElementById("kpi-offers").textContent = ov.totalOfferClicks ?? 0;
        document.getElementById("kpi-top-offer-sub").textContent = hl.topOffer
            ? `Top: ${hl.topOffer.title} (${hl.topOffer.clicks})`
            : "No offers claimed yet";

        document.getElementById("kpi-chat").textContent = ov.totalChatMessages ?? 0;
        document.getElementById("kpi-chat-lang").textContent =
            `EN: ${data.chatStats?.languages?.en || 0} • AR: ${data.chatStats?.languages?.ar || 0}`;

        document.getElementById("cat-total-badge").textContent = `${ov.totalCategorySelections || 0} total`;
        document.getElementById("int-total-badge").textContent = `${ov.totalInterestSelections || 0} total`;
        document.getElementById("chat-total-badge").textContent = `${ov.totalChatMessages || 0} messages`;
        document.getElementById("videos-total-badge").textContent = `${ov.totalVideoViews || 0} views`;
        document.getElementById("offers-total-badge").textContent = `${ov.totalOfferClicks || 0} claims`;

        renderBars("categories-chart", data.categoriesBreakdown, "");
        renderBars("interests-chart", data.interestsBreakdown, "purple");
        renderDailyChart(data.dailySeries);
        renderChatInsights(data.chatStats);
        renderVideosTable(data.videosBreakdown);
        renderOffersTable(data.offersBreakdown);
        renderActivityFeed(data.recentActivity);

        document.getElementById("last-updated").textContent =
            `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    async function fetchAnalytics() {
        try {
            const res = await fetch(`${API_BASE}/api/analytics`);
            if (!res.ok) throw new Error("Failed to load analytics");
            const data = await res.json();
            renderDashboard(data);
        } catch (err) {
            console.error("Dashboard error:", err);
            document.getElementById("last-updated").textContent =
                "Error loading analytics. Ensure the server is running.";
        }
    }

    function setupAutoRefresh() {
        const checkbox = document.getElementById("auto-refresh-checkbox");
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        if (checkbox && checkbox.checked) {
            refreshTimer = setInterval(fetchAnalytics, 5000);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        fetchAnalytics();
        setupAutoRefresh();

        document.getElementById("auto-refresh-checkbox")
            .addEventListener("change", setupAutoRefresh);

        document.getElementById("refresh-btn")
            .addEventListener("click", fetchAnalytics);

        document.getElementById("export-btn")
            .addEventListener("click", () => {
                if (!lastData) return;
                const blob = new Blob([JSON.stringify(lastData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `adbot-analytics-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });

        document.getElementById("reset-btn")
            .addEventListener("click", async () => {
                if (!confirm("Are you sure you want to reset all stored analytics data?")) return;
                try {
                    const res = await fetch(`${API_BASE}/api/analytics/reset`, { method: "POST" });
                    if (res.ok) fetchAnalytics();
                } catch (err) {
                    console.error("Reset failed:", err);
                }
            });
    });
})();
