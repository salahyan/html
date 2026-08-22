// ============================================================
// JARVIS — SCRIPT.JS
// УМНАЯ ПАМЯТЬ + БЫСТРЫЕ ОТВЕТЫ + ГОЛОС
// ============================================================

const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");
const memoryModal = document.getElementById("memoryModal");
const memoryContent = document.getElementById("memoryContent");
const closeMemoryBtn = document.getElementById("closeMemory");
const refreshMemoryBtn = document.getElementById("refreshMemory");
const clearMemoryBtn = document.getElementById("clearMemory");
const memoryButton = document.getElementById("memoryButton");

const JARVIS_API =
    "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// НАСТРОЙКИ ПАМЯТИ
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";
const FACTS_KEY = "jarvis_smart_facts";

const MAX_MESSAGES = 30;
const MAX_CONTEXT_MESSAGES = 5;

// ============================================================
// ЗАГРУЗКА ПАМЯТИ ПРИ СТАРТЕ
// ============================================================

let memory = [];
let smartFacts = [];

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
// ЗАГРУЗКА ФАКТОВ ПРИ СТАРТЕ
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
// АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ВАЖНОЙ ИНФОРМАЦИИ
// ============================================================

function detectSmartFact(text) {
    if (!text) return false;
    const value = text.trim();

    // "Запомни..."
    const rememberMatch = value.match(/^(?:джарвис\s+)?(?:запомни|запиши|сохрани)\s+(.+)$/i);
    if (rememberMatch) {
        addSmartFact(rememberMatch[1].trim());
        return true;
    }

    // Имя пользователя
    const nameMatch = value.match(/(?:меня зовут|моё имя|мое имя)\s+([А-Яа-яЁёA-Za-z-]+)/i);
    if (nameMatch) {
        addSmartFact("Имя пользователя: " + nameMatch[1]);
        return true;
    }

    // Предпочтения
    const preferenceMatch = value.match(/(?:я люблю|мне нравится|я предпочитаю|мне нравится больше)\s+(.+)/i);
    if (preferenceMatch) {
        addSmartFact("Предпочтение пользователя: " + preferenceMatch[1].trim());
        return true;
    }

    return false;
}

// ============================================================
// ПОКАЗАТЬ ПАМЯТЬ (МОДАЛЬНОЕ ОКНО)
// ============================================================

function showMemoryDialog() {
    console.log("🔍 Показываем память...");
    
    // Обновляем содержимое
    updateMemoryContent();
    
    // Показываем модальное окно
    if (memoryModal) {
        memoryModal.style.display = 'flex';
        memoryModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function hideMemoryDialog() {
    if (memoryModal) {
        memoryModal.style.display = 'none';
        memoryModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function updateMemoryContent() {
    if (!memoryContent) return;
    
    let html = '';
    
    // Факты
    if (smartFacts.length > 0) {
        html += '<div class="memory-section"><div class="memory-section-title">📌 ВАЖНЫЕ ФАКТЫ</div>';
        smartFacts.forEach((fact, i) => {
            html += `<div class="memory-item">${i + 1}. ${escapeHTML(fact)}</div>`;
        });
        html += '</div>';
    }
    
    // История диалога
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
    
    memoryContent.innerHTML = html;
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
    showJarvisMessage("", "Память полностью очищена, сэр.");
    speak("Память полностью очищена, сэр.");
    updateMemoryContent();
    hideMemoryDialog();
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

        utterance.onstart = function() {
            statusText.textContent = "Говорю, сэр...";
        };
        utterance.onend = function() {
            statusText.textContent = "Готов, сэр.";
        };
        utterance.onerror = function(event) {
            console.error("Ошибка синтеза речи:", event);
            statusText.textContent = "Ошибка речи, сэр.";
        };

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Ошибка speak():", error);
    }
}

// ============================================================
// ОТОБРАЖЕНИЕ
// ============================================================

function showJarvisMessage(userText, answer) {
    let userHTML = "";
    if (userText) {
        userHTML = `<div class="user-message"><strong>Вы:</strong> ${escapeHTML(userText)}</div>`;
    }
    conversation.innerHTML = `
        ${userHTML}
        <div class="jarvis-message"><strong>JARVIS:</strong> ${escapeHTML(answer)}</div>
    `;
}

// ============================================================
// ЛОКАЛЬНЫЕ КОМАНДЫ
// ============================================================

function handleCommand(text) {
    const original = text.trim();
    const command = original.toLowerCase().replace(/[!?.,]/g, "").trim();

    // СТОП
    if (/\b(стоп|остановись|замолчи|хватит|прекрати говорить|останови речь)\b/.test(command)) {
        window.speechSynthesis.cancel();
        statusText.textContent = "Речь остановлена, сэр.";
        showJarvisMessage(original, "Разумеется, сэр.");
        return true;
    }

    // ОЧИСТИТЬ ПАМЯТЬ
    if (/\b(очисти память|очистить память|удали память|сотри память)\b/.test(command)) {
        clearJarvisMemory();
        return true;
    }

    // ПОКАЗАТЬ ПАМЯТЬ (команда голосом)
    if (/\b(что ты помнишь|что ты обо мне помнишь|покажи память|какую информацию ты помнишь)\b/.test(command)) {
        let answer;
        if (smartFacts.length === 0 && memory.length === 0) {
            answer = "Пока в моей памяти нет сохранённой информации, сэр.";
        } else {
            const facts = smartFacts.length ? "Я помню: " + smartFacts.join(". ") : "Важных фактов пока нет.";
            answer = "Вот что я помню, сэр. " + facts;
        }
        showJarvisMessage(original, answer);
        speak(answer);
        return true;
    }

    return false;
}

// ============================================================
// ЗАПРОС К JARVIS
// ============================================================

let requestInProgress = false;

async function askJarvis(text) {
    if (!text || !text.trim()) return;
    if (requestInProgress) {
        statusText.textContent = "Я ещё обрабатываю предыдущий запрос, сэр.";
        return;
    }

    // Проверяем локальные команды
    if (handleCommand(text)) return;

    // Проверяем команду "запомни"
    const isRemember = detectSmartFact(text);
    if (isRemember) {
        const answer = "Я запомнил, сэр.";
        addToMemory("user", text);
        addToMemory("assistant", answer);
        showJarvisMessage(text, answer);
        speak(answer);
        return;
    }

    requestInProgress = true;
    const cleanText = text.trim();

    // Сохраняем сообщение пользователя
    addToMemory("user", cleanText);

    statusText.textContent = "Обрабатываю запрос, сэр...";

    try {
        // Формируем контекст
        const context = memory.slice(-MAX_CONTEXT_MESSAGES).map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
        }));

        console.log(`📤 Отправляем запрос с ${context.length} сообщениями`);

        // Отправляем запрос
        const response = await fetch(JARVIS_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: cleanText,
                history: context,
                facts: smartFacts
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Ошибка сервера");
        }

        if (!data.answer) {
            throw new Error("AI не вернул ответ");
        }

        let answer = String(data.answer).trim();

        // Очистка от тегов
        answer = answer
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
            .trim();

        if (!answer) {
            throw new Error("После очистки AI не вернул текст");
        }

        // Сохраняем ответ
        addToMemory("assistant", answer);

        // Показываем
        showJarvisMessage(cleanText, answer);
        statusText.textContent = "Готов, сэр.";
        speak(answer);

    } catch (error) {
        console.error("JARVIS error:", error);
        const errorMessage = "Ошибка связи с сервером, сэр.";
        conversation.innerHTML += `
            <div class="jarvis-message">
                <strong>JARVIS:</strong> ${errorMessage}
                <br>
                <small style="color:#888;font-size:12px;">${escapeHTML(error.message)}</small>
            </div>
        `;
        statusText.textContent = "Ошибка, сэр.";
    } finally {
        requestInProgress = false;
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

// ============================================================
// SPEECH RECOGNITION
// ============================================================

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
        await askJarvis(text);
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
// ПРИВЯЗКА КНОПКИ "ПАМЯТЬ"
// ============================================================

function setupMemoryButton() {
    console.log("🔍 Настраиваем кнопку 'Память'...");
    
    // Прямая привязка по ID
    if (memoryButton) {
        // Убираем старые обработчики
        const newButton = memoryButton.cloneNode(true);
        memoryButton.parentNode.replaceChild(newButton, memoryButton);
        
        // Добавляем обработчик
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("🖱️ Нажата кнопка 'Память'");
            showMemoryDialog();
        });
        
        console.log("✅ Кнопка 'Память' привязана по ID");
    } else {
        console.log("⚠️ Кнопка с ID 'memoryButton' не найдена");
    }
}

// ============================================================
// МОДАЛЬНОЕ ОКНО
// ============================================================

// Закрытие по кнопке
if (closeMemoryBtn) {
    closeMemoryBtn.addEventListener('click', hideMemoryDialog);
}

// Закрытие по клику вне панели
if (memoryModal) {
    memoryModal.addEventListener('click', function(e) {
        if (e.target === memoryModal) {
            hideMemoryDialog();
        }
    });
}

// Обновление памяти
if (refreshMemoryBtn) {
    refreshMemoryBtn.addEventListener('click', function() {
        updateMemoryContent();
        statusText.textContent = "Память обновлена, сэр.";
        setTimeout(() => {
            statusText.textContent = "Готов, сэр.";
        }, 1000);
    });
}

// Очистка памяти
if (clearMemoryBtn) {
    clearMemoryBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите очистить всю память, сэр?')) {
            clearJarvisMemory();
        }
    });
}

// ============================================================
// ЗАГРУЗКА ПРИ СТАРТЕ
// ============================================================

// Загружаем память
loadMemory();
loadFacts();

console.log("📝 Текущая память:", memory.length, "сообщений");
console.log("📌 Текущие факты:", smartFacts.length, "фактов");

// Настраиваем кнопку после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log("📄 DOM загружен, настраиваем кнопку...");
        setTimeout(setupMemoryButton, 300);
    });
} else {
    console.log("📄 DOM уже загружен, настраиваем кнопку...");
    setTimeout(setupMemoryButton, 300);
}

// ============================================================
// ЭКСПОРТ ДЛЯ ДРУГИХ ЧАСТЕЙ САЙТА
// ============================================================

window.JARVIS = {
    ask: askJarvis,
    speak: speak,
    clearMemory: clearJarvisMemory,
    getMemory: function() { return memory; },
    getFacts: function() { return smartFacts; },
    addFact: addSmartFact,
    showMemory: showMemoryDialog,
    updateMemory: updateMemoryContent
};

// ============================================================
// ГОТОВО
// ============================================================

console.log("✅ JARVIS: система памяти загружена.");
console.log(`📝 Сообщений в памяти: ${memory.length}`);
console.log(`📌 Сохранённых фактов: ${smartFacts.length}`);
console.log("💡 Для просмотра памяти нажмите кнопку 'Память' или скажите 'что ты помнишь'");
console.log("🔧 Память сохраняется автоматически после каждого сообщения");
