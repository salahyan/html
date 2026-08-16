const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

// ================================
// ПРОВЕРКА РАСПОЗНАВАНИЯ РЕЧИ
// ================================

if (!SpeechRecognition) {

    statusText.textContent =
        "Распознавание речи не поддерживается этим браузером.";

    micButton.disabled = true;

} else {

    recognition = new SpeechRecognition();

    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;

    // ================================
    // НАЖАТИЕ НА МИКРОФОН
    // ================================

    micButton.addEventListener("click", function () {

        if (isListening) {
            return;
        }

        try {

            recognition.start();

        } catch (error) {

            console.log("Ошибка запуска:", error);

        }

    });

    // ================================
    // НАЧАЛО ПРОСЛУШИВАНИЯ
    // ================================

    recognition.onstart = function () {

        isListening = true;

        micButton.classList.add("listening");

        statusText.textContent =
            "Слушаю вас, сэр...";
    };

    // ================================
    // ПОЛУЧЕНИЕ РЕЧИ
    // ================================

    recognition.onresult = function (event) {

        const text =
            event.results[0][0].transcript.trim();

        conversation.innerHTML = `
            <div class="user-message">
                <strong>Вы:</strong>

                ${escapeHTML(text)}
            </div>

            <div class="jarvis-message">
                <strong>JARVIS:</strong>

                Я вас услышал, сэр.
            </div>
        `;

        statusText.textContent =
            "Готов к дальнейшим указаниям, сэр.";

        // Говорим ответ
        speak("Я вас услышал, сэр.");
    };

    // ================================
    // ОШИБКА РАСПОЗНАВАНИЯ
    // ================================

    recognition.onerror = function (event) {

        console.log(
            "Ошибка распознавания:",
            event.error
        );

        isListening = false;

        micButton.classList.remove("listening");

        if (event.error === "not-allowed") {

            statusText.textContent =
                "Разрешите доступ к микрофону, сэр.";

        } else if (event.error === "no-speech") {

            statusText.textContent =
                "Я не услышал вас, сэр.";

        } else {

            statusText.textContent =
                "Не удалось распознать речь.";
        }
    };

    // ================================
    // ОКОНЧАНИЕ ПРОСЛУШИВАНИЯ
    // ================================

    recognition.onend = function () {

        isListening = false;

        micButton.classList.remove("listening");
    };
}

// ================================
// ГОЛОС JARVIS
// ================================

function speak(text) {

    if (!("speechSynthesis" in window)) {

        statusText.textContent =
            "Синтез речи недоступен.";

        return;
    }

    // Останавливаем предыдущую речь

    window.speechSynthesis.cancel();

    // Небольшая задержка особенно полезна
    // для Safari на iPhone

    setTimeout(function () {

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
                "Ошибка синтеза речи:",event
            );

            statusText.textContent =
                "Не удалось воспроизвести голос.";
        };

        window.speechSynthesis.speak(
            utterance
        );

    }, 150);
}

// ================================
// ЗАЩИТА HTML
// ================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}
