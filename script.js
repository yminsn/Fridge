/**
 * 냉장고 사진 업로드, 이미지 전처리, 식재료 편집 상태를 관리합니다.
 * OpenRouter 호출은 브라우저에 키가 노출되지 않도록 서버리스 함수로만 전달합니다.
 */
(() => {
    "use strict";

    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1080;
    const state = {
        ingredients: [], image: null, isAnalyzing: false, recipes: [], cookingRecipe: null,
        cookingStep: 0, timer: null, timerSeconds: 0,
        preferences: { cookingTime: "15", category: "quick", spicy: "mild", difficulty: "easy", pantry: [] },
        profile: { nickname: "요리하는 사람", allergies: [], dietaryPreferences: [], defaultPantry: [] }
    };
    const elements = {
        dropZone: document.querySelector("#drop-zone"),
        fileInputs: [document.querySelector("#camera-input"), document.querySelector("#file-input")],
        previewCard: document.querySelector("#preview-card"),
        previewImage: document.querySelector("#preview-image"),
        imageSize: document.querySelector("#image-size"),
        replaceImage: document.querySelector("#replace-image"),
        emptyMessage: document.querySelector("#empty-message"),
        loadingMessage: document.querySelector("#loading-message"),
        errorMessage: document.querySelector("#error-message"),
        list: document.querySelector("#ingredient-list"),
        count: document.querySelector("#ingredient-count"),
        form: document.querySelector("#add-ingredient-form"),
        input: document.querySelector("#ingredient-input"),
        recipeButton: document.querySelector("#recipe-button"),
        pantryList: document.querySelector("#pantry-list"),
        recipeResults: document.querySelector("#recipe-results"),
        recipeLoading: document.querySelector("#recipe-loading"),
        recipeError: document.querySelector("#recipe-error"),
        recipeTip: document.querySelector("#recipe-tip"),
        recipeGrid: document.querySelector("#recipe-grid"),
        recipeCount: document.querySelector("#recipe-count"),
        cookingMode: document.querySelector("#cooking-mode"),
        cookingTitle: document.querySelector("#cooking-title"),
        cookingProgress: document.querySelector("#cooking-progress"),
        cookingStep: document.querySelector("#cooking-step"),
        closeCooking: document.querySelector("#close-cooking"),
        previousStep: document.querySelector("#previous-step"),
        nextStep: document.querySelector("#next-step"),
        timerButton: document.querySelector("#timer-button"),
        timerDisplay: document.querySelector("#timer-display"),
        profileButton: document.querySelector("#profile-button"),
        closeProfile: document.querySelector("#close-profile"),
        profileModal: document.querySelector("#profile-modal"),
        profileForm: document.querySelector("#profile-form"),
        nickname: document.querySelector("#nickname"),
        allergyList: document.querySelector("#allergy-list"),
        dietList: document.querySelector("#diet-list"),
        profilePantryList: document.querySelector("#profile-pantry-list"),
        libraryButton: document.querySelector("#library-button"),
        closeLibrary: document.querySelector("#close-library"),
        library: document.querySelector("#library"),
        librarySearch: document.querySelector("#library-search"),
        libraryFilter: document.querySelector("#library-filter"),
        libraryGrid: document.querySelector("#library-grid"),
        libraryEmpty: document.querySelector("#library-empty"),
        printLibrary: document.querySelector("#print-library"),
        toast: document.querySelector("#toast")
    };
    const pantryItems = ["간장", "소금", "설탕", "식용유", "고춧가루", "후추", "다진마늘"];

    /** 선택된 파일을 검증하고 클라이언트에서 리사이즈한 뒤 분석을 시작합니다. */
    async function handleFile(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showError("이미지 파일만 업로드할 수 있어요.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showError("원본 사진은 15MB 이하만 업로드할 수 있어요.");
            return;
        }
        try {
            const image = await compressImage(file);
            state.image = image;
            elements.previewImage.src = image.dataUrl;
            elements.imageSize.textContent = `${image.width} × ${image.height} · ${formatBytes(image.size)}`;
            elements.previewCard.classList.remove("is-hidden");
            elements.dropZone.classList.add("is-hidden");
            await analyzeImage(image.dataUrl);
        } catch (error) {
            showError(error instanceof Error ? error.message : "이미지를 처리하지 못했어요.");
        }
    }

    /** Canvas로 이미지를 최대 1920×1080 및 전송 가능한 JPEG로 변환합니다. */
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const image = new Image();
            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const ratio = Math.min(1, MAX_WIDTH / image.naturalWidth, MAX_HEIGHT / image.naturalHeight);
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("이미지 변환을 위한 브라우저 기능을 사용할 수 없어요."));
                    return;
                }
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg", .82);
                resolve({ dataUrl, width: canvas.width, height: canvas.height, size: Math.round(dataUrl.length * .75) });
            };
            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("이미지를 읽지 못했어요. 다른 사진으로 다시 시도해주세요."));
            };
            image.src = objectUrl;
        });
    }

    /** 서버리스 프록시에 이미지를 보내고 검증된 식재료 목록을 화면에 표시합니다. */
    async function analyzeImage(dataUrl) {
        if (!navigator.onLine) {
            showError("인터넷 연결이 없어 분석할 수 없어요. 연결 후 다시 시도해주세요.");
            return;
        }
        setAnalyzing(true);
        try {
            const response = await fetch("/api/analyze-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: dataUrl })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "AI 분석에 실패했어요.");
            state.ingredients = Array.isArray(result.data?.ingredients) ? result.data.ingredients : [];
            renderIngredients();
            if (state.ingredients.length === 0) showError("식재료를 명확히 찾지 못했습니다. 조명을 켜고 다시 찍거나, 아래에서 직접 재료를 입력해보세요!");
        } catch (error) {
            showError(error instanceof Error ? error.message : "AI 분석 중 문제가 발생했어요.");
        } finally {
            setAnalyzing(false);
        }
    }

    /** 현재 식재료 배열을 편집 가능한 카드 목록으로 렌더링합니다. */
    function renderIngredients() {
        elements.list.replaceChildren();
        state.ingredients.forEach((ingredient, index) => {
            const item = document.createElement("div");
            item.className = "ingredient-item";
            item.innerHTML = `<div class="ingredient-main"><input class="ingredient-name" value="${escapeAttribute(ingredient.name)}" aria-label="재료 이름"><span class="category">${escapeHtml(ingredient.category)}</span><span class="quantity">${escapeHtml(ingredient.quantity_estimate || "수량 미상")}</span></div><button class="remove-ingredient" type="button" aria-label="${escapeAttribute(ingredient.name)} 삭제">×</button>`;
            item.querySelector(".ingredient-name").addEventListener("change", (event) => {
                const value = event.target.value.trim();
                if (value) state.ingredients[index].name = value;
                renderIngredients();
            });
            item.querySelector(".remove-ingredient").addEventListener("click", () => {
                state.ingredients.splice(index, 1);
                renderIngredients();
            });
            elements.list.append(item);
        });
        elements.count.textContent = `${state.ingredients.length}개`;
        elements.recipeButton.disabled = state.ingredients.length === 0;
    }

    /** 식재료를 수동으로 추가합니다. */
    function addIngredient(event) {
        event.preventDefault();
        const name = elements.input.value.trim();
        if (!name) return;
        state.ingredients.push({ name, category: "기타", confidence: "high", quantity_estimate: "" });
        elements.input.value = "";
        renderIngredients();
    }

    /** 선택된 식재료와 취향 조건을 레시피 생성 API에 전달합니다. */
    function goToRecipeStep() {
        sessionStorage.setItem("confirmedIngredients", JSON.stringify(state.ingredients));
        generateRecipes();
    }

    /** 서버리스 API에서 2~3개의 레시피를 받아 카드로 표시합니다. */
    async function generateRecipes() {
        if (!navigator.onLine) { showRecipeError("인터넷 연결이 없어 레시피를 만들 수 없어요."); return; }
        elements.recipeResults.classList.remove("is-hidden");
        elements.recipeLoading.classList.remove("is-hidden");
        elements.recipeError.classList.add("is-hidden");
        elements.recipeGrid.replaceChildren();
        elements.recipeResults.scrollIntoView({ behavior: "smooth", block: "start" });
        const tips = ["재료는 익는 순서대로 넣으면 맛이 더 좋아져요.", "불을 켜기 전 모든 재료를 손질하면 요리가 편해져요.", "간은 마지막에 조절하면 실패가 적어요."];
        elements.recipeTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        try {
            const response = await fetch("/api/recipe/generate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredients: state.ingredients, preferences: { ...state.preferences, allergies: state.profile.allergies, dietaryPreferences: state.profile.dietaryPreferences, pantry: [...new Set([...state.preferences.pantry, ...state.profile.defaultPantry])] } })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "레시피 생성에 실패했어요.");
            state.recipes = Array.isArray(result.recipes) ? result.recipes : [];
            renderRecipes();
            if (state.recipes.length === 0) throw new Error("추천할 레시피를 찾지 못했어요. 재료를 더 추가해보세요.");
        } catch (error) {
            showRecipeError(error instanceof Error ? error.message : "레시피 생성 중 문제가 발생했어요.");
        } finally {
            elements.recipeLoading.classList.add("is-hidden");
        }
    }

    /** 레시피 카드와 3단계 저장 연결용 북마크를 렌더링합니다. */
    function renderRecipes() {
        elements.recipeCount.textContent = `${state.recipes.length}가지`;
        elements.recipeGrid.replaceChildren();
        const saved = getSavedRecipes();
        state.recipes.forEach((recipe, index) => {
            const card = document.createElement("article");
            card.className = "recipe-card";
            const id = recipe.id || `recipe_${index + 1}`;
            card.innerHTML = `<div class="recipe-card-header"><h3>${escapeHtml(recipe.title)}</h3><button class="bookmark ${saved.some((item) => item.id === id) ? "is-saved" : ""}" type="button" aria-label="레시피 저장">${saved.some((item) => item.id === id) ? "★" : "☆"}</button></div><p class="recipe-description">${escapeHtml(recipe.description)}</p><div class="recipe-meta"><span>${escapeHtml(recipe.cooking_time)}</span><span>${escapeHtml(recipe.difficulty)}</span><span>${escapeHtml(recipe.estimated_calories)}</span></div><h4>냉장고에 있는 재료</h4><ul>${listItems(recipe.main_ingredients_used)}</ul><h4>추가로 필요한 재료</h4><ul>${listItems(recipe.pantry_items_needed)}</ul><h4>대체 재료</h4><ul>${substituteItems(recipe.substitutes)}</ul><p class="chef-tip">셰프의 팁: ${escapeHtml(recipe.chef_tip)}</p><button class="button button-primary cooking-button" type="button">요리 시작하기</button>`;
            card.querySelector(".bookmark").addEventListener("click", () => toggleSaved(recipe, id, card.querySelector(".bookmark")));
            card.querySelector(".cooking-button").addEventListener("click", () => openCookingMode(recipe));
            elements.recipeGrid.append(card);
        });
    }

    function listItems(items) {
        if (!Array.isArray(items) || items.length === 0) return "<li>없음</li>";
        return items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("");
    }

    function substituteItems(substitutes) {
        if (!substitutes || typeof substitutes !== "object") return "<li>없음</li>";
        return Object.entries(substitutes).map(([key, value]) => `<li>${escapeHtml(key)} → ${escapeHtml(String(value))}</li>`).join("") || "<li>없음</li>";
    }

    function getSavedRecipes() {
        try { const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]"); return Array.isArray(saved) ? saved : []; }
        catch (error) { console.error("저장 레시피를 읽지 못했습니다.", error); return []; }
    }

    /** 저장된 레시피를 localStorage에 기록해 3단계 기능이 이어지도록 합니다. */
    function toggleSaved(recipe, id, button) {
        const saved = getSavedRecipes();
        const index = saved.findIndex((item) => item.id === id);
        if (index >= 0) { saved.splice(index, 1); button.textContent = "☆"; button.classList.remove("is-saved"); showToast("저장을 취소했어요."); }
        else { saved.push({ ...recipe, id, user_notes: "", user_rating: 0, is_favorite: true, saved_at: Date.now() }); button.textContent = "★"; button.classList.add("is-saved"); showToast("레시피를 저장했어요. 로그인하면 다른 기기에서도 볼 수 있어요."); }
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        renderLibrary();
    }

    function openCookingMode(recipe) {
        state.cookingRecipe = recipe; state.cookingStep = 0;
        elements.cookingMode.classList.remove("is-hidden");
        elements.cookingMode.scrollIntoView({ behavior: "smooth", block: "start" });
        renderCookingStep();
    }

    function renderCookingStep() {
        const steps = Array.isArray(state.cookingRecipe?.steps) ? state.cookingRecipe.steps : [];
        elements.cookingTitle.textContent = state.cookingRecipe?.title || "조리 모드";
        elements.cookingProgress.textContent = `${state.cookingStep + 1} / ${steps.length} 단계`;
        elements.cookingStep.textContent = steps[state.cookingStep] || "조리가 끝났어요. 맛있게 드세요!";
        elements.previousStep.disabled = state.cookingStep === 0;
        elements.nextStep.textContent = state.cookingStep >= steps.length - 1 ? "완료" : "다음 단계";
    }

    function startTimer() {
        if (state.timer) { clearInterval(state.timer); state.timer = null; elements.timerButton.textContent = "타이머 시작"; return; }
        const steps = state.cookingRecipe?.steps || [];
        const text = steps[state.cookingStep] || "";
        const match = text.match(/(\d+)\s*분/);
        if (!match) { showToast("이 단계에는 설정할 시간이 없어요."); return; }
        state.timerSeconds = Number(match[1]) * 60;
        elements.timerButton.textContent = "타이머 멈춤";
        updateTimer();
        state.timer = setInterval(() => { state.timerSeconds -= 1; updateTimer(); if (state.timerSeconds <= 0) { clearInterval(state.timer); state.timer = null; elements.timerButton.textContent = "타이머 시작"; showToast("조리 시간이 끝났어요!"); } }, 1000);
    }

    function updateTimer() {
        const minutes = Math.floor(state.timerSeconds / 60).toString().padStart(2, "0");
        const seconds = (state.timerSeconds % 60).toString().padStart(2, "0");
        elements.timerDisplay.textContent = `${minutes}:${seconds}`;
    }

    function showRecipeError(message) {
        elements.recipeResults.classList.remove("is-hidden");
        elements.recipeError.textContent = message;
        elements.recipeError.classList.remove("is-hidden");
    }

    /** 게스트 프로필을 브라우저에 저장하고 다음 레시피 요청에 자동 반영합니다. */
    function loadProfile() {
        try {
            const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
            state.profile = {
                nickname: typeof profile.nickname === "string" ? profile.nickname : state.profile.nickname,
                allergies: Array.isArray(profile.allergies) ? profile.allergies.filter((item) => typeof item === "string") : [],
                dietaryPreferences: Array.isArray(profile.dietaryPreferences) ? profile.dietaryPreferences.filter((item) => typeof item === "string") : [],
                defaultPantry: Array.isArray(profile.defaultPantry) ? profile.defaultPantry.filter((item) => typeof item === "string") : []
            };
        } catch (error) {
            console.error("프로필을 읽지 못했습니다.", error);
        }
    }

    function openProfile() {
        elements.nickname.value = state.profile.nickname;
        renderProfileChecks(elements.allergyList, ["땅콩", "견과류", "갑각류", "유제품", "글루텐"], state.profile.allergies);
        renderProfileChecks(elements.dietList, ["비건", "저탄고지", "저칼로리", "고단백", "혼밥 초간단", "술안주"], state.profile.dietaryPreferences);
        renderProfileChecks(elements.profilePantryList, pantryItems, state.profile.defaultPantry);
        elements.profileModal.classList.remove("is-hidden");
    }

    function renderProfileChecks(container, items, selected) {
        container.replaceChildren();
        items.forEach((item) => {
            const label = document.createElement("label");
            label.className = "check-item";
            label.innerHTML = `<input type="checkbox" value="${escapeAttribute(item)}" ${selected.includes(item) ? "checked" : ""}> ${escapeHtml(item)}`;
            container.append(label);
        });
    }

    function saveProfile(event) {
        event.preventDefault();
        state.profile = {
            nickname: elements.nickname.value.trim() || "요리하는 사람",
            allergies: checkedValues(elements.allergyList),
            dietaryPreferences: checkedValues(elements.dietList),
            defaultPantry: checkedValues(elements.profilePantryList)
        };
        state.preferences.pantry = [...new Set([...state.preferences.pantry, ...state.profile.defaultPantry])];
        localStorage.setItem("userProfile", JSON.stringify(state.profile));
        elements.profileModal.classList.add("is-hidden");
        showToast("프로필을 저장했어요. 다음 레시피부터 반영됩니다.");
    }

    function checkedValues(container) {
        return [...container.querySelectorAll("input:checked")].map((input) => input.value);
    }

    /** 저장 레시피를 검색·필터링하고 메모와 별점을 편집 가능한 카드로 표시합니다. */
    function renderLibrary() {
        let recipes = getSavedRecipes();
        const query = elements.librarySearch.value.trim().toLowerCase();
        if (query) recipes = recipes.filter((recipe) => `${recipe.title} ${recipe.description} ${(recipe.main_ingredients_used || []).join(" ")}`.toLowerCase().includes(query));
        if (elements.libraryFilter.value === "favorite") recipes = recipes.filter((recipe) => recipe.is_favorite);
        if (elements.libraryFilter.value === "easy") recipes = recipes.filter((recipe) => recipe.difficulty === "쉬움");
        recipes.sort((a, b) => (b.saved_at || 0) - (a.saved_at || 0));
        elements.libraryGrid.replaceChildren();
        elements.libraryEmpty.classList.toggle("is-hidden", recipes.length > 0);
        recipes.forEach((recipe) => {
            const card = document.createElement("article");
            card.className = "saved-card";
            const rating = Number(recipe.user_rating) || 0;
            card.innerHTML = `<h3>${escapeHtml(recipe.title)}</h3><p>${escapeHtml(recipe.description || "")}</p><div class="recipe-meta"><span>${escapeHtml(recipe.cooking_time || "")}</span><span>${escapeHtml(recipe.difficulty || "")}</span></div><div class="rating" aria-label="별점">${[1, 2, 3, 4, 5].map((value) => `<button type="button" data-rating="${value}" aria-label="${value}점">${value <= rating ? "★" : "☆"}</button>`).join("")}</div><textarea class="saved-note" placeholder="나만의 조리 메모를 남겨보세요">${escapeHtml(recipe.user_notes || "")}</textarea><div class="saved-card-actions"><button type="button" class="view-saved">조리법 보기</button><button type="button" class="delete-saved">삭제</button><button type="button" class="share-saved">공유</button></div>`;
            card.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => updateSavedRecipe(recipe.id, { user_rating: Number(button.dataset.rating) })));
            card.querySelector(".saved-note").addEventListener("change", (event) => updateSavedRecipe(recipe.id, { user_notes: event.target.value }));
            card.querySelector(".view-saved").addEventListener("click", () => openCookingMode(recipe));
            card.querySelector(".delete-saved").addEventListener("click", () => { if (window.confirm("이 레시피를 삭제할까요?")) { removeSavedRecipe(recipe.id); renderLibrary(); showToast("레시피를 삭제했어요."); } });
            card.querySelector(".share-saved").addEventListener("click", () => shareRecipe(recipe));
            elements.libraryGrid.append(card);
        });
    }

    function updateSavedRecipe(id, changes) {
        const recipes = getSavedRecipes();
        const recipe = recipes.find((item) => item.id === id);
        if (!recipe) return;
        Object.assign(recipe, changes);
        localStorage.setItem("savedRecipes", JSON.stringify(recipes));
        renderLibrary();
    }

    function removeSavedRecipe(id) {
        localStorage.setItem("savedRecipes", JSON.stringify(getSavedRecipes().filter((recipe) => recipe.id !== id)));
    }

    async function shareRecipe(recipe) {
        const text = `${recipe.title}\n${recipe.description || ""}`;
        try {
            if (navigator.share) await navigator.share({ title: recipe.title, text });
            else { await navigator.clipboard.writeText(text); showToast("레시피 내용을 클립보드에 복사했어요."); }
        } catch (error) {
            if (error.name !== "AbortError") showToast("공유하지 못했어요. 잠시 후 다시 시도해주세요.");
        }
    }

    function openLibrary() {
        elements.library.classList.remove("is-hidden");
        renderLibrary();
        elements.library.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function setAnalyzing(isAnalyzing) {
        state.isAnalyzing = isAnalyzing;
        elements.loadingMessage.classList.toggle("is-hidden", !isAnalyzing);
        elements.emptyMessage.classList.toggle("is-hidden", isAnalyzing || state.ingredients.length > 0);
        if (isAnalyzing) elements.errorMessage.classList.add("is-hidden");
    }

    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.classList.remove("is-hidden");
        elements.emptyMessage.classList.add("is-hidden");
    }

    function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.add("is-visible");
        window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2800);
    }

    function formatBytes(bytes) { return `${(bytes / 1024 / 1024).toFixed(2)}MB`; }
    function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
    function escapeAttribute(value) { return escapeHtml(value).replace(/"/g, "&quot;"); }

    loadProfile();
    pantryItems.forEach((item) => {
        const label = document.createElement("label");
        label.className = "pantry-chip";
        label.innerHTML = `<input type="checkbox" value="${escapeAttribute(item)}"> ${escapeHtml(item)}`;
        label.querySelector("input").addEventListener("change", (event) => {
            state.preferences.pantry = [...elements.pantryList.querySelectorAll("input:checked")].map((input) => input.value);
        });
        elements.pantryList.append(label);
    });
    document.querySelectorAll(".choice-list").forEach((list) => list.addEventListener("click", (event) => {
        const choice = event.target.closest(".choice");
        if (!choice) return;
        list.querySelectorAll(".choice").forEach((item) => item.classList.remove("is-selected"));
        choice.classList.add("is-selected");
        state.preferences[list.dataset.option] = choice.dataset.value;
    }));
    elements.fileInputs.forEach((input) => input.addEventListener("change", (event) => handleFile(event.target.files[0])));
    elements.replaceImage.addEventListener("click", () => elements.fileInputs[1].click());
    elements.form.addEventListener("submit", addIngredient);
    elements.recipeButton.addEventListener("click", goToRecipeStep);
    elements.profileButton.addEventListener("click", openProfile);
    elements.closeProfile.addEventListener("click", () => elements.profileModal.classList.add("is-hidden"));
    elements.profileForm.addEventListener("submit", saveProfile);
    elements.libraryButton.addEventListener("click", openLibrary);
    elements.closeLibrary.addEventListener("click", () => elements.library.classList.add("is-hidden"));
    elements.librarySearch.addEventListener("input", renderLibrary);
    elements.libraryFilter.addEventListener("change", renderLibrary);
    elements.printLibrary.addEventListener("click", () => window.print());
    elements.closeCooking.addEventListener("click", () => elements.cookingMode.classList.add("is-hidden"));
    elements.previousStep.addEventListener("click", () => { if (state.cookingStep > 0) { state.cookingStep -= 1; renderCookingStep(); } });
    elements.nextStep.addEventListener("click", () => { const last = (state.cookingRecipe?.steps || []).length - 1; if (state.cookingStep < last) { state.cookingStep += 1; renderCookingStep(); } else { showToast("조리가 끝났어요. 맛있게 드세요!"); } });
    elements.timerButton.addEventListener("click", startTimer);
    elements.dropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") elements.fileInputs[1].click();
    });
    ["dragenter", "dragover"].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.remove("is-dragging");
    }));
    elements.dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files[0]));
    window.addEventListener("offline", () => showToast("인터넷 연결이 끊겼어요. 연결 상태를 확인해주세요."));
})();
