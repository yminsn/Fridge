/**
 * 확정된 냉장고 재료와 사용자 취향으로 레시피를 생성하는 Vercel 함수입니다.
 * OpenRouter API 키는 서버 환경변수에서만 읽습니다.
 */
const MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";

module.exports = async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ success: false, error: "POST 요청만 허용됩니다." });
        return;
    }
    if (!process.env.OPENROUTER_API_KEY) {
        response.status(500).json({ success: false, error: "서버 API 키가 설정되지 않았습니다." });
        return;
    }
    const body = request.body || {};
    const ingredients = Array.isArray(body.ingredients)
        ? body.ingredients.map((item) => typeof item === "string" ? item : item && item.name).filter(Boolean).slice(0, 40)
        : [];
    if (ingredients.length === 0) {
        response.status(400).json({ success: false, error: "확정된 식재료가 필요합니다." });
        return;
    }
    const preferences = body.preferences && typeof body.preferences === "object" ? body.preferences : {};
    const pantry = Array.isArray(preferences.pantry) ? preferences.pantry.slice(0, 20) : [];
    const allergies = Array.isArray(preferences.allergies) ? preferences.allergies.slice(0, 20) : [];
    const dietaryPreferences = Array.isArray(preferences.dietaryPreferences) ? preferences.dietaryPreferences.slice(0, 20) : [];
    const prompt = `Available Refrigerator Ingredients: ${JSON.stringify(ingredients)}
User Preferences:
- Maximum Cooking Time: ${preferences.cookingTime === "unlimited" ? "unlimited" : `${preferences.cookingTime || 15} minutes`}
- Meal Category: ${preferences.category || "quick"}
- Spicy Level: ${preferences.spicy || "mild"}
- Difficulty: ${preferences.difficulty || "easy"}
- Available Pantry Items: ${JSON.stringify(pantry)}
- Allergies or avoided ingredients: ${JSON.stringify(allergies)}
- Dietary preferences: ${JSON.stringify(dietaryPreferences)}

Generate 2 or 3 realistic recipes. Prioritize and reuse the listed refrigerator ingredients. Never include or suggest an ingredient in the allergy/avoid list, including as a substitute. Follow dietary preferences. Do not introduce uncommon ingredients not listed in the refrigerator or pantry. If ingredients do not combine well, recommend separate practical uses instead of forcing an unsuitable combination.
Return exactly this JSON shape: {"recipes":[{"id":"recipe_1","title":"Korean title","description":"one line","cooking_time":"15분","difficulty":"쉬움","main_ingredients_used":["재료 수량"],"pantry_items_needed":["추가 재료"],"substitutes":{"재료":"대체 재료"},"steps":["1. ..."],"chef_tip":"...","estimated_calories":"420 kcal"}]}`;
    const requestBody = {
        model: MODEL,
        messages: [
            { role: "system", content: "You are a professional chef and recipe developer specializing in practical home cooking and zero-waste refrigerator clearing. Generate 2 to 3 recipes strictly from the provided ingredients. Always output valid JSON only, without markdown." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };
    try {
        const result = await requestWithRetry(requestBody);
        const parsed = extractJson(result);
        response.status(200).json({ success: true, recipes: normalizeRecipes(parsed.recipes) });
    } catch (error) {
        console.error("OpenRouter recipe generation failed:", error);
        response.status(502).json({ success: false, error: "AI 서비스 이용량이 많아 레시피 생성이 지연되고 있습니다. 잠시 후 다시 시도해주세요." });
    }
};

/** 무료 티어의 일시적 오류와 Rate Limit에 한해 지수 백오프로 재시도합니다. */
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

/** 코드블록이 섞인 모델 응답도 JSON으로 안전하게 변환합니다. */
function extractJson(result) {
    const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
    if (typeof content !== "string") throw new Error("AI response has no content");
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || !Array.isArray(parsed.recipes)) throw new Error("AI response has invalid schema");
    return parsed;
}

/** 화면이 기대하는 필드를 보장하고 악의적·과도한 모델 출력을 제한합니다. */
function normalizeRecipes(recipes) {
    return recipes.filter((recipe) => recipe && typeof recipe.title === "string" && recipe.title.trim()).slice(0, 3).map((recipe, index) => ({
        id: typeof recipe.id === "string" ? recipe.id.slice(0, 40) : `recipe_${index + 1}`,
        title: recipe.title.trim().slice(0, 80),
        description: text(recipe.description),
        cooking_time: text(recipe.cooking_time, "시간 미상"),
        difficulty: text(recipe.difficulty, "보통"),
        main_ingredients_used: list(recipe.main_ingredients_used),
        pantry_items_needed: list(recipe.pantry_items_needed),
        substitutes: recipe.substitutes && typeof recipe.substitutes === "object" ? recipe.substitutes : {},
        steps: list(recipe.steps),
        chef_tip: text(recipe.chef_tip, "재료의 상태를 보며 불 세기를 조절해보세요."),
        estimated_calories: text(recipe.estimated_calories, "칼로리 정보 미상")
    }));
}

function text(value, fallback = "") { return typeof value === "string" ? value.slice(0, 300) : fallback; }
function list(value) { return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 20).map((item) => item.slice(0, 300)) : []; }
