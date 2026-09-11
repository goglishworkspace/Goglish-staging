export type ParsedDevice = {
  name: string;
  type: "mobile" | "desktop" | "tablet";
  browser: string;
};

export function parseUserAgent(ua: string | null): ParsedDevice {
  if (!ua) return { name: "جهاز غير معروف", type: "desktop", browser: "متصفح غير معروف" };

  let os = "جهاز غير معروف";
  let type: "mobile" | "tablet" | "desktop" = "desktop";
  let browser = "متصفح ويب";

  if (/Windows/i.test(ua)) {
    os = "كمبيوتر (Windows)";
    type = "desktop";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "كمبيوتر (Mac)";
    type = "desktop";
  } else if (/iPad/i.test(ua)) {
    os = "جهاز iPad";
    type = "tablet";
  } else if (/iPhone/i.test(ua)) {
    os = "هاتف iPhone";
    type = "mobile";
  } else if (/Android/i.test(ua)) {
    type = /Mobile/i.test(ua) ? "mobile" : "tablet";
    os = type === "mobile" ? "هاتف Android" : "تابلت Android";
  } else if (/Linux/i.test(ua)) {
    os = "كمبيوتر (Linux)";
    type = "desktop";
  }

  if (/Edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = "Safari";
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = "Firefox";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Internet";
  }

  return { name: os, type, browser };
}
