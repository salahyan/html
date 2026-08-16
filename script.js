const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

const JARVIS_API =
    "https://jarvis.salahyansergei2006.workers.dev/";

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let requestInProgress = false;


// ============================================================
// БЫСТРЫЕ ЛОКАЛЬНЫЕ ОТВЕТЫ
// ============================================================

function getLocalAnswer(text) {

    const t = text
        .toLowerCase()
        .replace(/[!?.,]/g, "")
        .trim();

    if (
        t === "привет джарвис" ||
        t === "джарвис привет" ||
        t === "привет jarvis"
    ) {
        return "Здравствуйте, сэр. Я к вашим услугам.";
    }

    if (
        t === "2 плюс 2" ||
        t === "два плюс два" ||
        t === "сколько будет 2 плюс 2" ||
        t === "сколько будет два плюс два"
    ) {
        return "Четыре, сэр. Даже мои схемы сегодня не подвели.";
    }

    return null;
}


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

        const utterance =
            new SpeechSynthesisUtterance(text);

        utterance.lang = "ru-RU";

        // Быстрая естественная речь
        utterance.rate = 0.95;

        // Более низкий голос
        utterance.pitch = 0.78;

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

            statusText.textContent =
                "Ошибка воспроизведения голоса, сэр.";
        };

        // Без дополнительной задержки
        window.speechSynthesis.speak(
            utterance
        );

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
// ПОКАЗ ДИАЛОГА
// ============================================================

function showConversation(userText, answer) {

    conversation.innerHTML = `

        <div class="user-message">

            <strong>Вы:</strong>

            ${escapeHTML(userText)}

        </div>

        <div class="jarvis-message">

            <strong>JARVIS:</strong>

            ${escapeHTML(answer)}

        </div>

    `;
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
        "Обрабатываю запрос, сэр...";

    try {

        console.log(
            "Отправляем запрос:",
            text
        );


        // ====================================================
        // БЫСТРЫЕ ЛОКАЛЬНЫЕ КОМАНДЫ
        // ====================================================

        const localAnswer =
            getLocalAnswer(text);

        if (localAnswer) {

            showConversation(
                text,
                localAnswer
            );

            statusText.textContent =
                "Ответ готов, сэр.";

            speak(localAnswer);

            return;
        }


        // ====================================================
        // GEMINI ЧЕРЕЗ CLOUDFLARE WORKER
        // ====================================================

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
                    }),

                    signal:
                        AbortSignal.timeout(30000)
                }
            );


        console.log(
            "Worker HTTP:",
            response.status
        );


        const raw =
            await response.text();


        console.log(
            "Worker RAW:",
            raw
        );


        // ====================================================
        // ПРОВЕРКА JSON
        // ====================================================

        let data;

        try {

            data =
                JSON.parse(raw);

        } catch (error) {

            throw new Error(
                "Worker вернул не JSON:\n" +
                raw.substring(0, 1000)
            );
        }


        console.log(
            "Worker JSON:",
            data
        );


        // ====================================================
        // ДИАГНОСТИКА ОШИБКИ GEMINI
        // ====================================================

        if (!response.ok) {

            console.error(
                "ПОЛНАЯ ОШИБКА GEMINI:",
                data
            );

            let details = "";

            if (data.details) {

                details =
                    typeof data.details === "string"
                        ? data.details
                        : JSON.stringify(
                            data.details,
                            null,
                            2
                        );
            }

            throw new Error(

                (data.error ||
                    "Ошибка Worker")

                +

                (
                    details
                        ? "\n\n" + details
                        : ""
                )
            );
        }


        // ====================================================
        // ПРОВЕРКА ОТВЕТА
        // ====================================================

        if (!data.answer) {

            throw new Error(

                data.error ||

                "JARVIS не получил текстовый ответ от Gemini."
            );
        }


        // ====================================================
        // ПОКАЗЫВАЕМ ОТВЕТ
        // ====================================================

        showConversation(
            text,
            data.answer
        );


        statusText.textContent =
            "Ответ получен, сэр.";


        console.log(
            "Ответ JARVIS:",
            data.answer
        );


        // ====================================================
        // ГОВОРИМ СРАЗУ
        // ====================================================

        speak(
            data.answer
        );


    } catch (error) {

        console.error(
            "ОШИБКА JARVIS:",
            error
        );


        // ====================================================
        // ПОКАЗЫВАЕМ ПОЛНУЮ ОШИБКУ
        // ====================================================

        conversation.innerHTML = `

            <div class="user-message">

                <strong>Вы:</strong>

                ${escapeHTML(text)}

            </div>

            <div class="jarvis-message">

                <strong>JARVIS:</strong>

                Ошибка связи с сервером, сэр.

                <br><br>

                <small style="
                    white-space: pre-wrap;
                    word-break: break-word;
                ">
                    ${escapeHTML(
                        error.message
                    )}
                </small>

            </div>

        `;


        statusText.textContent =
            "Ошибка обработки запроса, сэр.";


    } finally {

        requestInProgress =
            false;
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

    micButton.disabled =
        true;

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

            isListening =
                true;

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
                event
                    .results[0][0]
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


            // Сразу показываем запрос

            conversation.innerHTML = `

                <div class="user-message">

                    <strong>Вы:</strong>

                    ${escapeHTML(text)}

                </div>

                <div class="jarvis-message">

                    <strong>JARVIS:</strong>

                    Обрабатываю...

                </div>

            `;


            statusText.textContent =
                "Обрабатываю запрос, сэр.";


            // Отправляем сразу

            await askJarvis(
                text
            );
        };


    // ========================================================
    // ОШИБКА РАСПОЗНАВАНИЯ
    // ========================================================

    recognition.onerror =
        function (event) {

            console.error(
                "Ошибка распознавания:",
                event.error
            );


            isListening =
                false;


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

            isListening =
                false;

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
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


// ============================================================
// РАЗБЛОКИРОВКА AUDIO НА iPHONE
// ============================================================

function unlockAudio() {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }


    try {

        window.speechSynthesis.cancel();


        const audio =
            new SpeechSynthesisUtterance(
                ""
            );


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
