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

            console.error(
                "Ошибка речи:",
                event
            );

            statusText.textContent =
                "Ошибка воспроизведения голоса, сэр.";
        };

        window.speechSynthesis.speak(
            utterance
        );

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
            .replace(/\s+/g, " ")
            .trim();

    console.log(
        "Проверка команды:",
        command
    );

    // ========================================================
    // СТОП
    // ========================================================

    if (
        command.includes("стоп") ||
        command.includes("остановись") ||
        command.includes("замолчи") ||
        command.includes("хватит") ||
        command.includes("прекрати говорить") ||
        command.includes("останови речь")
    ) {

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

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
        (
            command.includes("очисти") ||
            command.includes("удали") ||
            command.includes("сотри")
        ) &&
        (
            command.includes("историю") ||
            command.includes("диалог") ||
            command.includes("чат") ||
            command.includes("сообщения")
        )
    ) {

        conversation.innerHTML = "";

        statusText.textContent =
            "История очищена, сэр.";

        speak(
            "История очищена, сэр."
        );

        return true;
    }

    if (
        command.includes("новый диалог") ||
        command.includes("начать заново") ||
        command.includes("очистить чат")
    ) {

        conversation.innerHTML = "";

        statusText.textContent =
            "Новый диалог начат, сэр.";

        speak(
            "Новый диалог начат, сэр."
        );

        return true;
    }

    // ========================================================
    // ОБНОВИТЬ СТРАНИЦУ
    // ========================================================

    if (
        (
            command.includes("обнови") ||
            command.includes("перезагрузи") ||
            command.includes("обновить") ||
            command.includes("перезагрузить")
        ) &&
        (
            command.includes("страницу") ||
            command.includes("сайт") ||
            command.includes("страница")
        )
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
        command.includes("вернись назад") ||
        command.includes("предыдущая страница") ||
        command === "назад"
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
        command.includes("какая сегодня дата") ||
        command.includes("какое сегодня число") ||
        command.includes("сегодняшняя дата") ||
        command.includes("число сегодня")
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
        command.includes("сколько времени") ||
        command.includes("который час") ||
        command.includes("текущее время") ||
        command.includes("которое сейчас время") ||
        command.includes("время сейчас")
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
            names: [
                "youtube",
                "ютуб",
                "ютаб"
            ],
            url: "https://www.youtube.com/"
        },

        {
            names: [
                "spotify",
                "спотифай"
            ],
            url: "https://open.spotify.com/"
        },

        {
            names: [
                "google",
                "гугл"
            ],
            url: "https://www.google.com/"
        },

        {
            names: [
                "tiktok",
                "тик ток",
                "тикток"
            ],
            url: "https://www.tiktok.com/"
        },

        {
            names: [
                "telegram",
                "телеграм"
            ],
            url: "https://web.telegram.org/"
        },

        {
            names: [
                "github",
                "гитхаб"
            ],
            url: "https://github.com/"
        }
    ];

    // ========================================================
    // ПРОВЕРЯЕМ, ХОЧЕТ ЛИ ПОЛЬЗОВАТЕЛЬ ЧТО-ТО ОТКРЫТЬ
    // ========================================================

    const wantsOpen =
        command.includes("открой") ||
        command.includes("открою") ||
        command.includes("открывай") ||
        command.includes("открыть") ||
        command.includes("запусти") ||
        command.includes("запуск") ||
        command.includes("зайди") ||
        command.includes("перейди") ||
        command.includes("перейти");

    if (wantsOpen) {

        let selectedSite = null;

        for (
            let i = 0;
            i < sites.length;
            i++
        ) {

            const site =
                sites[i];

            for (
                let j = 0;
                j < site.names.length;
                j++
            ) {

                if (
                    command.includes(
                        site.names[j]
                    )
                ) {

                    selectedSite =
                        site;

                    break;
                }
            }

            if (selectedSite) {
                break;
            }
        }

        // ====================================================
        // ЕСЛИ САЙТ НАЙДЕН
        // ====================================================

        if (selectedSite) {

            console.log(
                "КОМАНДА ОТКРЫТИЯ:",
                selectedSite.url
            );

            // НИКАКОГО ОТВЕТА JARVIS
            // НИКАКОЙ ОЗВУЧКИ
            // НИКАКОГО GEMINI

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }

            statusText.textContent =
                "Переход...";

            // Сразу открываем в текущей вкладке

            window.location.href =
                selectedSite.url;

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
    // НЕ ЛОКАЛЬНАЯ КОМАНДА
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
    // СНАЧАЛА ЛОКАЛЬНЫЕ КОМАНДЫ
    // ========================================================

    if (handleCommand(text)) {
        return;
    }

    // ========================================================
    // ЕСЛИ ЭТО НЕ КОМАНДА —
    // ОТПРАВЛЯЕМ В GEMINI
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
