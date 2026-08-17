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
// ПАМЯТЬ ДИАЛОГА
// ============================================================

const MEMORY_KEY = "jarvis_conversation_memory";

let conversationMemory = [];

try {
    const saved =
        localStorage.getItem(MEMORY_KEY);

    if (saved) {
        conversationMemory =
            JSON.parse(saved);

        if (!Array.isArray(conversationMemory)) {
            conversationMemory = [];
        }
    }
} catch (error) {
    console.log(
        "Ошибка загрузки памяти:",
        error
    );

    conversationMemory = [];
}

// Максимум последних сообщений
const MAX_MEMORY_MESSAGES = 8;


// ============================================================
// СОХРАНЕНИЕ ПАМЯТИ
// ============================================================

function saveMemory() {

    try {

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(
                conversationMemory
            )
        );

    } catch (error) {

        console.log(
            "Ошибка сохранения памяти:",
            error
        );
    }
}


// ============================================================
// ДОБАВИТЬ В ПАМЯТЬ
// ============================================================

function addToMemory(role, text) {

    if (!text) {
        return;
    }

    conversationMemory.push({
        role: role,
        text: text,
        time: Date.now()
    });

    if (
        conversationMemory.length >
        MAX_MEMORY_MESSAGES
    ) {

        conversationMemory =
            conversationMemory.slice(
                -MAX_MEMORY_MESSAGES
            );
    }

    saveMemory();
}


// ============================================================
// ОЧИСТИТЬ ПАМЯТЬ
// ============================================================

function clearMemory() {

    conversationMemory = [];

    try {

        localStorage.removeItem(
            MEMORY_KEY
        );

    } catch (error) {

        console.log(error);
    }

    console.log(
        "Память JARVIS очищена"
    );
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

        utterance.lang =
            "ru-RU";

        utterance.rate =
            0.85;

        utterance.pitch =
            0.8;

        utterance.volume =
            1;

        utterance.onstart =
            function () {

                statusText.textContent =
                    "Говорю, сэр...";
            };

        utterance.onend =
            function () {

                statusText.textContent =
                    "Готов к дальнейшим указаниям, сэр.";
            };

        utterance.onerror =
            function (event) {

                console.error(
                    "Ошибка речи:",
                    event
                );
            };

        window.speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.error(error);
    }
}


// ============================================================
// ПОКАЗ СООБЩЕНИЯ
// ============================================================

function showJarvisMessage(
    userText,
    answer
) {

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
// ЛОКАЛЬНЫЕ КОМАНДЫ
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
    // ОЧИСТИТЬ ПАМЯТЬ
    // ========================================================

    if (
        /\b(очисти|сотри|удали)\b.*\b(память|воспоминания|контекст)\b/
            .test(command)
        ||
        /\bзабудь всё\b/.test(command)
    ) {

        clearMemory();

        const answer =
            "Память очищена, сэр.";

        showJarvisMessage(
            original,
            answer
        );

        statusText.textContent =
            "Память очищена, сэр.";

        speak(answer);

        return true;
    }


    // ========================================================
    // ПОКАЗАТЬ ПАМЯТЬ
    // ========================================================

    if (
        /\b(что ты помнишь|что ты знаешь обо мне|покажи память)\b/
            .test(command)
    ) {

        if (!conversationMemory.length) {

            const answer =
                "Пока ничего не помню, сэр.";

            showJarvisMessage(
                original,
                answer
            );

            speak(answer);

            return true;
        }

        const count =
            conversationMemory.length;

        const answer =
            `В текущем разговоре у меня сохранено ${count} сообщений, сэр.`;

        showJarvisMessage(
            original,
            answer
        );

        speak(answer);

        return true;
    }


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

        clearMemory();

        statusText.textContent =
            "Диалог и память очищены, сэр.";

        speak(
            "Диалог и память очищены, сэр."
        );

        return true;
    }


    // ========================================================
    // ОБНОВИТЬ
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

        setTimeout(
            function () {
                location.reload();
            },
            200
        );

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

        setTimeout(
            function () {
                history.back();
            },
            200
        );

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
            web: "https://www.youtube.com/",
            name: "YouTube"
        },

        {
            pattern: /\b(telegram|телеграм)\b/i,
            url: "tg://",
            web: "https://web.telegram.org/",
            name: "Telegram"
        },

        {
            pattern: /\b(tiktok|тик ток|тикток)\b/i,
            url: "tiktok://",
            web: "https://www.tiktok.com/",
            name: "TikTok"
        },

        {
            pattern: /\b(whatsapp|ватсап|вотсап)\b/i,
            url: "whatsapp://",
            web: "https://web.whatsapp.com/",
            name: "WhatsApp"
        },

        {
            pattern: /\b(instagram|инстаграм)\b/i,
            url: "instagram://",
            web: "https://www.instagram.com/",
            name: "Instagram"
        },

        {
            pattern: /\b(wildberries|вайлдберриз|вб)\b/i,
            url: "wb://",
            web: "https://www.wildberries.ru/",
            name: "Wildberries"
        },

        {
            pattern: /\b(ozon|озон)\b/i,
            url: "ozon://",
            web: "https://www.ozon.ru/",
            name: "Ozon"
        },

        {
            pattern: /\b(twitch|твич)\b/i,
            url: "twitch://",
            web: "https://www.twitch.tv/",
            name: "Twitch"
        },

        {
            pattern: /\b(bloc blast|block blast|блок бласт)\b/i,
            url: "blockblast://",
            web: "https://apps.apple.com/",
            name: "Bloc Blast!"
        }

    ];


    const wantsOpen =
        /\b(открой|открывай|открыть|запусти|запуск|зайди|перейди|перейти)\b/i
            .test(command);


    if (wantsOpen) {

        const app =
            apps.find(
                function (item) {
                    return item.pattern.test(
                        command
                    );
                }
            );

        if (app) {

            statusText.textContent =
                "Запускаю " +
                app.name +
                ", сэр...";

            conversation.innerHTML = `

                <div class="user-message">

                    <strong>Вы:</strong>

                    ${escapeHTML(original)}

                </div>

                <div class="jarvis-message">

                    <strong>JARVIS:</strong>

                    Запускаю ${escapeHTML(app.name)}, сэр.

                </div>

            `;

            try {

                window.location.href =
                    app.url;

            } catch (error) {

                console.error(
                    "Ошибка запуска:",
                    error
                );
            }

            return true;
        }
    }


    // ========================================================
    // ПОИСК
    // ========================================================

    const searchMatch =
        command.match(
            /^(?:джарвис\s+)?(?:найди|поищи|загугли|погугли|поиск)\s+(.+)$/i
        );

    if (searchMatch) {

        const query =
            searchMatch[1].trim();

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
            300
        );

        return true;
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
                .replace(/разделить на/g, "/")
                .replace(/плюс/g, "+")
                .replace(/минус/g, "-")
                .replace(/,/g, ".")
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
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
                        result +
                        ", сэр.";

                    showJarvisMessage(
                        original,
                        answer
                    );

                    speak(answer);

                    return true;
                }

            } catch (error) {

                console.log(error);
            }
        }
    }

    return false;
}


// ============================================================
// JARVIS API С ПАМЯТЬЮ
// ============================================================

async function askJarvis(text) {

    if (!text) {
        return;
    }

    if (requestInProgress) {
        return;
    }

    // Сначала локальные команды
    if (handleCommand(text)) {
        return;
    }

    requestInProgress =
        true;

    statusText.textContent =
        "Думаю над ответом, сэр...";

    // Сохраняем сообщение пользователя
    addToMemory(
        "user",
        text
    );

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

                        text: text,

                        // Передаём контекст
                        history:
                            conversationMemory
                                .slice(
                                    -MAX_MEMORY_MESSAGES
                                )

                    })
                }
            );

        const raw =
            await response.text();

        let data;

        try {

            data =
                JSON.parse(raw);

        } catch (error) {

            throw new Error(
                "Worker вернул не JSON"
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
                "JARVIS не получил ответ"
            );
        }

        const answer =
            data.answer.trim();

        // Сохраняем ответ JARVIS
        addToMemory(
            "assistant",
            answer
        );

        showJarvisMessage(
            text,
            answer
        );

        statusText.textContent =
            "Ответ получен, сэр.";

        speak(answer);

    } catch (error) {

        console.error(
            "Ошибка JARVIS:",
            error
        );

        // Если запрос не удался,
        // убираем последнее сообщение пользователя
        if (
            conversationMemory.length &&
            conversationMemory[
                conversationMemory.length - 1
            ].role === "user"
        ) {

            conversationMemory.pop();

            saveMemory();
        }

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
            "Распознавание речи не поддерживается.";

        return;
    }

    try {

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        recognition.start();

    } catch (error) {

        console.log(
            "Ошибка запуска:",
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

            await askJarvis(
                text
            );
        };


    recognition.onerror =
        function (event) {

            console.error(
                "Speech error:",
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

        console.log(error);
    }
}


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
