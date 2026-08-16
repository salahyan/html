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
let speechUnlocked = false;
let requestInProgress = false;

// ============================================================
// РАЗБЛОКИРОВКА ГОЛОСА
// ============================================================

function forceUnlockSpeech() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    if (speechUnlocked) {
        return;
    }

    try {

        window.speechSynthesis.cancel();

        const silent =
            new SpeechSynthesisUtterance(" ");

        silent.volume = 0;
        silent.rate = 10;

        window.speechSynthesis.speak(silent);

        speechUnlocked = true;

        console.log("JARVIS: голос разблокирован");

    } catch (error) {

        console.error(
            "Ошибка разблокировки голоса:",
            error
        );

    }
}

// ============================================================
// ГОЛОС JARVIS
// ============================================================

function speak(text) {

    if (!("speechSynthesis" in window)) {

        statusText.textContent =
            "Синтез речи недоступен.";

        return;
    }

    if (!text) {
        return;
    }

    forceUnlockSpeech();

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang = "ru-RU";
    utterance.rate = 0.9;
    utterance.pitch = 0.75;
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
            "Ошибка голоса:",
            event
        );

        statusText.textContent =
            "Ошибка воспроизведения голоса.";

    };

    window.speechSynthesis.speak(utterance);
}

// ============================================================
// ОТПРАВКА ЗАПРОСА JARVIS
// ============================================================

async function askJarvis(text) {

    if (!text) {
        return;
    }

    if (requestInProgress) {
        return;
    }

    requestInProgress = true;

    statusText.textContent =
        "Думаю над ответом, сэр...";

    try {

        console.log(
            "JARVIS → Worker:",
            text
        );

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

        console.log(
            "HTTP статус Worker:",
            response.status
        );

        const raw =
            await response.text();

        console.log(
            "Ответ Worker:",
            raw
        );

        // ====================================================
        // ПЫТАЕМСЯ РАЗОБРАТЬ JSON
        // ====================================================

        let data;

        try {

            data =
                JSON.parse(raw);

        } catch (jsonError) {

            throw new Error(
                "Worker вернул не JSON. Ответ: " +
                raw.substring(0, 500)
            );

        }

        // ====================================================
        // HTTP ОШИБКА
        // ====================================================

        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status +
                ": " +
                (
                    data.error ||
                    data.message ||
                    raw
                )
            );

        }

        // ====================================================
        // ОШИБКА ОТ BEGET / GEMINI
        // ====================================================

        if (data.error) {

            let details = "";

            if (data.details) {

                try {

                    details =
                        " | " +
                        JSON.stringify(
                            data.details
                        );

                } catch (e) {

                    details =
                        " | " +
                        String(
                            data.details
                        );

                }

            }

            throw new Error(
                data.error +
                details
            );

        }

        // ====================================================
        // ПРОВЕРЯЕМ ОТВЕТ
        // ====================================================

        if (!data.answer) {

            throw new Error(
                "В ответе нет поля answer. Ответ сервера: " +
                raw.substring(0, 500)
            );

        }

        // ====================================================
        // ПОКАЗЫВАЕМ ОТВЕТ
        // ====================================================

        conversation.innerHTML = `

            <div class="user-message">

                <strong>Вы:</strong><br>

                ${escapeHTML(text)}

            </div>

            <div class="jarvis-message">

                <strong>JARVIS:</strong><br>

                ${escapeHTML(data.answer)}

            </div>

        `;

        statusText.textContent =
            "Ответ получен, сэр.";

        console.log(
            "Ответ JARVIS:",
            data.answer
        );

        // ====================================================
        // ОЗВУЧИВАЕМ ОТВЕТ
        // ====================================================

        speak(data.answer);

    } catch (error) {

        console.error(
            "ПОЛНАЯ ОШИБКА JARVIS:",
            error
        );

        const errorMessage =
            error && error.message
                ? error.message
                : String(error);

        // Показываем реальную ошибку
        // вместо общей фразы

        conversation.innerHTML = `

            <div class="user-message">

                <strong>Вы:</strong><br>

                ${escapeHTML(text)}

            </div>

            <div class="jarvis-message">

                <strong>JARVIS:</strong><br>

                Ошибка сервера, сэр.<br><br>

                <small>
                    ${escapeHTML(errorMessage)}
                </small>

            </div>

        `;

        statusText.textContent =
            "Ошибка: " +
            errorMessage;

    } finally {

        requestInProgress = false;

    }
}

// ============================================================
// КНОПКА МИКРОФОНА
// ============================================================

function handleMicClick() {

    if (isListening) {
        return;
    }

    if (requestInProgress) {

        statusText.textContent =
            "Подождите, сэр. Я ещё обрабатываю запрос.";

        return;
    }

    forceUnlockSpeech();

    if (!SpeechRecognition) {

        statusText.textContent =
            "Распознавание речи не поддерживается.";

        return;
    }

    try {

        recognition.start();

    } catch (error) {

        console.error(
            "Ошибка запуска микрофона:",
            error
        );

    }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ РАСПОЗНАВАНИЯ
// ============================================================

if (!SpeechRecognition) {

    statusText.textContent =
        "Этот браузер не поддерживает распознавание речи.";

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

    // ========================================================
    // НАЧАЛО ПРОСЛУШИВАНИЯ
    // ========================================================

    recognition.onstart =
        function () {

            isListening = true;

            micButton.classList.add(
                "listening"
            );

            statusText.textContent =
                "Слушаю вас, сэр...";

        };

    // ========================================================
    // ПОЛУЧЕНИЕ РЕЧИ
    // ========================================================

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

                    <strong>Вы:</strong><br>

                    ${escapeHTML(text)}

                </div>

                <div class="jarvis-message">

                    <strong>JARVIS:</strong><br>

                    Обрабатываю запрос, сэр...

                </div>

            `;

            statusText.textContent =
                "Отправляю запрос, сэр...";

            // =================================================
            // ОТПРАВЛЯЕМ В GEMINI
            // =================================================

            await askJarvis(text);

        };

    // ========================================================
    // ОШИБКА РАСПОЗНАВАНИЯ
    // ========================================================

    recognition.onerror =
        function (event) {

            console.error(
                "Ошибка SpeechRecognition:",
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
                    "Ошибка сети распознавания речи.";

            } else {

                statusText.textContent =
                    "Ошибка микрофона: " +
                    event.error;

            }

        };

    // ========================================================
    // ОКОНЧАНИЕ
    // ========================================================

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
// РАЗБЛОКИРОВКА ГОЛОСА ПРИ КАСАНИИ
// ============================================================

document.addEventListener(
    "touchstart",
    function firstTouch() {

        forceUnlockSpeech();

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
// РАЗБЛОКИРОВКА ГОЛОСА ПРИ КЛИКЕ
// ============================================================

document.addEventListener(
    "click",
    function firstClick() {

        forceUnlockSpeech();

        document.removeEventListener(
            "click",
            firstClick
        );

    },
    {
        passive: true
    }
);
