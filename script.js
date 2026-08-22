// ============================================================
// JARVIS — SCRIPT.JS v4.0
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
const photoLoading = document.getElementById("photoLoading");
const photoLoadingText = document.getElementById("photoLoadingText");
const memoryModal = document.getElementById("memoryModal");
const memoryContent = document.getElementById("memoryContent");
const closeMemoryBtn = document.getElementById("closeMemory");
const refreshMemoryBtn = document.getElementById("refreshMemory");
const clearMemoryBtn = document.getElementById("clearMemory");
const memoryButton = document.getElementById("memoryButton");

const JARVIS_API = "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// ЧАСТИЦЫ
// ============================================================

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 2 + 1) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = (Math.random() * 25 + 15) + 's';
        particle.style.animationDelay = (Math.random() * 25) + 's';
        particle.style.opacity = Math.random() * 0.3 + 0.05;
        container.appendChild(particle);
    }
}
createParticles();

// ============================================================
// ПАМЯТЬ
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";
const FACTS_KEY = "jarvis_smart_facts";
const MAX_MESSAGES = 30;
const MAX_CONTEXT_MESSAGES = 5;

let memory = [];
let smartFacts = [];

function loadMemory() {
    try {
        const saved = localStorage.getItem(MEMORY_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            memory = Array.isArray(parsed) ? parsed : [];
        }
    } catch (error) {
        memory = [];
    }
}

function saveMemory() {
    try {
        memory = memory.slice(-MAX_MESSAGES);
        localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch (error) {}
}

function addToMemory(role, text) {
    if (!text || !text.trim()) return;
    memory.push({ role: role, text: text.trim(), time: new Date().toISOString() });
    saveMemory();
}

function loadFacts() {
    try {
        const saved = localStorage.getItem(FACTS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            smartFacts = Array.isArray(parsed) ? parsed : [];
        }
    } catch (error) {
        smartFacts = [];
    }
}

function saveFacts() {
    try {
        smartFacts = smartFacts.slice(-30);
        localStorage.setItem(FACTS_KEY, JSON.stringify(smartFacts));
    } catch (error) {}
}

function addSmartFact(text) {
    if (!text || !text.trim()) return;
    const fact = text.trim();
    const exists = smartFacts.some(item => item.toLowerCase() === fact.toLowerCase());
    if (exists) return;
    smartFacts.push(fact);
    saveFacts();
}

function detectSmartFact(text) {
    if (!text) return false;
    const value = text.trim();

    const rememberMatch = value.match(/^(?:джарвис\s+)?(?:запомни|запиши|сохрани)\s+(.+)$/i);
    if (rememberMatch) { addSmartFact(rememberMatch[1].trim()); return true; }

    const nameMatch = value.match(/(?:меня зовут|моё имя|мое имя)\s+([А-Яа-яЁёA-Za-z-]+)/i);
    if (nameMatch) { addSmartFact("Имя пользователя: " + nameMatch[1]); return true; }

    const preferenceMatch = value.match(/(?:я люблю|мне нравится|я предпочитаю|мне нравится больше)\s+(.+)/i);
    if (preferenceMatch) { addSmartFact("Предпочтение пользователя: " + preferenceMatch[1].trim()); return true; }

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
    const container = source === 'voice' ? conversation : textConversation;
    const userHTML = `<div class="user-message"><strong>Вы:</strong> ${escapeHTML(userText)}</div>`;
    const jarvisHTML = `<div class="jarvis-message"><strong>JARVIS:</strong> ${escapeHTML(answer)}</div>`;

    if (source === 'voice') {
        container.innerHTML = userHTML + jarvisHTML;
    } else {
        container.innerHTML += userHTML + jarvisHTML;
    }
    container.scrollTop = container.scrollHeight;
}

function showUserMessageOnly(text, source = 'text') {
    const container = source === 'voice' ? conversation : textConversation;
    const userHTML = `<div class="user-message"><strong>Вы:</strong> ${escapeHTML(text)}</div>`;
    container.innerHTML += userHTML;
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

function showPhotoLoading(text) {
    photoLoadingText.textContent = text || 'Фото загружается, сэр...';
    photoLoading.classList.add('show');
}

function hidePhotoLoading() {
    photoLoading.classList.remove('show');
}

// ============================================================
// ГОЛОС
// ============================================================

function speak(text) {
    if (!text) return;
    if (!("speechSynthesis" in window)) return;

    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ru-RU";
        utterance.rate = 0.85;
        utterance.pitch = 0.8;
        utterance.volume = 1;

        utterance.onstart = () => statusText.textContent = "Говорю, сэр...";
        utterance.onend = () => statusText.textContent = "Готов, сэр.";
        utterance.onerror = () => statusText.textContent = "Ошибка речи, сэр.";

        window.speechSynthesis.speak(utterance);
    } catch (error) {}
}

// ============================================================
// ЗАПРОС К JARVIS
// ============================================================

let requestInProgress = false;

async function askJarvis(text, source = 'voice') {
    if (!text || !text.trim()) return;
    if (requestInProgress) {
        statusText.textContent = "Я ещё обрабатываю запрос, сэр.";
        return;
    }

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

    if (source === 'text') showTyping(source);

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

        if (source === 'text') removeTyping(source);

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
        if (source === 'text') removeTyping(source);
        showMessage(cleanText, "Ошибка: " + error.message, source);
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

function resetPhotoUpload() {
    uploadedFile = null;
    uploadedImageData = null;
    photoPreview.classList.remove('show', 'sending');
    photoPreview.src = '';
    photoLabel.textContent = '📎 Загрузить фото';
    photoLabel.classList.remove('has-file');
    photoInput.value = '';
    photoQuestion.value = '';
    hidePhotoLoading();
}

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

    // Показываем анимацию отправки
    photoPreview.classList.add('sending');

    // Показываем сообщение пользователя
    showUserMessageOnly("[Фото] " + cleanQuestion, 'text');
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

        const jarvisHTML = `<div class="jarvis-message"><strong>JARVIS:</strong> ${escapeHTML(answer)}</div>`;
        textConversation.innerHTML += jarvisHTML;
        textConversation.scrollTop = textConversation.scrollHeight;

        statusText.textContent = "Готов, сэр.";

        // Очищаем фото после отправки
        setTimeout(() => {
            resetPhotoUpload();
        }, 500);

    } catch (error) {
        removeTyping('text');
        statusText.textContent = "Ошибка анализа, сэр.";
        const errorHTML = `<div class="jarvis-message"><strong>JARVIS:</strong> Ошибка: ${escapeHTML(error.message)}</div>`;
        textConversation.innerHTML += errorHTML;
        textConversation.scrollTop = textConversation.scrollHeight;

        // Возвращаем фото если ошибка
        photoPreview.classList.remove('sending');
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

    // Если есть фото, отправляем с фото
    if (uploadedImageData) {
        askWithPhoto(text);
        textInput.value = '';
        return;
    }

    showUserMessageOnly(text, 'text');
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

    // Показываем загрузку
    showPhotoLoading('Фото загружается, сэр...');

    uploadedFile = file;
    photoLabel.textContent = '📎 ' + file.name;
    photoLabel.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = function(event) {
        uploadedImageData = event.target.result;
        photoPreview.src = uploadedImageData;
        photoPreview.classList.add('show');

        // Скрываем загрузку, показываем готовность
        hidePhotoLoading();

        // Показываем сообщение в чате
        const readyMsg = `<div class="jarvis-message" style="border-right-color:#4a9eff;color:#7ab8e0;"><strong>📷 JARVIS:</strong> Фото загружено, сэр. Нажмите "🔍 Анализ" или напишите вопрос.</div>`;
        textConversation.innerHTML += readyMsg;
        textConversation.scrollTop = textConversation.scrollHeight;
    };
    reader.readAsDataURL(file);
});

// ============================================================
// ФОТО — АНАЛИЗ
// ============================================================

analyzePhotoBtn.addEventListener('click', () => {
    const question = photoQuestion.value.trim();
    askWithPhoto(question);
});

photoQuestion.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const question = photoQuestion.value.trim();
        askWithPhoto(question);
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
    } catch (error) {}
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
        showUserMessageOnly(text, 'voice');
        await askJarvis(text, 'voice');
    };

    recognition.onerror = function(event) {
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
        html += `<div class="memory-item" style="color:#2a4a6a;font-size:11px;margin-top:8px;">📊 Всего сообщений: ${memory.length}</div>`;
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
// ОЧИСТКА ПАМЯТИ (в модальном окне)
// ============================================================

function clearJarvisMemory() {
    memory = [];
    smartFacts = [];
    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(FACTS_KEY);

    // Голосовой ответ
    const clearMsg = "Память полностью очищена, сэр.";
    statusText.textContent = clearMsg;

    // Очищаем чаты
    conversation.innerHTML = `<div class="jarvis-message">Добро пожаловать, сэр. Я готов.</div>`;
    textConversation.innerHTML = `<div class="jarvis-message">Напишите сообщение или загрузите фото, сэр.</div>`;

    // Говорим
    speak(clearMsg);

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
// AUDIO UNLOCK
// ============================================================

function unlockAudio() {
    if (!("speechSynthesis" in window)) return;
    try {
        window.speechSynthesis.cancel();
        const audio = new SpeechSynthesisUtterance("");
        audio.lang = "ru-RU";
        audio.volume = 0;
        window.speechSynthesis.speak(audio);
    } catch (error) {}
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

console.log("✅ JARVIS v4.0 by Sergo загружен");
console.log(`📝 Сообщений: ${memory.length}`);
console.log(`📌 Фактов: ${smartFacts.length}`);
