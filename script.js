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
// ГОЛОС
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

        window.speechSynthesis.cancel();

        setTimeout(function () {

            const utterance =
                new SpeechSynthesisUtterance(text);

            utterance.lang = "ru-RU";
            utterance.rate = 0.85;
            utterance.pitch = 0.8;
            utterance.volume = 1;

            utterance.onstart = function () {

                console.log("JARVIS начал говорить");

                statusText.textContent =
                    "Говорю, сэр...";
            };

            utterance.onend = function () {

                console.log("JARVIS закончил говорить");

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

        }, 100);

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
                "JARVIS не получил ответ Gemini"
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

        // ====================================================
        // ОЗВУЧИВАЕМ ОТВЕТ
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
// РАЗБЛОКИРОВКА AUDIO НА iPHONE
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
// ПОКАЗ ДОСТУПНЫХ ГОЛОСОВ SAFARI
// ============================================================

let availableVoices = [];

function showAvailableVoices() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    const voices =
        window.speechSynthesis.getVoices();

    if (!voices.length) {
        return;
    }

    availableVoices = voices;

    let box =
        document.getElementById(
            "voiceTestBox"
        );

    if (!box) {

        box =
            document.createElement("div");

        box.id =
            "voiceTestBox";

        box.style.cssText = `
            margin: 25px auto;
            padding: 18px;
            max-width: 600px;
            background: rgba(0, 15, 25, 0.95);
            border: 1px solid rgba(0, 220, 255, 0.35);
            border-radius: 16px;
            color: #dffaff;
            font-family: Arial, sans-serif;
            font-size: 13px;
            text-align: left;
            box-shadow: 0 0 25px rgba(0, 200, 255, 0.12);
        `;

        document.body.appendChild(box);
    }

    box.innerHTML = "";

    const title =
        document.createElement("div");

    title.textContent =
        "🎙️ ДОСТУПНЫЕ ГОЛОСА SAFARI";

    title.style.cssText = `
        font-size: 17px;
        font-weight: bold;
        margin-bottom: 8px;
    `;

    box.appendChild(title);

    const info =
        document.createElement("div");

    info.textContent =
        "Найдено голосов: " +
        voices.length +
        ". Нажмите на голос, чтобы его проверить.";

    info.style.cssText = `
        opacity: 0.65;
        margin-bottom: 14px;
        line-height: 1.5;
    `;

    box.appendChild(info);

    voices.forEach(
        function (voice, index) {

            const button =
                document.createElement("button");

            button.type =
                "button";

            button.textContent =
                "🔊 " +
                (index + 1) +
                ". " +
                voice.name +
                " — " +
                voice.lang;

            button.style.cssText = `
                display: block;
                width: 100%;
                margin: 7px 0;
                padding: 11px;
                border-radius: 10px;
                border: 1px solid rgba(0, 220, 255, 0.25);
                background: rgba(0, 100, 130, 0.15);
                color: #ffffff;
                text-align: left;
                font-size: 13px;
            `;

            button.addEventListener(
                "click",
                function () {

                    testVoice(index);
                }
            );

            box.appendChild(button);
        }
    );
}

// ============================================================
// ТЕСТ КОНКРЕТНОГО ГОЛОСА
// ============================================================

function testVoice(index) {

    if (!availableVoices[index]) {
        return;
    }

    const voice =
        availableVoices[index];

    if ("speechSynthesis" in window) {

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(
                "Добрый вечер, сэр. Я JARVIS. Все системы готовы к работе."
            );

        utterance.voice =
            voice;

        utterance.lang =
            voice.lang;

        utterance.rate =
            0.85;

        utterance.pitch =
            0.8;

        utterance.volume =
            1;

        console.log(
            "Тестируем голос:",
            voice.name,
            voice.lang
        );

        window.speechSynthesis.speak(
            utterance
        );
    }
}

// ============================================================
// ЗАГРУЗКА ГОЛОСОВ SAFARI
// ============================================================

if ("speechSynthesis" in window) {

    showAvailableVoices();

    window.speechSynthesis.onvoiceschanged =
        function () {

            showAvailableVoices();
        };

    setTimeout(
        showAvailableVoices,
        1000
    );

    setTimeout(
        showAvailableVoices,
        3000
    );
}
