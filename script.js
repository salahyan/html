// ============================================================
// JARVIS — SCRIPT.JS
// УМНАЯ ПАМЯТЬ + БЫСТРЫЕ ОТВЕТЫ + ГОЛОС
// ============================================================

const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

const JARVIS_API =
    "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// НАСТРОЙКИ ПАМЯТИ (МАКСИМАЛЬНО ОПТИМИЗИРОВАНЫ)
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";
const FACTS_KEY = "jarvis_smart_facts";

const MAX_MESSAGES = 20;        // Еще меньше для скорости
const MAX_CONTEXT_MESSAGES = 3; // Только 3 последних сообщения!

// ============================================================
// ПАМЯТЬ ДИАЛОГА
// ============================================================

let memory = loadMemory();
let smartFacts = loadFacts();

function loadMemory() {
    try {
        const saved = localStorage.getItem(MEMORY_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Ошибка загрузки памяти:", error);
        return [];
    }
}

function saveMemory() {
    try {
        memory = memory.slice(-MAX_MESSAGES);
        localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

function addToMemory(role, text) {
    if (!text || !text.trim()) return;
    memory.push({
        role,
        text: text.trim(),
        time: new Date().toISOString()
    });
    saveMemory();
}

// ============================================================
// УМНЫЕ ФАКТЫ (ПАМЯТЬ О ПОЛЬЗОВАТЕЛЕ)
// ============================================================

function loadFacts() {
    try {
        const saved = localStorage.getItem(FACTS_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Ошибка загрузки фактов:", error);
        return [];
    }
}

function saveFacts() {
    try {
        localStorage.setItem(FACTS_KEY, JSON.stringify(smartFacts));
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
    smartFacts = smartFacts.slice(-20); // Уменьшено для скорости
    saveFacts();
}

// ============================================================
// АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ВАЖНОЙ ИНФОРМАЦИИ
// ============================================================

function detectSmartFact(text) {
    if (!text) return;
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
// КОНТЕКСТ ДЛЯ AI (ТОЛЬКО ПОСЛЕДНИЕ 3 СООБЩЕНИЯ)
// ============================================================

function buildMemoryContext() {
    return memory
        .slice(-MAX_CONTEXT_MESSAGES)
        .map(item => ({
            role: item.role === "user" ? "user" : "assistant",
            content: item.text
        }));
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
// ПОКАЗАТЬ ВСЮ ПАМЯТЬ (КНОПКА "ПАМЯТЬ")
// ============================================================

function showFullMemory() {
    // Проверяем через глобальную функцию
    if (typeof window.showMemoryDialog === 'function') {
        window.showMemoryDialog();
        return;
    }
    
    // Если нет глобальной функции, показываем в диалоге
    let memoryText = "📝 ПАМЯТЬ JARVIS\n\n";
    memoryText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    
    // Факты
    if (smartFacts.length > 0) {
        memoryText += "📌 ВАЖНЫЕ ФАКТЫ:\n";
        smartFacts.forEach((fact, i) => {
            memoryText += `${i + 1}. ${fact}\n`;
        });
        memoryText += "\n";
    } else {
        memoryText += "📌 Важных фактов пока нет.\n\n";
    }
    
    // История диалога
    if (memory.length > 0) {
        memoryText += "💬 ИСТОРИЯ ДИАЛОГА:\n";
        const lastMessages = memory.slice(-20);
        lastMessages.forEach((msg) => {
            const role = msg.role === "user" ? "Вы" : "JARVIS";
            const text = msg.text.length > 100 ? msg.text.substring(0, 100) + "..." : msg.text;
            memoryText += `${role}: ${text}\n`;
        });
        memoryText += `\nВсего сообщений: ${memory.length}`;
    } else {
        memoryText += "💬 История диалога пуста.";
    }
    
    // Показываем в диалоге
    alert(memoryText);
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

    // ПОКАЗАТЬ ПАМЯТЬ (команда)
    if (/\b(что ты помнишь|что ты обо мне помнишь|покажи память|какую информацию ты помнишь|покажи мои данные)\b/.test(command)) {
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

    // ОЧИСТИТЬ ДИАЛОГ
    if ((/\b(очисти|удали|сотри)\b/.test(command) && /\b(историю|диалог|чат|сообщения)\b/.test(command)) ||
        /\b(новый диалог|начать заново|очистить чат)\b/.test(command)) {
        conversation.innerHTML = "";
        statusText.textContent = "Диалог очищен, сэр.";
        speak("Диалог очищен, сэр.");
        return true;
    }

    // ДАТА
    if (/\b(какая сегодня дата|какое сегодня число|сегодняшняя дата|число сегодня)\b/.test(command)) {
        const now = new Date();
        const date = now.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        const answer = "Сегодня " + date + ", сэр.";
        showJarvisMessage(original, answer);
        speak(answer);
        return true;
    }

    // ВРЕМЯ
    if (/\b(сколько времени|который час|текущее время|какое сейчас время|время сейчас)\b/.test(command)) {
        const now = new Date();
        const time = now.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
        const answer = "Сейчас " + time + ", сэр.";
        showJarvisMessage(original, answer);
        speak(answer);
        return true;
    }

    // ПОИСК
    const searchMatch = command.match(/^(?:джарвис\s+)?(?:найди|поищи|загугли|погугли)\s+(.+)$/i);
    if (searchMatch) {
        const query = searchMatch[1].trim();
        const answer = "Ищу информацию, сэр.";
        showJarvisMessage(original, answer);
        speak(answer);
        setTimeout(function() {
            window.location.href = "https://www.google.com/search?q=" + encodeURIComponent(query);
        }, 150);
        return true;
    }

    return false;
}

// ============================================================
// ЗАПРОС К JARVIS (МАКСИМАЛЬНО ОПТИМИЗИРОВАН)
// ============================================================

let requestInProgress = false;

async function askJarvis(text) {
    if (!text || !text.trim()) return;
    if (requestInProgress) {
        statusText.textContent = "Я ещё обрабатываю предыдущий запрос, сэр.";
        return;
    }

    // Сначала проверяем локальные команды (включая "запомни")
    if (handleCommand(text)) return;

    // Если это команда "запомни", обрабатываем отдельно
    const isRememberCommand = detectSmartFact(text);
    if (isRememberCommand) {
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
        // Формируем компактный запрос (только 3 последних сообщения)
        const context = memory.slice(-MAX_CONTEXT_MESSAGES);
        
        // Отправляем запрос
        const response = await fetch(JARVIS_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: cleanText,
                history: context, // Только 3 последних сообщения
                facts: smartFacts // Все факты
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

        // Очистка
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
// ЭКСПОРТ ДЛЯ ДРУГИХ ЧАСТЕЙ САЙТА
// ============================================================

window.JARVIS = {
    ask: askJarvis,
    speak: speak,
    clearMemory: clearJarvisMemory,
    getMemory: function() { return memory; },
    getFacts: function() { return smartFacts; },
    addFact: addSmartFact,
    showMemory: showFullMemory // Добавляем функцию показа памяти
};

// ============================================================
// ПЕРЕХВАТ КНОПКИ "ПАМЯТЬ"
// ============================================================

// Ищем кнопку памяти на сайте
document.addEventListener('DOMContentLoaded', function() {
    // Ищем кнопку с текстом "Память"
    const buttons = document.querySelectorAll('button, a, .button, .btn, [role="button"]');
    buttons.forEach(btn => {
        if (btn.textContent && btn.textContent.trim() === 'Память') {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                showFullMemory();
            });
            console.log('✅ Кнопка "Память" найдена и привязана');
        }
    });
    
    // Если кнопка не найдена, добавляем обработчик на все клики
    if (!document.querySelector('button, a, .button, .btn, [role="button"]')) {
        document.addEventListener('click', function(e) {
            const target = e.target.closest('button, a, .button, .btn, [role="button"]');
            if (target && target.textContent && target.textContent.trim() === 'Память') {
                e.preventDefault();
                showFullMemory();
            }
        });
    }
});

// ============================================================
// ГОТОВО
// ============================================================

console.log("✅ JARVIS: система памяти загружена.");
console.log(`📝 Сообщений в памяти: ${memory.length}`);
console.log(`📌 Сохранённых фактов: ${smartFacts.length}`);
console.log("💡 Для просмотра памяти нажмите кнопку 'Память' или скажите 'что ты помнишь'");
