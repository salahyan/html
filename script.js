const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let speechUnlocked = false;

// ========================================
// РАЗБЛОКИРОВКА SPEECH SYNTHESIS
// ========================================

function unlockSpeech() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    try {

        window.speechSynthesis.cancel();

        const unlock = new SpeechSynthesisUtterance("");

        unlock.volume = 0;
        unlock.rate = 10;

        window.speechSynthesis.speak(unlock);

        speechUnlocked = true;

        console.log("Speech synthesis unlocked");

    } catch (error) {

        console.log(
            "Ошибка разблокировки речи:",
            error
        );
    }
}

// ========================================
// ГОЛОС JARVIS
// ========================================

function speak(text) {

    if (!("speechSynthesis" in window)) {

        statusText.textContent =
            "Синтез речи недоступен.";

        return;
    }

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang = "ru-RU";
    utterance.rate = 0.9;
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

        console.log(
            "Speech synthesis error:",
            event
        );

        statusText.textContent =
            "Не удалось воспроизвести голос.";

    };

    window.speechSynthesis.speak(
        utterance
    );
}

// ========================================
// РАСПОЗНАВАНИЕ РЕЧИ
// ========================================

if (!SpeechRecognition) {

    statusText.textContent =
        "Распознавание речи не поддерживается этим браузером.";

    micButton.disabled = true;

} else {

    recognition =
        new SpeechRecognition();

    recognition.lang = "ru-RU";

    recognition.continuous = false;

    recognition.interimResults = false;

    // ====================================
    // КНОПКА МИКРОФОНА
    // ====================================

    micButton.addEventListener(
        "click",
        function () {

            if (isListening) {
                return;
            }

            // Очень важно:
            // вызываем speechSynthesis
            // непосредственно после нажатия

            if (!speechUnlocked) {

                unlockSpeech();

            }

            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Ошибка запуска:",
                    error
                );

            }

        }
    );

    // ====================================
    // НАЧАЛО ПРОСЛУШИВАНИЯ
    // ====================================

    recognition.onstart = function () {

        isListening = true;

        micButton.classList.add(
            "listening"
        );

        statusText.textContent =
            "Слушаю вас, сэр...";

    };

    // ====================================
    // ПОЛУЧИЛИ РЕЧЬ
    // ====================================

    recognition.onresult =
        function (event) {

            const text =
                event
                    .results[0][0]
                    .transcript
                    .trim();

            conversation.innerHTML = `

                <div class="user-message">

                    <strong>Вы:</strong>

                    ${escapeHTML(text)}

                </div>

                <div class="jarvis-message">

                    <strong>JARVIS:</strong>

                    Я вас услышал, сэр.</div>

            `;

            statusText.textContent =
                "Подготавливаю ответ, сэр...";

            // Небольшая пауза после
            // завершения распознавания

            setTimeout(
                function () {

                    speak(
                        "Я вас услышал, сэр."
                    );

                },
                300
            );

        };

    // ====================================
    // ОШИБКА
    // ====================================

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

            } else {

                statusText.textContent =
                    "Не удалось распознать речь.";

            }

        };

    // ====================================
    // ЗАВЕРШЕНИЕ
    // ====================================

    recognition.onend =
        function () {

            isListening = false;

            micButton.classList.remove(
                "listening"
            );

        };
}

// ========================================
// ЗАЩИТА HTML
// ========================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent = text;

    return div.innerHTML;
}
