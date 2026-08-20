// ============================================================
// JARVIS — SCRIPT.JS
// ============================================================

const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

const JARVIS_API =
    "https://jarvis.salahyansergei2006.workers.dev/";

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let recognition = null;

let isListening = false;

let requestInProgress = false;

let speechQueue = [];

let isSpeaking = false;

let speechUnlocked = false;


// ============================================================
// ПАМЯТЬ
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";

let memory = loadMemory();

function loadMemory() {

    try {

        const saved =
            localStorage.getItem(MEMORY_KEY);

        if (!saved) {
            return [];
        }

        const parsed =
            JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Ошибка памяти:",
            error
        );

        return [];
    }
}


function saveMemory() {

    try {

        memory =
            memory.slice(-40);

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(memory)
        );

    } catch (error) {

        console.error(
            "Ошибка сохранения памяти:",
            error
        );
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

    localStorage.removeItem(
        MEMORY_KEY
    );

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
// РАЗБИВАЕМ ТЕКСТ НА ФРАЗЫ
// ============================================================

function splitTextForSpeech(text) {

    if (!text) {
        return [];
    }

    // Убираем лишние пробелы
    text = text
        .replace(/\s+/g, " ")
        .trim();

    // Разбиваем по окончанию предложений.
    // Также учитываем ; и :
    const parts =
        text.match(
            /[^.!?;:]+[.!?;:]*(?:\s+|$)/g
        );

    if (!parts) {
        return [text];
    }

    const result = [];

    let buffer = "";

    for (const part of parts) {

        buffer += part.trim();

        // Если фраза достаточно большая —
        // отправляем её в отдельное озвучивание.
        if (
            buffer.length >= 80 ||
            /[.!?]$/.test(buffer)
        ) {

            result.push(
                buffer.trim()
            );

            buffer = "";
        }
    }

    if (buffer.trim()) {

        result.push(
            buffer.trim()
        );
    }

    return result.filter(Boolean);
}


// ============================================================
// ГОЛОС JARVIS
// ============================================================

function speak(text) {

    if (!text) {
        return;
    }

    if (!("speechSynthesis" in window)) {

        console.error(
            "SpeechSynthesis не поддерживается"
        );

        statusText.textContent =
            "Синтез речи не поддерживается, сэр.";

        return;
    }

    console.log(
        "JARVIS озвучивает:",
        text
    );

    // Добавляем фразы в очередь
    const parts =
        splitTextForSpeech(text);

    if (!parts.length) {
        return;
    }

    speechQueue.push(...parts);

    processSpeechQueue();
}


// ============================================================
// ОБРАБОТКА ОЧЕРЕДИ ГОЛОСА
// ============================================================

function processSpeechQueue() {

    if (isSpeaking) {
        return;
    }

    if (
        !speechQueue.length
    ) {

        statusText.textContent =
            "Готов, сэр.";

        return;
    }

    if (!speechUnlocked) {

        console.log(
            "Ожидаю разрешение на речь"
        );

        return;
    }

    const text =
        speechQueue.shift();

    if (!text) {

        processSpeechQueue();

        return;
    }

    isSpeaking = true;

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );

    utterance.lang =
        "ru-RU";

    // Немного быстрее старой версии
    utterance.rate =
        0.9;

    utterance.pitch =
        0.8;

    utterance.volume =
        1;


    utterance.onstart =
        function () {

            console.log(
                "JARVIS начал говорить:",
                text
            );

            statusText.textContent =
                "Говорю, сэр...";
        };


    utterance.onend =
        function () {

            console.log(
                "JARVIS закончил фразу"
            );

            isSpeaking = false;

            // Следующая фраза сразу
            processSpeechQueue();
        };


    utterance.onerror =
        function (event) {

            console.error(
                "Ошибка речи:",
                event
            );

            isSpeaking = false;

            // Не застреваем в очереди
            processSpeechQueue();
        };


    try {

        window.speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.error(
            "Ошибка speechSynthesis:",
            error
        );

        isSpeaking = false;

        processSpeechQueue();
    }
}


// ============================================================
// ПОЛНОСТЬЮ ОСТАНОВИТЬ РЕЧЬ
// ============================================================

function stopSpeaking() {

    speechQueue = [];

    isSpeaking = false;

    try {

        window.speechSynthesis.cancel();

    } catch (error) {

        console.error(
            "Ошибка остановки речи:",
            error
        );
    }
}


// ============================================================
// ПОКАЗ СООБЩЕНИЯ
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
// КОМАНДЫ
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

        stopSpeaking();

        statusText.textContent =
            "Речь остановлена, сэр.";

        showJarvisMessage(
            original,
            "Разумеется, сэр."
        );

        return true;
    }


    // --------------------------------------------------------
    // ОЧИСТКА ПАМЯТИ
    // --------------------------------------------------------

    if (
        /\b(очисти память|очистить память|удали память|сотри память)\b/
            .test(command)
    ) {

        clearJarvisMemory();

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
    // ОЧИСТИТЬ ДИАЛОГ
    // --------------------------------------------------------

    if (
        (
            /\b(очисти|удали|сотри)\b/
                .test(command)
            &&
            /\b(историю|диалог|чат|сообщения)\b/
                .test(command)
        )
        ||
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
    // ОБНОВЛЕНИЕ
    // --------------------------------------------------------

    if (
        /\b(обнови|перезагрузи|обновить|перезагрузить)\b/
            .test(command)
        &&
        /\b(страницу|сайт|страница)\b/
            .test(command)
    ) {

        statusText.textContent =
            "Обновляю систему, сэр...";

        setTimeout(
            function () {
                location.reload();
            },
            100
        );

        return true;
    }


    // --------------------------------------------------------
    // НАЗАД
    // --------------------------------------------------------

    if (
        /\b(назад|вернись назад|предыдущая страница)\b/
            .test(command)
    ) {

        statusText.textContent =
            "Возвращаюсь назад, сэр.";

        setTimeout(
            function () {
                history.back();
            },
            100
        );

        return true;
    }


    // --------------------------------------------------------
    // ПОИСК GOOGLE
    // --------------------------------------------------------

    const searchMatch =
        command.match(
            /^(?:джарвис\s+)?(?:найди|поищи|загугли|погугли|поиск)\s+(.+)$/i
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
    }


    return false;
}


// ============================================================
// ЗАПРОС К JARVIS
// ============================================================

async function askJarvis(text) {

    if (!text) {
        return;
    }


    if (requestInProgress) {

        statusText.textContent =
            "Я ещё обрабатываю запрос, сэр.";

        return;
    }


    // Сначала локальные команды
    if (
        handleCommand(text)
    ) {

        return;
    }


    requestInProgress =
        true;

    addToMemory(
        "user",
        text
    );

    statusText.textContent =
        "Думаю, сэр...";


    try {

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
                        text: text
                    })
                }
            );


        const data =
            await response.json();


        console.log(
            "JARVIS API:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.details ||
                data.error ||
                "Ошибка сервера"
            );
        }


        if (!data.answer) {

            throw new Error(
                "Нет ответа от AI"
            );
        }


        const answer =
            data.answer
                .trim();


        // Сохраняем ответ
        addToMemory(
            "jarvis",
            answer
        );


        // Показываем сразу
        showJarvisMessage(
            text,
            answer
        );


        // Сразу говорим
        statusText.textContent =
            "Говорю, сэр.";

        speak(answer);


    } catch (error) {

        console.error(
            "JARVIS ERROR:",
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
                    ${escapeHTML(
                        error.message || ""
                    )}
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
// РАСПОЗНАВАНИЕ РЕЧИ
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


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
            "Распознавание речи не поддерживается.";

        return;
    }


    // Разрешаем голос
    unlockAudio();


    // Останавливаем предыдущую речь
    stopSpeaking();


    try {

        recognition.start();

    } catch (error) {

        console.error(
            "Ошибка микрофона:",
            error
        );
    }
}


// ============================================================
// ИНИЦИАЛИЗАЦИЯ SPEECH RECOGNITION
// ============================================================

if (!SpeechRecognition) {

    statusText.textContent =
        "Распознавание речи не поддерживается этим браузером.";

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

            isListening =
                true;

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
                "Speech error:",
                event.error
            );


            isListening =
                false;


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

            isListening =
                false;


            if (micButton) {

                micButton.classList.remove(
                    "listening"
                );
            }
        };
}


// ============================================================
// UNLOCK AUDIO
// ============================================================

function unlockAudio() {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }


    if (speechUnlocked) {

        processSpeechQueue();

        return;
    }


    try {

        window.speechSynthesis.cancel();


        const utterance =
            new SpeechSynthesisUtterance("");


        utterance.lang =
            "ru-RU";


        utterance.volume =
            0;


        utterance.onend =
            function () {

                speechUnlocked =
                    true;

                processSpeechQueue();
            };


        window.speechSynthesis.speak(
            utterance
        );


        speechUnlocked =
            true;


    } catch (error) {

        console.error(
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
// MEMORY UI
// ============================================================

const memoryButton =
    document.getElementById(
        "memoryButton"
    );

const memoryModal =
    document.getElementById(
        "memoryModal"
    );

const closeMemory =
    document.getElementById(
        "closeMemory"
    );

const refreshMemory =
    document.getElementById(
        "refreshMemory"
    );

const clearMemory =
    document.getElementById(
        "clearMemory"
    );

const memoryContent =
    document.getElementById(
        "memoryContent"
    );


function openMemory() {

    if (!memoryModal) {
        return;
    }

    updateMemoryWindow();

    memoryModal.classList.add(
        "active"
    );

    memoryModal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeMemoryWindow() {

    if (!memoryModal) {
        return;
    }

    memoryModal.classList.remove(
        "active"
    );

    memoryModal.setAttribute(
        "aria-hidden",
        "true"
    );
}


function updateMemoryWindow() {

    if (!memoryContent) {
        return;
    }


    if (
        !memory ||
        memory.length === 0
    ) {

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
                            ${icon} ${role}
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


if (memoryButton) {

    memoryButton.addEventListener(
        "click",
        function () {

            openMemory();

        }
    );
}


if (closeMemory) {

    closeMemory.addEventListener(
        "click",
        function () {

            closeMemoryWindow();

        }
    );
}


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


if (clearMemory) {

    clearMemory.addEventListener(
        "click",
        function () {

            if (
                !confirm(
                    "Сэр, вы действительно хотите полностью очистить память JARVIS?"
                )
            ) {
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


if (memoryModal) {

    memoryModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                memoryModal
            ) {

                closeMemoryWindow();

            }
        }
    );
}


document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            memoryModal &&
            memoryModal.classList.contains(
                "active"
            )
        ) {

            closeMemoryWindow();

        }
    }
);


updateMemoryWindow();
