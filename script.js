// ============================================================
// JARVIS — SCRIPT.JS
// ГОЛОСОВОЙ + ТЕКСТОВЫЙ ЧАТ + АНАЛИЗ ФОТО
// ============================================================

// ============================================================
// ЭЛЕМЕНТЫ
// ============================================================

const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");
const textConversation = document.getElementById("textConversation");
const photoConversation = document.getElementById("photoConversation");
const textInput = document.getElementById("textInput");
const sendTextBtn = document.getElementById("sendTextBtn");
const photoInput = document.getElementById("photoInput");
const photoLabel = document.getElementById("photoLabel");
const photoPreview = document.getElementById("photoPreview");
const photoQuestion = document.getElementById("photoQuestion");
const analyzePhotoBtn = document.getElementById("analyzePhotoBtn");
const memoryModal = document.getElementById("memoryModal");
const memoryContent = document.getElementById("memoryContent");
const closeMemoryBtn = document.getElementById("closeMemory");
const refreshMemoryBtn = document.getElementById("refreshMemory");
const clearMemoryBtn = document.getElementById("clearMemory");
const memoryButton = document.getElementById("memoryButton");

const JARVIS_API = "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// НАСТРОЙКИ ПАМЯТИ
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";
const FACTS_KEY = "jarvis_smart_facts";

const MAX_MESSAGES = 30;
const MAX_CONTEXT_MESSAGES = 5;

// ============================================================
// ПАМЯТЬ
// ============================================================

let memory = [];
let smartFacts = [];

// ============================================================
// ЗАГРУЗКА ПАМЯТИ
// ============================================================

function loadMemory() {
    try {
        const saved = localStorage.getItem(MEMORY_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            memory = Array.isArray(parsed) ? parsed : [];
            console.log(`📝 Загружено ${memory.length} сообщений`);
        }
    } catch (error) {
        console.error("Ошибка загрузки памяти:", error);
        memory = [];
    }
}

function saveMemory() {
    try {
        memory = memory.slice(-MAX_MESSAGES);
        localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
        console.log(`💾 Сохранено ${memory.length} сообщений`);
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

function addToMemory(role, text) {
    if (!text || !text.trim()) return;
    memory.push({
        role: role,
        text: text.trim(),
        time: new Date().toISOString()
    });
    saveMemory();
}

// ============================================================
// ФАКТЫ
// ============================================================

function loadFacts() {
    try {
        const saved = localStorage.getItem(FACTS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            smartFacts = Array.isArray(parsed) ? parsed : [];
            console.log(`📌 Загружено ${smartFacts.length} фактов`);
        }
    } catch (error) {
        console.error("Ошибка загрузки фактов:", error);
        smartFacts = [];
    }
}

function saveFacts() {
    try {
        smartFacts = smartFacts.slice(-30);
        localStorage.setItem(FACTS_KEY, JSON.stringify(smartFacts));
        console.log(`💾 Сохранено ${smartFacts.length} фактов`);
    } catch (error) {
        console.error("Ошибка сохранения фактов:", error);
    }
}

function addSmartFact(text) {
    if (!text || !text.trim()) return;
    const fact = text.trim();
    const exists = smartFacts.some(item => item.toLowerCase() === fact.toLowerCase());
    if (exists) return;
    smartFacts.push(fact);
    saveFacts();
    console.log(`📌 Добавлен факт: ${fact}`);
}

// ============================================================
// ОПРЕДЕЛЕНИЕ ВАЖНОЙ ИНФОРМАЦИИ
// ============================================================

function detectSmartFact(text) {
    if (!text) return false;
    const value = text.trim();

    const rememberMatch = value.match(/^(?:джарвис\s+)?(?:запомни|запиши|сохрани)\s+(.+)$/i);
    if (rememberMatch) {
        addSmartFact(rememberMatch[1].trim());
        return true;
    }

    const nameMatch = value.match(/(?:меня зовут|моё имя|мое имя)\s+([А-Яа-яЁёA-Za-z-]+)/i);
    if (nameMatch) {
        addSmartFact("Имя пользователя: " + nameMatch[1]);
        return true;
    }

    const preferenceMatch = value.match(/(?:я люблю|мне нравится|я предпочитаю|мне нравится больше)\s+(.+)/i);
    if (preferenceMatch) {
        addSmartFact("Предпочтение пользователя: " + preferenceMatch[1].trim());
        return true;
    }

    return false;
}

// ============================================================
// ВКЛАДКИ
// ============================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const tabName = this.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + tabName).classList.add('active');
    });
});

// ============================================================
// ОБЩИЙ ЗАПРОС К JARVIS
// ============================================================

let requestInProgress = false;

async function askJarvis(text, source = 'voice') {
    if (!text || !text.trim()) return;
    if (requestInProgress) {
        statusText.textContent = "Я ещё обрабатываю запрос, сэр.";
        return;
    }

    // Проверяем команду "запомни"
    const isRemember = detectSmartFact(text);
    if (isRemember) {
        const answer = "Я запомнил, сэр.";
        addToMemory("user", text);
        addToMemory("assistant", answer);
        showMessage(text, answer, source);
        speak(answer);
        return;
    }

    requestInProgress = true;
    const cleanText = text.trim();

    addToMemory("user", cleanText);

    statusText.textContent = "Обрабатываю запрос, сэр...";

    try {
        const context = memory.slice(-MAX_CONTEXT_MESSAGES).map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
        }));

        const response = await fetch(JARVIS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: cleanText,
                history: context,
                facts: smartFacts
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Ошибка сервера");
        if (!data.answer) throw new Error("AI не вернул ответ");

        let answer = String(data.answer).trim()
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
            .trim();

        if (!answer) throw new Error("После очистки AI не вернул текст");

        addToMemory("assistant", answer);
        showMessage(cleanText, answer, source);
        statusText.textContent = "Готов, сэр.";
        speak(answer);

    } catch (error) {
        console.error("JARVIS error:", error);
        const errorMessage = "Ошибка связи с сервером, сэр.";
        showMessage(cleanText, errorMessage + "\n\n" + error.message, source);
        statusText.textContent = "Ошибка, сэр.";
    } finally {
        requestInProgress = false;
    }
}

// ============================================================
// ПОКАЗ СООБЩЕНИЙ
// ============================================================

function showMessage(userText, answer, source = 'voice') {
    let container;
    if (source === 'voice') container = conversation;
    else if (source === 'text') container = textConversation;
    else if (source === 'photo') container = photoConversation;
    else container = conversation;

    const userHTML = `<div class="user-message"><strong>Вы:</strong> ${escapeHTML(userText)}</div>`;
    const jarvisHTML = `<div class="jarvis-message"><strong>JARVIS:</strong> ${escapeHTML(answer)}</div>`;

    if (source === 'text') {
        container.innerHTML += userHTML + jarvisHTML;
    } else {
        container.innerHTML = userHTML + jarvisHTML;
    }

    container.scrollTop = container.scrollHeight;
}

// ============================================================
// ГОЛОС
// ============================================================

function speak(text) {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
        statusText.textContent = "Синтез речи не поддерживается, сэр.";
        return;
    }

    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ru-RU";
        utterance.rate = 0.88;
        utterance.pitch = 0.82;
        utterance.volume = 1;

        utterance.onstart = () => statusText.textContent = "Говорю, сэр...";
        utterance.onend = () => statusText.textContent = "Готов, сэр.";
        utterance.onerror = () => statusText.textContent = "Ошибка речи, сэр.";

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Ошибка speak():", error);
    }
}

// ============================================================
// ТЕКСТОВЫЙ ЧАТ
// ============================================================

function sendTextMessage() {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    askJarvis(text, 'text');
}

sendTextBtn.addEventListener('click', sendTextMessage);
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTextMessage();
});

// ============================================================
// ФОТО — ЗАГРУЗКА
// ============================================================

let uploadedFile = null;
let uploadedImageData = null;

photoInput.addEventListener('change', function(e) {
    const file = this.files[0];
    if (!file) return;

    uploadedFile = file;
    photoLabel.textContent = '📎 ' + file.name;
    photoLabel.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = function(event) {
        uploadedImageData = event.target.result;
        photoPreview.src = uploadedImageData;
        photoPreview.classList.add('show');
    };
    reader.readAsDataURL(file);
});

// ============================================================
// ФОТО — АНАЛИЗ
// ============================================================

analyzePhotoBtn.addEventListener('click', analyzePhoto);

async function analyzePhoto() {
    if (!uploadedImageData) {
        statusText.textContent = "Сначала загрузите фото, сэр.";
        return;
    }

    const question = photoQuestion.value.trim() || "Опиши, что ты видишь на этом фото.";

    statusText.textContent = "Анализирую фото, сэр...";

    try {
        // Отправляем фото в формате base64
        const response = await fetch(JARVIS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: question,
                image: uploadedImageData,
                history: memory.slice(-MAX_CONTEXT_MESSAGES).map(msg => ({
                    role: msg.role === "user" ? "user" : "assistant",
                    content: msg.text
                })),
                facts: smartFacts
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Ошибка сервера");
        if (!data.answer) throw new Error("AI не вернул ответ");

        let answer = String(data.answer).trim()
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
            .trim();

        if (!answer) throw new Error("После очистки AI не вернул текст");

        addToMemory("user", "[Фото] " + question);
        addToMemory("assistant", answer);

        showMessage("[Фото] " + question, answer, 'photo');
        statusText.textContent = "Готов, сэр.";
        speak(answer);

        photoQuestion.value = '';

    } catch (error) {
        console.error("Photo analysis error:", error);
        statusText.textContent = "Ошибка анализа, сэр.";
        showMessage("[Фото] " + question, "Ошибка: " + error.message, 'photo');
    }
}

// ============================================================
// МИКРОФОН
// ============================================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

function handleMicClick() {
    if (isListening) return;
    if (requestInProgress) {
        statusText.textContent = "Я ещё обрабатываю запрос, сэр.";
        return;
    }
    if (!SpeechRecognition) {
        statusText.textContent = "Распознавание речи не поддерживается.";
        return;
    }
    try {
        window.speechSynthesis.cancel();
        recognition.start();
    } catch (error) {
        console.error("Ошибка запуска микрофона:", error);
    }
}

if (!SpeechRecognition) {
    statusText.textContent = "Распознавание речи не поддерживается.";
    if (micButton) micButton.disabled = true;
} else {
    recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (micButton) {
        micButton.addEventListener("click", handleMicClick);
    }

    recognition.onstart = function() {
        isListening = true;
        if (micButton) micButton.classList.add("listening");
        statusText.textContent = "Слушаю вас, сэр...";
    };

    recognition.onresult = async function(event) {
        const text = event.results[0][0].transcript.trim();
        if (!text) {
            statusText.textContent = "Я не расслышал вас, сэр.";
            return;
        }
        conversation.innerHTML = `
            <div class="user-message"><strong>Вы:</strong> ${escapeHTML(text)}</div>
            <div class="jarvis-message"><strong>JARVIS:</strong> Обрабатываю запрос, сэр...</div>
        `;
        await askJarvis(text, 'voice');
    };

    recognition.onerror = function(event) {
        console.error("Speech error:", event.error);
        isListening = false;
        if (micButton) micButton.classList.remove("listening");
        if (event.error === "not-allowed") {
            statusText.textContent = "Разрешите доступ к микрофону, сэр.";
        } else if (event.error === "no-speech") {
            statusText.textContent = "Я не услышал вас, сэр.";
        } else {
            statusText.textContent = "Не удалось распознать речь.";
        }
    };

    recognition.onend = function() {
        isListening = false;
        if (micButton) micButton.classList.remove("listening");
    };
}

// ============================================================
// ПАМЯТЬ — МОДАЛЬНОЕ ОКНО
// ============================================================

function showMemoryDialog() {
    console.log("🔍 Показываем память...");

    const modal = document.getElementById('memoryModal');
    const content = document.getElementById('memoryContent');

    if (!modal) {
        showMemoryAlert();
        return;
    }

    let html = '';

    if (smartFacts.length > 0) {
        html += '<div class="memory-section"><div class="memory-section-title">📌 ВАЖНЫЕ ФАКТЫ</div>';
        smartFacts.forEach((fact, i) => {
            html += `<div class="memory-item">${i + 1}. ${escapeHTML(fact)}</div>`;
        });
        html += '</div>';
    }

    if (memory.length > 0) {
        html += '<div class="memory-section"><div class="memory-section-title">💬 ИСТОРИЯ ДИАЛОГА</div>';
        const lastMessages = memory.slice(-20);
        lastMessages.forEach((msg) => {
            const role = msg.role === "user" ? "👤 Вы" : "🤖 JARVIS";
            const text = msg.text.length > 80 ? msg.text.substring(0, 80) + "..." : msg.text;
            html += `<div class="memory-item ${msg.role}">${role}: ${escapeHTML(text)}</div>`;
        });
        html += `<div class="memory-item" style="color:#888;font-size:12px;margin-top:10px;">📊 Всего сообщений: ${memory.length}</div>`;
        html += '</div>';
    }

    if (!html) {
        html = '<div class="memory-empty">Память пока пуста, сэр.</div>';
    }

    if (content) content.innerHTML = html;

    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    console.log("✅ Модальное окно открыто");
}

function hideMemoryDialog() {
    const modal = document.getElementById('memoryModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function showMemoryAlert() {
    let text = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📝 ПАМЯТЬ JARVIS\n";
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    if (smartFacts.length > 0) {
        text += "📌 ВАЖНЫЕ ФАКТЫ:\n";
        smartFacts.forEach((fact, i) => {
            text += `  ${i + 1}. ${fact}\n`;
        });
        text += "\n";
    }

    if (memory.length > 0) {
        text += "💬 ИСТОРИЯ ДИАЛОГА:\n";
        const lastMessages = memory.slice(-20);
        lastMessages.forEach((msg) => {
            const role = msg.role === "user" ? "👤 Вы" : "🤖 JARVIS";
            const msgText = msg.text.length > 80 ? msg.text.substring(0, 80) + "..." : msg.text;
            text += `${role}: ${msgText}\n`;
        });
        text += `\n📊 Всего сообщений: ${memory.length}`;
    } else {
        text += "💬 История диалога пуста.";
    }

    alert(text);
}

// ============================================================
// ОЧИСТКА ПАМЯТИ
// ============================================================

function clearJarvisMemory() {
    memory = [];
    smartFacts = [];
    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(FACTS_KEY);
    statusText.textContent = "Память полностью очищена, сэр.";
    showMessage("", "Память полностью очищена, сэр.", 'voice');
    speak("Память полностью очищена, сэр.");
    hideMemoryDialog();
}

// ============================================================
// ЗАЩИТА HTML
// ============================================================

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// AUDIO UNLOCK ДЛЯ IPHONE
// ============================================================

function unlockAudio() {
    if (!("speechSynthesis" in window)) return;
    try {
        window.speechSynthesis.cancel();
        const audio = new SpeechSynthesisUtterance("");
        audio.lang = "ru-RU";
        audio.volume = 0;
        window.speechSynthesis.speak(audio);
    } catch (error) {
        console.log("Audio unlock:", error);
    }
}

document.addEventListener("touchstart", function firstTouch() {
    unlockAudio();
    document.removeEventListener("touchstart", firstTouch);
}, { passive: true });

document.addEventListener("click", function firstClick() {
    unlockAudio();
    document.removeEventListener("click", firstClick);
}, { passive: true });

// ============================================================
// ПРИВЯЗКА КНОПОК
// ============================================================

function setupMemoryButton() {
    const memoryBtn = document.getElementById('memoryButton');
    if (memoryBtn) {
        const newBtn = memoryBtn.cloneNode(true);
        memoryBtn.parentNode.replaceChild(newBtn, memoryBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showMemoryDialog();
        });
        newBtn.style.cursor = 'pointer';
        console.log("✅ Кнопка 'Память' привязана");
    }
}

function setupModal() {
    if (closeMemoryBtn) {
        closeMemoryBtn.addEventListener('click', hideMemoryDialog);
    }
    if (memoryModal) {
        memoryModal.addEventListener('click', (e) => {
            if (e.target === memoryModal) hideMemoryDialog();
        });
    }
    if (refreshMemoryBtn) {
        refreshMemoryBtn.addEventListener('click', () => {
            showMemoryDialog();
            statusText.textContent = "Память обновлена, сэр.";
            setTimeout(() => statusText.textContent = "Готов, сэр.", 1000);
        });
    }
    if (clearMemoryBtn) {
        clearMemoryBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить всю память, сэр?')) {
                clearJarvisMemory();
                hideMemoryDialog();
            }
        });
    }
    console.log("✅ Модальное окно настроено");
}

// ============================================================
// ЗАГРУЗКА
// ============================================================

loadMemory();
loadFacts();

console.log("📝 Текущая память:", memory.length, "сообщений");
console.log("📌 Текущие факты:", smartFacts.length, "фактов");

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            setupMemoryButton();
            setupModal();
        }, 300);
    });
} else {
    setTimeout(() => {
        setupMemoryButton();
        setupModal();
    }, 300);
}

// ============================================================
// ЭКСПОРТ
// ============================================================

window.JARVIS = {
    ask: askJarvis,
    speak: speak,
    clearMemory: clearJarvisMemory,
    getMemory: () => memory,
    getFacts: () => smartFacts,
    addFact: addSmartFact,
    showMemory: showMemoryDialog
};

console.log("✅ JARVIS загружен");
console.log(`📝 Сообщений: ${memory.length}`);
console.log(`📌 Фактов: ${smartFacts.length}`);
console.log("💡 Кнопка 'Память' показывает историю");
console.log("🔧 Память сохраняется автоматически");
