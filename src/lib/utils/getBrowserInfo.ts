interface NavigatorUABrandVersion {
    brand: string;
    version: string;
}

interface UADataValues {
    brands: NavigatorUABrandVersion[];
    mobile: boolean;
    platform: string;
}

interface NavigatorUA extends Navigator {
    userAgentData?: UADataValues;
}

interface BrowserInfo {
    browser: string; // e.g. "Chrome 125"
    platform: string;
    width: number;
}

function getBrowserInfo(): BrowserInfo {
    const nav = navigator as NavigatorUA;

    // --- userAgentData path (Chrome/Edge, secure contexts) ---
    if (nav.userAgentData?.brands?.length) {
        // Filter out noise entries like "Not/A)Brand" and "Chromium"
        const NOISE = /not.?a.?brand|chromium/i;
        const meaningful = nav.userAgentData.brands.filter(
            (b) => !NOISE.test(b.brand)
        );

        // Pick the first meaningful brand, fall back to raw first entry
        const picked = meaningful[0] ?? nav.userAgentData.brands[0];
        const browser = `${picked.brand} ${picked.version}`;
        const platform = nav.userAgentData.platform || navigator.platform || "Unknown";

        return { browser, platform, width: window.innerWidth };
    }

    // --- userAgent fallback ---
    const ua = navigator.userAgent;

    // Order matters: more-specific tokens first
    const matchers: [RegExp, string][] = [
        [/Edg\/([\d.]+)/, "Edge"],
        [/OPR\/([\d.]+)/, "Opera"],
        [/Firefox\/([\d.]+)/, "Firefox"],
        [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
        [/Chrome\/([\d.]+)/, "Chrome"],
        [/Version\/([\d.]+).*Safari/, "Safari"],
    ];

    let browser = "Unknown";
    for (const [re, name] of matchers) {
        const m = ua.match(re);
        if (m) {
            // Keep only major.minor
            const version = m[1].split(".").slice(0, 2).join(".");
            browser = `${name} ${version}`;
            break;
        }
    }

    // Platform from legacy API
    const platform = navigator.platform || "Unknown";

    return { browser, platform, width: window.innerWidth };
}

export default getBrowserInfo;