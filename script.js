const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

// ============================================================
// CLOUDFLARE WORKER
// ============================================================

const JARVIS_API =
    "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// SPEECH RECOGNITION
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let requestInProgress = false;

// ============================================================
// ПАМЯТЬ
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";

let memory = loadMemory();

function loadMemory() {
    try {
        const saved = localStorage.getItem(MEMORY_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
        console.error("Ошибка загрузки памяти:", error);
        return [];
    }
}

function saveMemory() {
    try {

        // Храним последние 40 сообщений
        memory = memory.slice(-40);

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(memory)
        );

    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

function addToMemory(role, text) {

    if (!text) {
        return;
    }

    memory.push({
        role: role,
        text: text,
        time: new Date().toISOString()
    });

    saveMemory();
}

// ============================================================
// ОЧИСТКА ПАМЯТИ
// ============================================================

function clearJarvisMemory() {

    memory = [];

    localStorage.removeItem(MEMORY_KEY);

    statusText.textContent =
        "Память очищена, сэр.";

    showJarvisMessage(
        "",
        "Память очищена, сэр."
    );

    speak(
        "Память очищена, сэр."
    );
}

// ============================================================
// ГОЛОС JARVIS
// ============================================================

function speak(text) {

    if (!text) {
        return;
    }

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
        utterance.rate = 0.85;
        utterance.pitch = 0.8;
        utterance.volume = 1;

        utterance.onstart = function () {

            statusText.textContent =
                "Говорю, сэр...";
        };

        utterance.onend = function () {

            statusText.textContent =
                "Готов к дальнейшим указаниям, сэр.";
        };

        utterance.onerror = function (event) {

            console.error(
                "Ошибка синтеза речи:",
                event
            );
        };

        window.speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.error(
            "Ошибка запуска речи:",
            error
        );
    }
}

// ============================================================
// ПОКАЗ СООБЩЕНИЯ
// ============================================================

function showJarvisMessage(userText, answer) {

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
// КОМАНДЫ
// ============================================================

function handleCommand(text) {

    const original = text.trim();

    const command = original
        .toLowerCase()
        .replace(/[!?.,]/g, "")
        .trim();

    // ========================================================
    // СТОП
    // ========================================================

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

    // ========================================================
    // ОЧИСТИТЬ ПАМЯТЬ
    // ========================================================

    if (
        /\b(очисти память|очистить память|удали память|сотри память)\b/
            .test(command)
    ) {

        clearJarvisMemory();

        return true;
    }

    // ========================================================
    // ОЧИСТИТЬ ДИАЛОГ
    // ========================================================

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

    // ========================================================
    // ОБНОВИТЬ СТРАНИЦУ
    // ========================================================

    if (
        /\b(обнови|перезагрузи|обновить|перезагрузить)\b/
            .test(command) &&
        /\b(страницу|сайт|страница)\b/
            .test(command)
    ) {

        statusText.textContent =
            "Обновляю систему, сэр...";

        setTimeout(function () {
            location.reload();
        }, 100);

        return true;
    }

    // ========================================================
    // НАЗАД
    // ========================================================

    if (
        /\b(назад|вернись назад|предыдущая страница)\b/
            .test(command)
    ) {

        statusText.textContent =
            "Возвращаюсь назад, сэр.";

        setTimeout(function () {
            history.back();
        }, 100);

        return true;
    }

    // ========================================================
    // ДАТА
    // ========================================================

    if (
        /\b(какая сегодня дата|какое сегодня число|сегодняшняя дата|число сегодня)\b/
            .test(command)
    ) {

        const now = new Date();

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
            "Сегодня " + date + ", сэр.";

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        return true;
    }

    // ========================================================
    // ВРЕМЯ
    // ========================================================

    if (
        /\b(сколько времени|который час|текущее время|какое сейчас время|время сейчас)\b/
            .test(command)
    ) {

        const now = new Date();

        const time =
            now.toLocaleTimeString(
                "ru-RU",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        const answer =
            "Сейчас " + time + ", сэр.";

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        return true;
    }

    // ========================================================
    // ПРИЛОЖЕНИЯ
    // ========================================================

    const apps = [

        {
            pattern: /\b(youtube|ютуб|ютаб)\b/i,
            url: "youtube://",
            fallback: "https://www.youtube.com/",
            name: "YouTube"
        },

        {
            pattern: /\b(telegram|телеграм)\b/i,
            url: "tg://",
            fallback: "https://web.telegram.org/",
            name: "Telegram"
        },

        {
            pattern: /\b(tiktok|тик ток|тикток)\b/i,
            url: "tiktok://",
            fallback: "https://www.tiktok.com/",
            name: "TikTok"
        },

        {
            pattern: /\b(whatsapp|ватсап|вацап|вотсап)\b/i,
            url: "whatsapp://",
            fallback: "https://web.whatsapp.com/",
            name: "WhatsApp"
        },

        {
            pattern: /\b(instagram|инстаграм)\b/i,
            url: "instagram://",
            fallback: "https://www.instagram.com/",
            name: "Instagram"
        },

        {
            pattern: /\b(wildberries|вайблдберриз|вайблдберис|вайлдберриз|валберис)\b/i,
            url: "wb://",
            fallback: "https://www.wildberries.ru/",
            name: "Wildberries"
        },

        {
            pattern: /\b(ozon|озон)\b/i,
            url: "ozon://",
            fallback: "https://www.ozon.ru/",
            name: "Ozon"
        },

        {
            pattern: /\b(twitch|твич)\b/i,
            url: "twitch://",
            fallback: "https://www.twitch.tv/",
            name: "Twitch"
        },

        {
            pattern: /\b(bloc blast|block blast|блок бласт)\b/i,
            url: "blocblast://",
            fallback: null,
            name: "Bloc Blast"
        }

    ];

    const wantsOpen =
        /\b(открой|открыть|запусти|запустить|открывай|зайди|перейди|перейти)\b/
            .test(command);

    if (wantsOpen) {

        const app =
            apps.find(function (item) {
                return item.pattern.test(command);
            });

        if (app) {

            statusText.textContent =
                "Открываю " +
                app.name +
                ", сэр...";

            let leftPage = false;

            function detectAppOpen() {
                if (document.hidden) {
                    leftPage = true;
                }
            }

            document.addEventListener(
                "visibilitychange",
                detectAppOpen
            );

            try {

                window.location.href =
                    app.url;

            } catch (error) {

                console.error(
                    "Ошибка запуска приложения:",
                    error
                );
            }

            setTimeout(function () {

                document.removeEventListener(
                    "visibilitychange",
                    detectAppOpen
                );

                /*
                 * Если приложение не открылось,
                 * открываем веб-версию.
                 */

                if (!leftPage && app.fallback) {

                    window.location.href =
                        app.fallback;
                }

            }, 1500);

            return true;
        }
    }

    // ========================================================
    // ПОИСК
    // ========================================================

    const searchMatch =
        command.match(
            /^(?:джарвис\s+)?(?:найди|поищи|загугли|погугли|поиск|найди в интернете|поищи в интернете)\s+(.+)$/i
        );

    if (searchMatch) {

        const query =
            searchMatch[1].trim();

        if (query) {

            const answer =
                "Ищу информацию, сэр.";

            showJarvisMessage(
                original,
                answer
            );

            speak(answer);

            setTimeout(function () {

                const url =
                    "https://www.google.com/search?q=" +
                    encodeURIComponent(query);

                window.location.href =
                    url;

            }, 150);

            return true;
        }
    }

    // ========================================================
    // КАЛЬКУЛЯТОР
    // ========================================================

    const calculationMatch =
        command.match(
            /(?:посчитай|вычисли|сколько будет|рассчитай)\s+(.+)$/i
        );

    if (calculationMatch) {

        const expression =
            calculationMatch[1]
                .replace(/умножить на/g, "*")
                .replace(/умножить/g, "*")
                .replace(/помножить на/g, "*")
                .replace(/разделить на/g, "/")
                .replace(/разделить/g, "/")
                .replace(/плюс/g, "+")
                .replace(/минус/g, "-")
                .replace(/в степени/g, "**")
                .replace(/,/g, ".")
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/[^0-9+\-*/().%\s]/g, "")
                .trim();

        if (
            expression &&
            /^[0-9+\-*/().%\s]+$/.test(expression)
        ) {

            try {

                const result =
                    Function(
                        '"use strict"; return (' +
                        expression +
                        ')'
                    )();

                if (Number.isFinite(result)) {

                    const answer =
                        result + ", сэр.";

                    showJarvisMessage(
                        original,
                        answer
                    );

                    speak(answer);

                    return true;
                }

            } catch (error) {

                console.error(
                    "Ошибка расчёта:",
                    error
                );
            }
        }
    }

    return false;
}

// ============================================================
// ЗАПРОС К JARVIS
// ============================================================

async function askJarvis(text) {
  if (!text) return;
  
  if (requestInProgress) {
    statusText.textContent = "Я ещё обрабатываю запрос, сэр.";
    return;
  }

  // Сначала локальные команды
  if (handleCommand(text)) return;

  requestInProgress = true;
  addToMemory("user", text);
  statusText.textContent = "Думаю, сэр...";

  try {
    const response = await fetch(JARVIS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Ошибка сервера");
    }

    if (!data.answer) {
      throw new Error(data.error || "Нет ответа от AI");
    }

    const answer = data.answer.trim();
    addToMemory("jarvis", answer);
    showJarvisMessage(text, answer);
    statusText.textContent = "Готов, сэр.";
    speak(answer);

  } catch (error) {
    console.error("JARVIS error:", error);
    
    let errorMessage = "Ошибка связи с сервером, сэр.";
    if (error.message.includes("ключ")) {
      errorMessage = "Проблема с API-ключами, сэр.";
    } else if (error.message.includes("AI-сервисы")) {
      errorMessage = "AI-сервисы временно недоступны, сэр.";
    }
    
    conversation.innerHTML += `
      <div class="jarvis-message">
        <strong>JARVIS:</strong>
        ${errorMessage}
        <br>
        <small style="color:#888; font-size:12px;">${escapeHTML(error.message)}</small>
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

function handleMicClick() {

    if (isListening) {
        return;
    }

    if (requestInProgress) {

        statusText.textContent =
            "Я ещё обрабатываю предыдущий запрос, сэр.";

        return;
    }

    if (!SpeechRecognition) {

        statusText.textContent =
            "Распознавание речи не поддерживается этим браузером.";

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
        "Распознавание речи не поддерживается этим браузером.";

    micButton.disabled = true;

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

    micButton.addEventListener(
        "click",
        handleMicClick
    );

    recognition.onstart =
        function () {

            isListening = true;

            micButton.classList.add(
                "listening"
            );

            statusText.textContent =
                "Слушаю вас, сэр...";
        };

    recognition.onresult =
        async function (event) {

            const text =
                event.results[0][0]
                    .transcript
                    .trim();

            console.log(
                "Распознано:",
                text
            );

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

            statusText.textContent =
                "Обрабатываю запрос, сэр...";

            await askJarvis(text);
        };

    recognition.onerror =
        function (event) {

            console.error(
                "Ошибка распознавания:",
                event.error
            );

            isListening = false;

            micButton.classList.remove(
                "listening"
            );

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

            } else if (
                event.error ===
                "network"
            ) {

                statusText.textContent =
                    "Ошибка соединения с распознаванием речи.";

            } else {

                statusText.textContent =
                    "Не удалось распознать речь.";
            }
        };

    recognition.onend =
        function () {

            isListening = false;

            micButton.classList.remove(
                "listening"
            );
        };
}

// ============================================================
// ЗАЩИТА HTML
// ============================================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}

// ============================================================
// AUDIO UNLOCK
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
// ПАМЯТЬ JARVIS — ОКНО УПРАВЛЕНИЯ
// ============================================================

const memoryButton =
    document.getElementById("memoryButton");

const memoryModal =
    document.getElementById("memoryModal");

const closeMemory =
    document.getElementById("closeMemory");

const refreshMemory =
    document.getElementById("refreshMemory");

const clearMemory =
    document.getElementById("clearMemory");

const memoryContent =
    document.getElementById("memoryContent");


// ============================================================
// ОТКРЫТЬ ПАМЯТЬ
// ============================================================

function openMemory() {

    if (!memoryModal) {
        console.error(
            "JARVIS: элемент memoryModal не найден"
        );
        return;
    }

    updateMemoryWindow();

    memoryModal.classList.add("active");

    memoryModal.setAttribute(
        "aria-hidden",
        "false"
    );
}


// ============================================================
// ЗАКРЫТЬ ПАМЯТЬ
// ============================================================

function closeMemoryWindow() {

    if (!memoryModal) {
        return;
    }

    memoryModal.classList.remove("active");

    memoryModal.setAttribute(
        "aria-hidden",
        "true"
    );
}


// ============================================================
// ОБНОВИТЬ ОКНО ПАМЯТИ
// ============================================================

function updateMemoryWindow() {

    if (!memoryContent) {
        console.error(
            "JARVIS: элемент memoryContent не найден"
        );
        return;
    }

    if (!memory || memory.length === 0) {

        memoryContent.innerHTML = `

            <div class="memory-empty">

                🧠

                <br><br>

                JARVIS пока ничего не сохранил
                в локальной памяти.

            </div>

        `;

        return;
    }


    memoryContent.innerHTML =
        memory
            .map(function (item) {

                const role =
                    item.role === "user"
                        ? "Вы"
                        : "JARVIS";

                const icon =
                    item.role === "user"
                        ? "👤"
                        : "🤖";

                return `

                    <div class="memory-item">

                        <div class="memory-item-title">

                            ${icon}

                            ${role}

                        </div>

                        <div class="memory-item-text">

                            ${escapeHTML(
                                item.text
                            )}

                        </div>

                    </div>

                `;

            })
            .join("");
}


// ============================================================
// КНОПКА «ПАМЯТЬ»
// ============================================================

if (memoryButton) {

    memoryButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            openMemory();

        }
    );

} else {

    console.error(
        "JARVIS: кнопка memoryButton не найдена"
    );
}


// ============================================================
// КНОПКА «ЗАКРЫТЬ»
// ============================================================

if (closeMemory) {

    closeMemory.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            closeMemoryWindow();

        }
    );
}


// ============================================================
// КНОПКА «ОБНОВИТЬ»
// ============================================================

if (refreshMemory) {

    refreshMemory.addEventListener(
        "click",
        function () {

            memory =
                loadMemory();

            updateMemoryWindow();

        }
    );
}


// ============================================================
// КНОПКА «ОЧИСТИТЬ ПАМЯТЬ»
// ============================================================

if (clearMemory) {

    clearMemory.addEventListener(
        "click",
        function () {

            const confirmed =
                confirm(
                    "Сэр, вы действительно хотите полностью очистить память JARVIS?"
                );

            if (!confirmed) {
                return;
            }

            memory = [];

            localStorage.removeItem(
                MEMORY_KEY
            );

            updateMemoryWindow();

            statusText.textContent =
                "Память очищена, сэр.";

            speak(
                "Память очищена, сэр."
            );

        }
    );
}


// ============================================================
// ЗАКРЫТИЕ ПРИ НАЖАТИИ НА ФОН
// ============================================================

if (memoryModal) {

    memoryModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === memoryModal
            ) {

                closeMemoryWindow();

            }

        }
    );
}


// ============================================================
// ESC — ЗАКРЫТЬ ПАМЯТЬ
// ============================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            memoryModal &&
            memoryModal.classList.contains("active")
        ) {

            closeMemoryWindow();

        }

    }
);


// ============================================================
// ОБНОВЛЯЕМ ПАМЯТЬ ПРИ ЗАПУСКЕ
// ============================================================

updateMemoryWindow();
