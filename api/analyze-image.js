/**
 * 냉장고 이미지에서 식재료를 추출하는 Vercel 서버리스 함수입니다.
 * API 키는 서버 환경변수에서만 읽어 클라이언트에 노출하지 않습니다.
 */
const MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
const CATEGORIES = new Set(["채소/과일", "육류/수산", "유제품", "양념/소스", "가공식품", "기타"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);

module.exports = async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ success: false, error: "POST 요청만 허용됩니다." });
        return;
    }
    const image = request.body && request.body.image;
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
        response.status(400).json({ success: false, error: "유효한 이미지 데이터가 필요합니다." });
        return;
    }
    if (!process.env.OPENROUTER_API_KEY) {
        response.status(500).json({ success: false, error: "서버 API 키가 설정되지 않았습니다." });
        return;
    }

    const requestBody = {
        model: MODEL,
        messages: [
            { role: "system", content: "You are an expert culinary vision assistant. Analyze the provided refrigerator image carefully and identify all visible food ingredients, drinks, condiments, and groceries. Return ONLY a valid JSON object matching the requested schema without markdown formatting or codeblocks." },
            { role: "user", content: [{ type: "text", text: 'Identify all visible ingredients from this refrigerator image. Return strictly {"ingredients":[{"name":"Korean name","category":"채소/과일 | 육류/수산 | 유제품 | 양념/소스 | 가공식품 | 기타","confidence":"high | medium | low","quantity_estimate":"optional"}]}. If no food is visible, return {"ingredients":[]}. ' }, { type: "image_url", image_url: { url: image } }] }
        ],
        response_format: { type: "json_object" }
    };

    try {
        const result = await requestWithRetry(requestBody);
        const parsed = extractJson(result);
        response.status(200).json({ success: true, data: normalizeIngredients(parsed) });
    } catch (error) {
        console.error("OpenRouter image analysis failed:", error);
        response.status(502).json({ success: false, error: "AI 서비스 이용량이 많아 분석이 지연되고 있습니다. 잠시 후 다시 시도해주세요." });
    }
};

/** Rate limit 및 일시적 서버 오류에 한해 최대 2회 재시도합니다. */
async function requestWithRetry(body) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://vercel.com", "X-Title": "Refrigerator Recipe Assistant" },
            body: JSON.stringify(body)
        });
        if (result.ok) return result.json();
        if (![429, 500, 502, 503, 504].includes(result.status) || attempt === 2) throw new Error(`OpenRouter status ${result.status}`);
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    }
    throw new Error("OpenRouter request exhausted");
}

/** 모델 응답의 JSON 텍스트를 추출하고 허용된 식재료 구조로 정규화합니다. */
function extractJson(result) {
    const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
    if (typeof content !== "string") throw new Error("AI response has no content");
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || !Array.isArray(parsed.ingredients)) throw new Error("AI response has invalid schema");
    return parsed;
}

function normalizeIngredients(data) {
    return {
        ingredients: data.ingredients.filter((item) => item && typeof item.name === "string" && item.name.trim()).map((item) => ({
            name: item.name.trim().slice(0, 40),
            category: CATEGORIES.has(item.category) ? item.category : "기타",
            confidence: CONFIDENCES.has(item.confidence) ? item.confidence : "low",
            quantity_estimate: typeof item.quantity_estimate === "string" ? item.quantity_estimate.trim().slice(0, 40) : ""
        }))
    };
}
