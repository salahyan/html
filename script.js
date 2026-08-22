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
const clearChatBtn = document.getElementById("clearChatBtn");
const memoryButton = document.getElementById("memoryButton");

const JARVIS_API = "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// ЧАСТИЦЫ (фон)
// ============================================================

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 3 + 1) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
        particle.style.animationDelay = (Math.random() * 20) + 's';
        particle.style.opacity = Math.random() * 0.3 + 0.05;
        container.appendChild(particle);
    }
}
createParticles();

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
// ПОКАЗ СООБЩЕНИЙ
// ============================================================

function showMessage(userText, answer, source = 'voice') {
    let container;
    if (source === 'voice') container = conversation;
    else container = textConversation;

    const userHTML = `<div class="user-message"><strong>Вы:</strong> ${escapeHTML(userText)}</div>`;
    const jarvisHTML = `<div class="jarvis-message"><strong>JARVIS:</strong> ${escapeHTML(answer)}</div>`;

    if (source === 'voice') {
        container.innerHTML = userHTML + jarvisHTML;
    } else {
        container.innerHTML += userHTML + jarvisHTML;
    }

    container.scrollTop = container.scrollHeight;
}

function showTyping(source = 'voice') {
    const container = source === 'voice' ? conversation : textConversation;
    const typingHTML = `<div class="typing-indicator">JARVIS печатает...</div>`;
    container.innerHTML += typingHTML;
    container.scrollTop = container.scrollHeight;
}

function removeTyping(source = 'voice') {
    const container = source === 'voice' ? conversation : textConversation;
    const typing = container.querySelector('.typing-indicator');
    if (typing) typing.remove();
}

// ============================================================
// ГОЛОС (только для голосового режима)
// ============================================================

function speak(text) {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
        statusText.textContent = "Синтез речи не поддерживается.";
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
        if (source === 'voice') speak(answer);
        return;
    }

    requestInProgress = true;
    const cleanText = text.trim();

    addToMemory("user", cleanText);

    statusText.textContent = "Обрабатываю запрос, сэр...";
    showTyping(source);

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

        removeTyping(source);

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

        if (source === 'voice') speak(answer);

    } catch (error) {
        removeTyping(source);
        console.error("JARVIS error:", error);
        const errorMessage = "Ошибка связи с сервером, сэр.";
        showMessage(cleanText, errorMessage + "\n\n" + error.message, source);
        statusText.textContent = "Ошибка, сэр.";
    } finally {
        requestInProgress = false;
    }
}

// ============================================================
// ЗАПРОС С ФОТО
// ============================================================

let uploadedFile = null;
let uploadedImageData = null;

async function askWithPhoto(question) {
    if (!uploadedImageData) {
        statusText.textContent = "Сначала загрузите фото, сэр.";
        return;
    }

    if (requestInProgress) {
        statusText.textContent = "Я ещё обрабатываю запрос, сэр.";
        return;
    }

    const cleanQuestion = question.trim() || "Опиши, что ты видишь на этом фото.";

    requestInProgress = true;
    statusText.textContent = "Анализирую фото, сэр...";
    showTyping('text');

    try {
        const context = memory.slice(-MAX_CONTEXT_MESSAGES).map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
        }));

        const response = await fetch(JARVIS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: cleanQuestion,
                image: uploadedImageData,
                history: context,
                facts: smartFacts
            })
        });

        const data = await response.json();

        removeTyping('text');

        if (!response.ok) throw new Error(data.error || "Ошибка сервера");
        if (!data.answer) throw new Error("AI не вернул ответ");

        let answer = String(data.answer).trim()
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
            .trim();

        if (!answer) throw new Error("После очистки AI не вернул текст");

        addToMemory("user", "[Фото] " + cleanQuestion);
        addToMemory("assistant", answer);

        showMessage("[Фото] " + cleanQuestion, answer, 'text');
        statusText.textContent = "Готов, сэр.";

        photoQuestion.value = '';

    } catch (error) {
        removeTyping('text');
        console.error("Photo analysis error:", error);
        statusText.textContent = "Ошибка анализа, сэр.";
        showMessage("[Фото] " + cleanQuestion, "Ошибка: " + error.message, 'text');
    } finally {
        requestInProgress = false;
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

analyzePhotoBtn.addEventListener('click', () => {
    askWithPhoto(photoQuestion.value);
});

photoQuestion.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        askWithPhoto(photoQuestion.value);
    }
});

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
        html += `<div class="memory-item" style="color:#3a6a8a;font-size:11px;margin-top:8px;">📊 Всего сообщений: ${memory.length}</div>`;
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
// ОЧИСТКА
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

function clearChat() {
    if (confirm('Очистить весь диалог, сэр?')) {
        conversation.innerHTML = `<div class="jarvis-message">Добро пожаловать, сэр. Я готов.</div>`;
        textConversation.innerHTML = `<div class="jarvis-message">Напишите или загрузите фото, сэр.</div>`;
        statusText.textContent = "Чат очищен, сэр.";
    }
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

function setupButtons() {
    // Кнопка памяти
    if (memoryButton) {
        const newBtn = memoryButton.cloneNode(true);
        memoryButton.parentNode.replaceChild(newBtn, memoryButton);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showMemoryDialog();
        });
    }

    // Кнопка очистки чата
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }

    // Модальное окно
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

    console.log("✅ Все кнопки привязаны");
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
        setTimeout(setupButtons, 300);
    });
} else {
    setTimeout(setupButtons, 300);
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

console.log("✅ JARVIS v2.0 by Sergo загружен");
console.log(`📝 Сообщений: ${memory.length}`);
console.log(`📌 Фактов: ${smartFacts.length}`);
console.log("💡 Кнопка 'Память' показывает историю");
console.log("🔧 Память сохраняется автоматически");
