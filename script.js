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

        console.log(
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

        console.log(
            "Ошибка синтеза речи:",
            event
        );

        statusText.textContent =
            "Не удалось воспроизвести голос.";

    };

    window.speechSynthesis.speak(utterance);
}

// ============================================================
// ЗАПРОС К JARVIS
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
            "Отправляю запрос:",
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
            "HTTP статус:",
            response.status
        );

        const raw =
            await response.text();

        console.log(
            "Ответ Worker:",
            raw
        );

        let data;

        try {

            data =
                JSON.parse(raw);

        } catch (error) {

            throw new Error(
                "Worker вернул не JSON: " +
                raw.substring(0, 300)
            );

        }

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Ошибка сервера"
            );

        }

        if (!data.answer) {

            throw new Error(
                data.error ||
                "Gemini не вернул ответ"
            );

        }

        // ====================================================
        // ВЫВОД ОТВЕТА
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

        // ====================================================
        // ОЗВУЧИВАЕМ ОТВЕТ
        // ====================================================

        speak(data.answer);

    } catch (error) {

        console.error(
            "Ошибка JARVIS:",
            error
        );

        conversation.innerHTML = `

            <div class="user-message">

                <strong>Вы:</strong><br>

                ${escapeHTML(text)}

            </div>

            <div class="jarvis-message">

                <strong>JARVIS:</strong><br>

                Ошибка связи с сервером, сэр.

            </div>

        `;

        statusText.textContent =
            "Не удалось получить ответ, сэр.";

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

        console.log(
            "Ошибка запуска микрофона:",
            error
        );

    }
}

// ============================================================
// СОЗДАНИЕ SPEECH RECOGNITION
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
    // НАЧАЛО
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
    // РЕЗУЛЬТАТ
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

            // ВАЖНО:
            // здесь действительно вызывается Gemini

            await askJarvis(text);

        };

    // ========================================================
    // ОШИБКА
    // ========================================================

    recognition.onerror =
        function (event) {

            console.log(
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
                    "Ошибка сети распознавания речи.";

            } else {

                statusText.textContent =
                    "Не удалось распознать речь.";

            }

        };

    // ========================================================
    // КОНЕЦ
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
