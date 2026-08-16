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
// ГОЛОС JARVIS
// ============================================================

function speak(text) {

    if (!text) {
        return;
    }

    if (!("speechSynthesis" in window)) {
        statusText.textContent =
            "Синтез речи не поддерживается браузером, сэр.";
        return;
    }

    try {

        // Останавливаем предыдущую речь
        window.speechSynthesis.cancel();

        const speakNow = () => {

            const voices =
                window.speechSynthesis.getVoices();

            // Только русские голоса
            const russianVoices =
                voices.filter(voice =>
                    voice.lang &&
                    voice.lang
                        .toLowerCase()
                        .startsWith("ru")
                );

            // Сначала ищем более качественный голос
            const preferredVoice =
                russianVoices.find(voice =>
                    /premium|enhanced|natural|neural/i.test(
                        voice.name
                    )
                ) ||
                russianVoices.find(voice =>
                    voice.lang
                        .toLowerCase()
                        .startsWith("ru-ru")
                ) ||
                russianVoices[0];

            const utterance =
                new SpeechSynthesisUtterance(text);

            // Русский язык
            utterance.lang = "ru-RU";

            // Манера речи
            utterance.rate = 0.92;
            utterance.pitch = 0.72;
            utterance.volume = 1;

            // Выбираем лучший найденный голос
            if (preferredVoice) {

                utterance.voice =
                    preferredVoice;

                console.log(
                    "Голос JARVIS:",
                    preferredVoice.name,
                    preferredVoice.lang
                );
            }

            utterance.onstart = function () {

                console.log(
                    "JARVIS начал говорить"
                );

                statusText.textContent =
                    "Говорю, сэр...";
            };

            utterance.onend = function () {

                console.log(
                    "JARVIS закончил говорить"
                );

                statusText.textContent =
                    "Готов к дальнейшим указаниям, сэр.";
            };

            utterance.onerror = function (event) {

                console.error(
                    "Ошибка синтеза речи:",
                    event
                );

                statusText.textContent =
                    "Ошибка воспроизведения голоса, сэр.";
            };

            window.speechSynthesis.speak(
                utterance
            );
        };

        // ====================================================
        // IPHONE / SAFARI
        // ====================================================

        const voices =
            window.speechSynthesis.getVoices();

        if (voices.length > 0) {

            speakNow();

        } else {

            window.speechSynthesis.onvoiceschanged =
                function () {

                    window.speechSynthesis.onvoiceschanged =
                        null;

                    speakNow();
                };
        }

    } catch (error) {

        console.error(
            "Ошибка запуска голоса:",
            error
        );

        statusText.textContent =
            "Не удалось запустить голос, сэр.";
    }
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
            "Я ещё обрабатываю предыдущий запрос, сэр.";

        return;
    }

    requestInProgress = true;

    statusText.textContent =
        "Думаю над ответом, сэр...";

    try {

        console.log(
            "Отправляем в Worker:",
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
            "Worker HTTP:",
            response.status
        );

        const raw =
            await response.text();

        console.log(
            "Worker ответ:",
            raw
        );

        let data;

        try {

            data =
                JSON.parse(raw);

        } catch (error) {

            throw new Error(
                "Worker вернул не JSON: " +
                raw.substring(0, 500)
            );
        }

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Ошибка Worker"
            );
        }

        if (!data.answer) {

            throw new Error(
                data.error ||
                "JARVIS не получил ответ AI"
            );
        }

        // ====================================================
        // ПОКАЗЫВАЕМ ОТВЕТ
        // ====================================================

        conversation.innerHTML = `

            <div class="user-message">

                <strong>Вы:</strong>

                ${escapeHTML(text)}

            </div>

            <div class="jarvis-message">

                <strong>JARVIS:</strong>

                ${escapeHTML(data.answer)}

            </div>

        `;

        statusText.textContent =
            "Ответ получен, сэр.";

        console.log(
            "Ответ JARVIS:",
            data.answer
        );

        console.log(
            "AI provider:",
            data.provider || "unknown"
        );

        // ====================================================
        // ГОВОРИМ
        // ====================================================

        speak(data.answer);

    } catch (error) {

        console.error(
            "Ошибка JARVIS:",
            error
        );

        conversation.innerHTML += `

            <div class="jarvis-message">

                <strong>JARVIS:</strong>

                Ошибка связи с сервером, сэр.

                <br>

                <small>
                    ${escapeHTML(error.message)}
                </small>

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
            "Я ещё обрабатываю предыдущий запрос, сэр.";

        return;
    }

    if (!SpeechRecognition) {

        statusText.textContent =
            "Распознавание речи не поддерживается этим браузером.";

        return;
    }

    try {

        // Останавливаем старую речь
        if ("speechSynthesis" in window) {

            window.speechSynthesis.cancel();
        }

        recognition.start();

    } catch (error) {

        console.log(
            "Ошибка запуска микрофона:",
            error
        );
    }
}

// ============================================================
// РАСПОЗНАВАНИЕ РЕЧИ
// ============================================================

if (!SpeechRecognition) {

    statusText.textContent =
        "Распознавание речи не поддерживается.";

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
    // НАЧАЛО СЛУШАНИЯ
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

            console.log(
                "Распознано:",
                text
            );

            if (!text) {

                statusText.textContent =
                    "Я не расслышал вас, сэр.";

                return;
            }

            // =================================================
            // СРАЗУ ПОКАЗЫВАЕМ ЗАПРОС
            // =================================================

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
                "Отправляю запрос, сэр...";

            // =================================================
            // ОТПРАВЛЯЕМ В AI
            // =================================================

            await askJarvis(text);
        };

    // ========================================================
    // ОШИБКА МИКРОФОНА
    // ========================================================

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

    // ========================================================
    // КОНЕЦ СЛУШАНИЯ
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
// РАЗБЛОКИРОВКА AUDIO НА IPHONE
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
