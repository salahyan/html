const micButton = document.getElementById("micButton");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (!SpeechRecognition) {

    statusText.textContent =
        "Распознавание речи не поддерживается этим браузером.";

    micButton.disabled = true;

} else {

    recognition = new SpeechRecognition();

    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;

    micButton.addEventListener("click", startListening);

    recognition.onstart = function () {

        statusText.textContent =
            "Слушаю вас, сэр...";

        micButton.classList.add("listening");
    };

    recognition.onresult = function (event) {

        const text =
            event.results[0][0].transcript;

        conversation.innerHTML =
            `
            <div class="user-message">
                <strong>Вы:</strong>

                ${escapeHTML(text)}
            </div>

            <div class="jarvis-message">
                <strong>JARVIS:</strong>

                Я услышал вас, сэр.
            </div>
            `;

        statusText.textContent =
            "Готов продолжать, сэр.";

        speak(
            "Я услышал вас, сэр."
        );
    };

    recognition.onerror = function (event) {

        console.log(
            "SpeechRecognition error:",
            event.error
        );

        statusText.textContent =
            "Не удалось распознать речь.";

        micButton.classList.remove("listening");
    };

    recognition.onend = function () {

        micButton.classList.remove("listening");
    };
}

function startListening() {

    if (!recognition) {
        return;
    }

    try {

        recognition.start();

    } catch (error) {

        console.log(error);

    }
}

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const voice =
        new SpeechSynthesisUtterance(text);

    voice.lang = "ru-RU";
    voice.rate = 0.9;
    voice.pitch = 0.8;
    voice.volume = 1;

    window.speechSynthesis.speak(voice);
}

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}
