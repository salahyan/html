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

            statusText.textContent =
                "Говорю, сэр...";
        };

        utterance.onend = function () {

            statusText.textContent =
                "Готов к дальнейшим указаниям, сэр.";
        };

        utterance.onerror = function (event) {

            console.error(
                "Ошибка речи:",
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
// ОЧИСТКА ТЕКСТА КОМАНДЫ
// ============================================================

function normalizeCommand(text) {

    return text
        .toLowerCase()
        .replace(/[!?.,;:]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

function launchApp(app, original) {

    showJarvisMessage(
        original,
        "Открываю " + app.name + ", сэр."
    );

    statusText.textContent =
        "Запускаю " + app.name + "...";

    // ========================================================
    // НИКАКОГО GEMINI
    // НИКАКИХ ЛИШНИХ ЗАДЕРЖЕК
    // ========================================================

    try {

        if (app.appUrl) {

            window.location.href =
                app.appUrl;

        } else if (app.webUrl) {

            window.location.href =
                app.webUrl;
        }

    } catch (error) {

        console.error(
            "Ошибка запуска:",
            error
        );

        statusText.textContent =
            "Не удалось открыть " +
            app.name +
            ", сэр.";
    }
}

// ============================================================
// ДИНАМИЧЕСКИЕ КОМАНДЫ
// ============================================================

function handleCommand(text) {

    const original =
        text.trim();

    const command =
        normalizeCommand(original);

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
    // ОЧИСТИТЬ ДИАЛОГ
    // ========================================================

    if (
        (
            /\b(очисти|удали|сотри)\b/.test(command) &&
            /\b(историю|диалог|чат|сообщения)\b/.test(command)
        )
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
            "Обновляю систему, сэр.";

        location.reload();

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

        history.back();

        return true;
    }

    // ========================================================
    // ДАТА
    // ========================================================

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

        statusText.textContent =
            "Время получено, сэр.";

        speak(answer);

        return true;
    }

    // ========================================================
    // ПРИЛОЖЕНИЯ
    // ========================================================

    const apps = [

        // ----------------------------------------------------
        // YOUTUBE
        // ----------------------------------------------------

        {
            name: "YouTube",

            pattern:
                /\b(youtube|ютуб|ютюб|ютаб)\b/i,

            appUrl:
                "youtube://",

            webUrl:
                "https://www.youtube.com/"
        },

        // ----------------------------------------------------
        // TELEGRAM
        // ----------------------------------------------------

        {
            name: "Telegram",

            pattern:
                /\b(telegram|телеграм|телега)\b/i,

            appUrl:
                "tg://",

            webUrl:
                "https://web.telegram.org/"
        },

        // ----------------------------------------------------
        // TIKTOK
        // ----------------------------------------------------

        {
            name: "TikTok",

            pattern:
                /\b(tiktok|тик ток|тикток)\b/i,

            appUrl:
                "tiktok://",

            webUrl:
                "https://www.tiktok.com/"
        },

        // ----------------------------------------------------
        // WHATSAPP
        // ----------------------------------------------------

        {
            name: "WhatsApp",

            pattern:
                /\b(whatsapp|ватсап|вацап|вацапп|вотсап)\b/i,

            appUrl:
                "whatsapp://",

            webUrl:
                "https://www.whatsapp.com/"
        },

        // ----------------------------------------------------
        // INSTAGRAM
        // ----------------------------------------------------

        {
            name: "Instagram",

            pattern:
                /\b(instagram|инстаграм|инста)\b/i,

            appUrl:
                "instagram://",

            webUrl:
                "https://www.instagram.com/"
        },

        // ----------------------------------------------------
        // WILDBERRIES
        // ----------------------------------------------------

        {
            name: "Wildberries",

            pattern:
                /\b(wildberries|wildberry|вайлдберриз|вайберриз|вб|вбшоп)\b/i,

            // Не используем неподтверждённый wb://
            // Для WB надёжнее использовать HTTPS/Universal Link.

            appUrl:
                null,

            webUrl:
                "https://www.wildberries.ru/"
        },

        // ----------------------------------------------------
        // OZON
        // ----------------------------------------------------

        {
            name: "Ozon",

            pattern:
                /\b(ozon|озон|озон)\b/i,

            appUrl:
                null,

            webUrl:
                "https://www.ozon.ru/"
        },

        // ----------------------------------------------------
        // TWITCH
        // ----------------------------------------------------

        {
            name: "Twitch",

            pattern:
                /\b(twitch|твич|твиче)\b/i,

            appUrl:
                "twitch://",

            webUrl:
                "https://www.twitch.tv/"
        },

        // ----------------------------------------------------
        // BLOCK BLAST
        // ----------------------------------------------------

        {
            name: "Block Blast",

            pattern:
                /\b(block blast|blockblast|блок бласт|блокбласт|блок бластер)\b/i,

            // Публичная схема приложения не подтверждена.
            // Поэтому не придумываем blockblast://

            appUrl:
                null,

            webUrl:
                "https://www.blockblast.com/apphome"
        }
    ];

    // ========================================================
    // ПРОВЕРЯЕМ, ЧТО ПОЛЬЗОВАТЕЛЬ ХОЧЕТ ЧТО-ТО ОТКРЫТЬ
    // ========================================================

    const wantsOpen =
        /\b(открой|открывай|открыть|запусти|запуск|запустить|зайди|перейди|перейти)\b/i
            .test(command);

    if (wantsOpen) {

        const app =
            apps.find(function (item) {

                return item.pattern.test(
                    command
                );

            });

        if (app) {

            launchApp(
                app,
                original
            );

            return true;
        }
    }

    // ========================================================
    // ЕСЛИ ЧЕЛОВЕК СКАЗАЛ ПРОСТО НАЗВАНИЕ
    // ========================================================

    const directApp =
        apps.find(function (item) {

            return (
                item.pattern.test(command) &&
                command.length <=
                    item.name.length + 20
            );

        });

    if (directApp) {

        launchApp(
            directApp,
            original
        );

        return true;
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

            }, 300);

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
                .replace(
                    /умножить на/g,
                    "*"
                )
                .replace(
                    /умножить/g,
                    "*"
                )
                .replace(
                    /помножить на/g,
                    "*"
                )
                .replace(
                    /разделить на/g,
                    "/"
                )
                .replace(
                    /разделить/g,
                    "/"
                )
                .replace(
                    /плюс/g,
                    "+"
                )
                .replace(
                    /минус/g,
                    "-"
                )
                .replace(
                    /в степени/g,
                    "**"
                )
                .replace(
                    /,/g,
                    "."
                )
                .replace(
                    /×/g,
                    "*"
                )
                .replace(
                    /÷/g,
                    "/"
                )
                .replace(
                    /[^0-9+\-*/().%\s]/g,
                    ""
                )
                .trim();

        if (
            expression &&
            /^[0-9+\-*/().%\s]+$/.test(
                expression
            )
        ) {

            try {

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
                    "Ошибка калькулятора:",
                    error
                );
            }
        }
    }

    // ========================================================
    // НЕ ЛОКАЛЬНАЯ КОМАНДА
    // ========================================================

    return false;
}

// ============================================================
// GEMINI
// ============================================================

async function askJarvis(text) {

    if (!text) {
        return;
    }

    if (requestInProgress) {
        return;
    }

    // ========================================================
    // СНАЧАЛА ЛОКАЛЬНЫЕ КОМАНДЫ
    // ========================================================

    if (handleCommand(text)) {
        return;
    }

    // ========================================================
    // ТОЛЬКО ЕСЛИ ЭТО НЕ КОМАНДА
    // ИДЁМ В GEMINI
    // ========================================================

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
                    ${escapeHTML(
                        error.message
                    )}
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
// SPEECH RECOGNITION
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

            await askJarvis(
                text
            );
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
