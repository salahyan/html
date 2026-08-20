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
// НАСТРОЙКИ ПАМЯТИ
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";
const FACTS_KEY = "jarvis_smart_facts";

const MAX_MESSAGES = 40;
const MAX_CONTEXT_MESSAGES = 12;

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

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(memory)
        );

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
// УМНЫЕ ФАКТЫ
// ============================================================

function loadFacts() {

    try {

        const saved =
            localStorage.getItem(Facts_KEY_SAFE());

        if (!saved) return [];

        const parsed =
            JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Ошибка загрузки фактов:",
            error
        );

        return [];
    }
}

function Facts_KEY_SAFE() {
    return FACTS_KEY;
}

function saveFacts() {

    try {

        localStorage.setItem(
            FACTS_KEY,
            JSON.stringify(smartFacts)
        );

    } catch (error) {

        console.error(
            "Ошибка сохранения фактов:",
            error
        );
    }
}

// ============================================================
// ДОБАВЛЕНИЕ ВАЖНОГО ФАКТА
// ============================================================

function addSmartFact(text) {

    if (!text || !text.trim()) {
        return;
    }

    const fact = text.trim();

    const exists =
        smartFacts.some(
            item =>
                item.toLowerCase() ===
                fact.toLowerCase()
        );

    if (exists) return;

    smartFacts.push(fact);

    // Не даём памяти разрастаться бесконечно
    smartFacts = smartFacts.slice(-50);

    saveFacts();
}

// ============================================================
// АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ВАЖНОЙ ИНФОРМАЦИИ
// ============================================================

function detectSmartFact(text) {

    if (!text) return;

    const value = text.trim();

    // "Запомни..."
    const rememberMatch =
        value.match(
            /^(?:джарвис\s+)?(?:запомни|запиши|сохрани)\s+(.+)$/i
        );

    if (rememberMatch) {

        addSmartFact(
            rememberMatch[1].trim()
        );

        return;
    }

    // Имя пользователя
    const nameMatch =
        value.match(
            /(?:меня зовут|моё имя|мое имя)\s+([А-Яа-яЁёA-Za-z-]+)/i
        );

    if (nameMatch) {

        addSmartFact(
            "Имя пользователя: " +
            nameMatch[1]
        );

        return;
    }

    // Предпочтения
    const preferenceMatch =
        value.match(
            /(?:я люблю|мне нравится|я предпочитаю|мне нравится больше)\s+(.+)/i
        );

    if (preferenceMatch) {

        addSmartFact(
            "Предпочтение пользователя: " +
            preferenceMatch[1].trim()
        );

        return;
    }
}

// ============================================================
// КОНТЕКСТ ДЛЯ GEMINI
// ============================================================

function buildMemoryContext() {

    const recent =
        memory
            .slice(-MAX_CONTEXT_MESSAGES)
            .map(item => ({
                role:
                    item.role === "user"
                        ? "user"
                        : "model",

                parts: [
                    {
                        text: item.text
                    }
                ]
            }));

    return recent;
}

// ============================================================
// ОЧИСТКА ПАМЯТИ
// ============================================================

function clearJarvisMemory() {

    memory = [];
    smartFacts = [];

    localStorage.removeItem(
        MEMORY_KEY
    );

    localStorage.removeItem(
        FACTS_KEY
    );

    statusText.textContent =
        "Память полностью очищена, сэр.";

    showJarvisMessage(
        "",
        "Память полностью очищена, сэр."
    );

    speak(
        "Память полностью очищена, сэр."
    );
}

// ============================================================
// ГОЛОС
// ============================================================

function speak(text) {

    if (!text) return;

    if (!("speechSynthesis" in window)) {

        statusText.textContent =
            "Синтез речи не поддерживается, сэр.";

        return;
    }

    try {

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(text);

        utterance.lang = "ru-RU";
        utterance.rate = 0.88;
        utterance.pitch = 0.82;
        utterance.volume = 1;

        utterance.onstart = function () {

            statusText.textContent =
                "Говорю, сэр...";
        };

        utterance.onend = function () {

            statusText.textContent =
                "Готов, сэр.";
        };

        utterance.onerror = function (event) {

            console.error(
                "Ошибка синтеза речи:",
                event
            );

            statusText.textContent =
                "Ошибка речи, сэр.";
        };

        window.speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.error(
            "Ошибка speak():",
            error
        );
    }
}

// ============================================================
// ОТОБРАЖЕНИЕ
// ============================================================

function showJarvisMessage(
    userText,
    answer
) {

    let userHTML = "";

    if (userText) {

        userHTML = `
            <div class="user-message">
                <strong>Вы:</strong>
                ${escapeHTML(userText)}
            </div>
        `;
    }

    conversation.innerHTML = `
        ${userHTML}

        <div class="jarvis-message">
            <strong>JARVIS:</strong>
            ${escapeHTML(answer)}
        </div>
    `;
}

// ============================================================
// ЛОКАЛЬНЫЕ КОМАНДЫ
// ============================================================

function handleCommand(text) {

    const original =
        text.trim();

    const command =
        original
            .toLowerCase()
            .replace(/[!?.,]/g, "")
            .trim();

    // --------------------------------------------------------
    // СТОП
    // --------------------------------------------------------

    if (
        /\b(стоп|остановись|замолчи|хватит|прекрати говорить|останови речь)\b/
            .test(command)
    ) {

        window.speechSynthesis.cancel();

        statusText.textContent =
            "Речь остановлена, сэр.";

        showJarvisMessage(
            original,
            "Разумеется, сэр."
        );

        return true;
    }

    // --------------------------------------------------------
    // ОЧИСТИТЬ ПАМЯТЬ
    // --------------------------------------------------------

    if (
        /\b(очисти память|очистить память|удали память|сотри память)\b/
            .test(command)
    ) {

        clearJarvisMemory();

        return true;
    }

    // --------------------------------------------------------
    // ПОКАЗАТЬ ПАМЯТЬ
    // --------------------------------------------------------

    if (
        /\b(что ты помнишь|что ты обо мне помнишь|покажи память|какую информацию ты помнишь)\b/
            .test(command)
    ) {

        let answer;

        if (
            smartFacts.length === 0 &&
            memory.length === 0
        ) {

            answer =
                "Пока в моей памяти нет сохранённой информации, сэр.";

        } else {

            const facts =
                smartFacts.length
                    ? smartFacts.join(". ")
                    : "Важных фактов пока нет.";

            answer =
                "Вот что я помню, сэр. " +
                facts;
        }

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        return true;
    }

    // --------------------------------------------------------
    // ОЧИСТИТЬ ДИАЛОГ
    // --------------------------------------------------------

    if (
        (
            /\b(очисти|удали|сотри)\b/.test(command) &&
            /\b(историю|диалог|чат|сообщения)\b/.test(command)
        ) ||
        /\b(новый диалог|начать заново|очистить чат)\b/
            .test(command)
    ) {

        conversation.innerHTML = "";

        statusText.textContent =
            "Диалог очищен, сэр.";

        speak(
            "Диалог очищен, сэр."
        );

        return true;
    }

    // --------------------------------------------------------
    // ДАТА
    // --------------------------------------------------------

    if (
        /\b(какая сегодня дата|какое сегодня число|сегодняшняя дата|число сегодня)\b/
            .test(command)
    ) {

        const now =
            new Date();

        const date =
            now.toLocaleDateString(
                "ru-RU",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

        const answer =
            "Сегодня " +
            date +
            ", сэр.";

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        return true;
    }

    // --------------------------------------------------------
    // ВРЕМЯ
    // --------------------------------------------------------

    if (
        /\b(сколько времени|который час|текущее время|какое сейчас время|время сейчас)\b/
            .test(command)
    ) {

        const now =
            new Date();

        const time =
            now.toLocaleTimeString(
                "ru-RU",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        const answer =
            "Сейчас " +
            time +
            ", сэр.";

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        return true;
    }

    // --------------------------------------------------------
    // ПОИСК
    // --------------------------------------------------------

    const searchMatch =
        command.match(
            /^(?:джарвис\s+)?(?:найди|поищи|загугли|погугли)\s+(.+)$/i
        );

    if (searchMatch) {

        const query =
            searchMatch[1].trim();

        const answer =
            "Ищу информацию, сэр.";

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        setTimeout(
            function () {

                window.location.href =
                    "https://www.google.com/search?q=" +
                    encodeURIComponent(query);

            },
            150
        );

        return true;
    }

    return false;
}

// ============================================================
// ЗАПРОС К JARVIS
// ============================================================

let requestInProgress = false;

async function askJarvis(text) {

    if (!text || !text.trim()) {
        return;
    }

    if (requestInProgress) {

        statusText.textContent =
            "Я ещё обрабатываю предыдущий запрос, сэр.";

        return;
    }

    // Локальные команды
    if (handleCommand(text)) {
        return;
    }

    requestInProgress = true;

    const cleanText =
        text.trim();

    // Сохраняем сообщение
    addToMemory(
        "user",
        cleanText
    );

    // Ищем важную информацию
    detectSmartFact(
        cleanText
    );

    statusText.textContent =
        "Обрабатываю запрос, сэр...";

    try {

        // Передаём память Worker
        const response =
            await fetch(
                JARVIS_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        text: cleanText,

                        memory:
                            memory
                                .slice(
                                    -MAX_CONTEXT_MESSAGES
                                ),

                        facts:
                            smartFacts
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Ошибка сервера"
            );
        }

        if (!data.answer) {

            throw new Error(
                "AI не вернул ответ"
            );
        }

        let answer =
            String(data.answer)
                .trim();

        // ----------------------------------------------------
        // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА ОТ THINK
        // ----------------------------------------------------

        answer =
            answer
                .replace(
                    /<think>[\s\S]*?<\/think>/gi,
                    ""
                )
                .replace(
                    /<analysis>[\s\S]*?<\/analysis>/gi,
                    ""
                )
                .trim();

        if (!answer) {

            throw new Error(
                "После очистки AI не вернул текст"
            );
        }

        // Сохраняем ответ
        addToMemory(
            "assistant",
            answer
        );

        // Показываем
        showJarvisMessage(
            cleanText,
            answer
        );

        statusText.textContent =
            "Готов, сэр.";

        // Говорим
        speak(answer);

    } catch (error) {

        console.error(
            "JARVIS error:",
            error
        );

        const errorMessage =
            "Ошибка связи с сервером, сэр.";

        conversation.innerHTML += `
            <div class="jarvis-message">
                <strong>JARVIS:</strong>
                ${errorMessage}
                <br>
                <small style="color:#888;font-size:12px;">
                    ${escapeHTML(error.message)}
                </small>
            </div>
        `;

        statusText.textContent =
            "Ошибка, сэр.";

    } finally {

        requestInProgress =
            false;
    }
}

// ============================================================
// МИКРОФОН
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

function handleMicClick() {

    if (isListening) {
        return;
    }

    if (requestInProgress) {

        statusText.textContent =
            "Я ещё обрабатываю запрос, сэр.";

        return;
    }

    if (!SpeechRecognition) {

        statusText.textContent =
            "Распознавание речи не поддерживается.";

        return;
    }

    try {

        window.speechSynthesis.cancel();

        recognition.start();

    } catch (error) {

        console.error(
            "Ошибка запуска микрофона:",
            error
        );
    }
}

// ============================================================
// SPEECH RECOGNITION
// ============================================================

if (!SpeechRecognition) {

    statusText.textContent =
        "Распознавание речи не поддерживается.";

    if (micButton) {
        micButton.disabled = true;
    }

} else {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "ru-RU";

    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.maxAlternatives =
        1;

    if (micButton) {

        micButton.addEventListener(
            "click",
            handleMicClick
        );
    }

    recognition.onstart =
        function () {

            isListening = true;

            if (micButton) {

                micButton.classList.add(
                    "listening"
                );
            }

            statusText.textContent =
                "Слушаю вас, сэр...";
        };

    recognition.onresult =
        async function (event) {

            const text =
                event.results[0][0]
                    .transcript
                    .trim();

            if (!text) {

                statusText.textContent =
                    "Я не расслышал вас, сэр.";

                return;
            }

            conversation.innerHTML = `
                <div class="user-message">
                    <strong>Вы:</strong>
                    ${escapeHTML(text)}
                </div>

                <div class="jarvis-message">
                    <strong>JARVIS:</strong>
                    Обрабатываю запрос, сэр...
                </div>
            `;

            await askJarvis(text);
        };

    recognition.onerror =
        function (event) {

            console.error(
                "Speech error:",
                event.error
            );

            isListening = false;

            if (micButton) {

                micButton.classList.remove(
                    "listening"
                );
            }

            if (
                event.error ===
                "not-allowed"
            ) {

                statusText.textContent =
                    "Разрешите доступ к микрофону, сэр.";

            } else if (
                event.error ===
                "no-speech"
            ) {

                statusText.textContent =
                    "Я не услышал вас, сэр.";

            } else {

                statusText.textContent =
                    "Не удалось распознать речь.";
            }
        };

    recognition.onend =
        function () {

            isListening = false;

            if (micButton) {

                micButton.classList.remove(
                    "listening"
                );
            }
        };
}

// ============================================================
// ЗАЩИТА HTML
// ============================================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}

// ============================================================
// AUDIO UNLOCK ДЛЯ IPHONE
// ============================================================

function unlockAudio() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    try {

        window.speechSynthesis.cancel();

        const audio =
            new SpeechSynthesisUtterance("");

        audio.lang =
            "ru-RU";

        audio.volume =
            0;

        window.speechSynthesis.speak(
            audio
        );

    } catch (error) {

        console.log(
            "Audio unlock:",
            error
        );
    }
}

// ============================================================
// ПЕРВОЕ КАСАНИЕ
// ============================================================

document.addEventListener(
    "touchstart",
    function firstTouch() {

        unlockAudio();

        document.removeEventListener(
            "touchstart",
            firstTouch
        );

    },
    {
        passive: true
    }
);

// ============================================================
// ПЕРВЫЙ КЛИК
// ============================================================

document.addEventListener(
    "click",
    function firstClick() {

        unlockAudio();

        document.removeEventListener(
            "click",
            firstClick
        );

    },
    {
        passive: true
    }
);

// ============================================================
// ЭКСПОРТ ДЛЯ ДРУГИХ ЧАСТЕЙ САЙТА
// ============================================================

window.JARVIS = {

    ask: askJarvis,

    speak: speak,

    clearMemory:
        clearJarvisMemory,

    getMemory:
        function () {
            return memory;
        },

    getFacts:
        function () {
            return smartFacts;
        },

    addFact:
        addSmartFact
};

// ============================================================
// ГОТОВО
// ============================================================

console.log(
    "JARVIS: система памяти загружена."
);

console.log(
    "JARVIS: сообщений в памяти:",
    memory.length
);

console.log(
    "JARVIS: сохранённых фактов:",
    smartFacts.length
);
