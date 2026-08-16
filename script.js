const micButton =
    document.getElementById("micButton");

const statusText =
    document.getElementById("status");

const conversation =
    document.getElementById("conversation");

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

let currentAudio = null;

// ============================================================
// AI VOICE JARVIS
// ============================================================

async function speakWithAI(text) {

    if (!text) {
        return false;
    }

    // Проверяем Puter
    if (
        typeof puter === "undefined" ||
        !puter.ai ||
        !puter.ai.txt2speech
    ) {

        console.log(
            "Puter.js недоступен"
        );

        return false;
    }

    try {

        console.log(
            "JARVIS AI Voice запускается..."
        );

        statusText.textContent =
            "Говорю, сэр...";

        // Останавливаем предыдущий AI-голос
        if (currentAudio) {

            try {

                currentAudio.pause();

            } catch (error) {

                console.log(
                    "Не удалось остановить старое аудио:",
                    error
                );
            }

            currentAudio = null;
        }

        // На всякий случай останавливаем
        // стандартный голос браузера
        if (
            "speechSynthesis" in window
        ) {

            window.speechSynthesis.cancel();
        }

        // =====================================================
        // GEMINI AI TTS
        // =====================================================

        const audio =
            await puter.ai.txt2speech(
                text,
                {
                    provider: "gemini",

                    model:
                        "gemini-3.1-flash-tts-preview",

                    // Более низкий и уверенный вариант
                    voice: "Charon",

                    instructions:
                        "Speak in Russian. " +
                        "Use a calm, deep, confident, " +
                        "professional futuristic AI assistant style. " +
                        "Sound natural and controlled. " +
                        "Speak clearly and not too slowly."
                }
            );

        if (!audio) {

            console.log(
                "AI TTS не вернул аудио"
            );

            return false;
        }

        currentAudio = audio;

        // =====================================================
        // ВОСПРОИЗВЕДЕНИЕ
        // =====================================================

        if (
            typeof audio.play === "function"
        ) {

            await audio.play();

        } else {

            console.log(
                "У аудио отсутствует play()"
            );

            return false;
        }

        console.log(
            "JARVIS AI Voice запущен"
        );

        return true;

    } catch (error) {

        console.error(
            "Ошибка AI Voice:",
            error
        );

        return false;
    }
}

// ============================================================
// РЕЗЕРВНЫЙ СИСТЕМНЫЙ ГОЛОС
// ============================================================

function speakWithBrowser(text) {

    if (!text) {
        return;
    }

    if (
        !("speechSynthesis" in window)
    ) {

        statusText.textContent =
            "Синтез речи недоступен, сэр.";

        return;
    }

    try {

        window.speechSynthesis.cancel();

        const speakNow = () => {

            const voices =
                window.speechSynthesis
                    .getVoices();

            const russianVoices =
                voices.filter(
                    voice =>
                        voice.lang &&
                        voice.lang
                            .toLowerCase()
                            .startsWith("ru")
                );

            const preferredVoice =
                russianVoices.find(
                    voice =>
                        /premium|enhanced|natural|neural/i
                            .test(voice.name)
                ) ||
                russianVoices.find(
                    voice =>
                        voice.lang
                            .toLowerCase()
                            .startsWith("ru-ru")
                ) ||
                russianVoices[0];

            const utterance =
                new SpeechSynthesisUtterance(
                    text
                );

            utterance.lang =
                "ru-RU";

            utterance.rate =
                0.92;

            utterance.pitch =
                0.72;

            utterance.volume =
                1;

            if (preferredVoice) {

                utterance.voice =
                    preferredVoice;

                console.log(
                    "Резервный голос:",
                    preferredVoice.name
                );
            }

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
                        "Ошибка системного голоса:",
                        event
                    );

                    statusText.textContent =
                        "Ошибка воспроизведения голоса, сэр.";
                };

            window.speechSynthesis.speak(
                utterance
            );
        };

        const voices =
            window.speechSynthesis
                .getVoices();

        if (voices.length > 0) {

            speakNow();

        } else {

            window.speechSynthesis.onvoiceschanged =
                function () {

                    window.speechSynthesis
                        .onvoiceschanged =
                        null;

                    speakNow();
                };
        }

    } catch (error) {

        console.error(
            "Ошибка резервного голоса:",
            error
        );
    }
}

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ ГОЛОСА
// ============================================================

async function speak(text) {

    if (!text) {
        return;
    }

    // Сначала пробуем новый AI-голос
    const aiVoiceWorked =
        await speakWithAI(text);

    // Если AI TTS не сработал —
    // возвращаем старый рабочий голос
    if (!aiVoiceWorked) {

        console.log(
            "AI Voice недоступен → резервный голос"
        );

        speakWithBrowser(text);
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

                <strong>
                    Вы:
                </strong>

                ${escapeHTML(text)}

            </div>

            <div class="jarvis-message">

                <strong>
                    JARVIS:
                </strong>

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
        // НОВЫЙ AI-ГОЛОС
        // ====================================================

        await speak(
            data.answer
        );

    } catch (error) {

        console.error(
            "Ошибка JARVIS:",
            error
        );

        conversation.innerHTML += `

            <div class="jarvis-message">

                <strong>
                    JARVIS:
                </strong>

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

        // Останавливаем предыдущий AI-голос
        if (currentAudio) {

            try {

                currentAudio.pause();

            } catch (error) {

                console.log(
                    "Ошибка остановки аудио:",
                    error
                );
            }

            currentAudio = null;
        }

        // Останавливаем системную речь
        if (
            "speechSynthesis" in window
        ) {

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

                    <strong>
                        Вы:
                    </strong>

                    ${escapeHTML(text)}

                </div>

                <div class="jarvis-message">

                    <strong>
                        JARVIS:
                    </strong>

                    Обрабатываю запрос, сэр...

                </div>

            `;

            statusText.textContent =
                "Отправляю запрос, сэр...";

            await askJarvis(text);
        };

    // ========================================================
    // ОШИБКА
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
// AUDIO UNLOCK
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
