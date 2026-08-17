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

    if (!text) return;

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
        utterance.rate = 0.85;
        utterance.pitch = 0.8;
        utterance.volume = 1;

        utterance.onstart = function () {
            statusText.textContent = "Говорю, сэр...";
        };

        utterance.onend = function () {
            statusText.textContent =
                "Готов к дальнейшим указаниям, сэр.";
        };

        utterance.onerror = function (event) {
            console.error("Ошибка речи:", event);
            statusText.textContent =
                "Ошибка воспроизведения голоса, сэр.";
        };

        window.speechSynthesis.speak(utterance);

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Не удалось запустить голос, сэр.";
    }
}

// ============================================================
// ПОКАЗ ОТВЕТА JARVIS
// ============================================================

function showJarvisMessage(userText, answer) {

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
// ДИНАМИЧЕСКИЕ КОМАНДЫ
// ============================================================

function handleCommand(text) {

    const original =
        text.trim();

    const command =
        original
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
    // ОЧИСТКА ИСТОРИИ
    // ========================================================

    if (
        /\b(очисти|удали|сотри)\b.*\b(историю|диалог|чат|сообщения)\b/
            .test(command)
        ||
        /\b(новый диалог|начать заново|очистить чат)\b/
            .test(command)
    ) {

        conversation.innerHTML = "";

        statusText.textContent =
            "История очищена, сэр.";

        speak(
            "История очищена, сэр."
        );

        return true;
    }

    // ========================================================
    // ОБНОВИТЬ СТРАНИЦУ
    // ========================================================

    if (
        /\b(обнови|перезагрузи|обновить|перезагрузить)\b/
            .test(command)
        &&
        /\b(страницу|сайт|страница)\b/
            .test(command)
    ) {

        statusText.textContent =
            "Обновляю систему, сэр...";

        setTimeout(function () {
            location.reload();
        }, 300);

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
        }, 300);

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

        statusText.textContent =
            "Дата получена, сэр.";

        speak(answer);

        return true;
    }

    // ========================================================
    // ВРЕМЯ
    // ========================================================

    if (
        /\b(сколько времени|который час|текущее время|которое сейчас время|время сейчас)\b/
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

        statusText.textContent =
            "Время получено, сэр.";

        speak(answer);

        return true;
    }

    // ========================================================
    // ОТКРЫТИЕ САЙТОВ
    // ========================================================

    const sites = [

        {
            pattern: /\b(youtube|ютуб)\b/,
            url: "https://www.youtube.com/",
            name: "YouTube"
        },

        {
            pattern: /\b(spotify|спотифай)\b/,
            url: "https://open.spotify.com/",
            name: "Spotify"
        },

        {
            pattern: /\b(google|гугл)\b/,
            url: "https://www.google.com/",
            name: "Google"
        },

        {
            pattern: /\b(tiktok|тик ток|тикток)\b/,
            url: "https://www.tiktok.com/",
            name: "TikTok"
        },

        {
            pattern: /\b(telegram|телеграм)\b/,
            url: "https://web.telegram.org/",
            name: "Telegram Web"
        },

        {
            pattern: /\b(github|гитхаб)\b/,
            url: "https://github.com/",
            name: "GitHub"
        }
    ];

    const wantsOpen =
        /\b(открой|запусти|перейди|перейти|зайди|открывай)\b/
            .test(command);

    if (wantsOpen) {

        const site =
            sites.find(function (item) {
                return item.pattern.test(command);
            });

        if (site) {

            const answer =
                "Открываю " +
                site.name +
                ", сэр.";

            showJarvisMessage(
                original,
                answer
            );

            statusText.textContent =
                "Открываю " +
                site.name +
                "...";

            speak(answer);

            setTimeout(function () {
                window.location.href =
                    site.url;
            }, 500);

            return true;
        }
    }

    // ========================================================
    // ДИНАМИЧЕСКИЙ ПОИСК
    // ========================================================

    const searchMatch =
        command.match(
            /^(?:джарвис\s+)?(?:найди|поищи|загугли|погугли|поиск|найди в интернете|поищи в интернете)\s+(.+)$/i
        );

    if (searchMatch) {

        const query =
            searchMatch[1].trim();

        if (query.length > 0) {

            const answer =
                "Ищу информацию по запросу, сэр.";

            showJarvisMessage(
                original,
                answer
            );

            statusText.textContent =
                "Выполняю поиск...";

            speak(answer);

            setTimeout(function () {

                const url =
                    "https://www.google.com/search?q=" +
                    encodeURIComponent(query);

                window.location.href =
                    url;

            }, 500);

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

                // Безопасный математический калькулятор:
                // выражение предварительно очищено
                const result =
                    Function(
                        '"use strict"; return (' +
                        expression +
                        ')'
                    )();

                if (
                    Number.isFinite(result)
                ) {

                    const answer =
                        expression +
                        " = " +
                        result +
                        ", сэр.";

                    showJarvisMessage(
                        original,
                        answer
                    );

                    statusText.textContent =
                        "Расчёт выполнен, сэр.";

                    speak(answer);

                    return true;
                }

            } catch (error) {

                console.log(
                    "Не удалось вычислить:",
                    error
                );
            }
        }
    }

    // ========================================================
    // НЕ КОМАНДА
    // ========================================================

    return false;
}

// ============================================================
// ЗАПРОС К JARVIS / GEMINI
// ============================================================

async function askJarvis(text) {

    if (!text) {
        return;
    }

    if (requestInProgress) {
        return;
    }

    // ========================================================
    // СНАЧАЛА ПРОВЕРЯЕМ ЛОКАЛЬНЫЕ КОМАНДЫ
    // ========================================================

    if (handleCommand(text)) {
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

        speak(
            data.answer
        );

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
