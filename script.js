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
// ВЫБРАННЫЙ ГОЛОС JARVIS
// ============================================================

let availableVoices = [];
let selectedVoice = null;

const SAVED_VOICE_NAME =
    "jarvis_selected_voice_name";

const SAVED_VOICE_LANG =
    "jarvis_selected_voice_lang";

// ============================================================
// ЗАГРУЗКА СОХРАНЁННОГО ГОЛОСА
// ============================================================

function loadSavedVoice() {

    const savedName =
        localStorage.getItem(
            SAVED_VOICE_NAME
        );

    const savedLang =
        localStorage.getItem(
            SAVED_VOICE_LANG
        );

    if (!savedName) {
        return;
    }

    const voice =
        availableVoices.find(
            function (item) {

                return (
                    item.name === savedName &&
                    item.lang === savedLang
                );
            }
        );

    if (voice) {

        selectedVoice = voice;

        console.log(
            "Сохранённый голос JARVIS:",
            voice.name,
            voice.lang
        );
    }
}

// ============================================================
// ВЫБОР ГОЛОСА
// ============================================================

function selectJarvisVoice(index) {

    const voice =
        availableVoices[index];

    if (!voice) {
        return;
    }

    selectedVoice =
        voice;

    localStorage.setItem(
        SAVED_VOICE_NAME,
        voice.name
    );

    localStorage.setItem(
        SAVED_VOICE_LANG,
        voice.lang
    );

    console.log(
        "Выбран голос JARVIS:",
        voice.name,
        voice.lang
    );

    updateVoiceButtons();

    statusText.textContent =
        "Голос JARVIS выбран: " +
        voice.name;

    // Небольшое подтверждение новым голосом
    speak(
        "Голос выбран, сэр."
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

        setTimeout(
            function () {

                const utterance =
                    new SpeechSynthesisUtterance(text);

                // ====================================================
                // ЕСЛИ ПОЛЬЗОВАТЕЛЬ ВЫБРАЛ ГОЛОС
                // ИСПОЛЬЗУЕМ ИМЕННО ЕГО
                // ====================================================

                if (selectedVoice) {

                    utterance.voice =
                        selectedVoice;

                    utterance.lang =
                        selectedVoice.lang;

                } else {

                    utterance.lang =
                        "ru-RU";
                }

                utterance.rate =
                    0.85;

                utterance.pitch =
                    0.8;

                utterance.volume =
                    1;

                utterance.onstart =
                    function () {

                        console.log(
                            "JARVIS говорит:",
                            selectedVoice
                                ? selectedVoice.name
                                : "системный голос"
                        );

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
                            "Ошибка синтеза:",
                            event
                        );

                        statusText.textContent =
                            "Ошибка воспроизведения голоса, сэр.";
                    };

                window.speechSynthesis.speak(
                    utterance
                );

            },
            100
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
        // ГОВОРИМ ОТВЕТ ВЫБРАННЫМ ГОЛОСОМ
        // ====================================================

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
                "Отправляю запрос, сэр...";

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

// ============================================================
// КНОПКИ ГОЛОСОВ
// ============================================================

function updateVoiceButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-jarvis-voice-index]"
        );

    buttons.forEach(
        function (button) {

            const index =
                Number(
                    button.dataset.jarvisVoiceIndex
                );

            const voice =
                availableVoices[index];

            if (!voice) {
                return;
            }

            const isSelected =
                selectedVoice &&
                selectedVoice.name ===
                    voice.name &&
                selectedVoice.lang ===
                    voice.lang;

            button.textContent =
                isSelected
                    ? "✓ Выбран"
                    : "Выбрать";

            button.style.background =
                isSelected
                    ? "rgba(0, 200, 100, 0.35)"
                    : "rgba(0, 100, 130, 0.15)";
        }
    );
}

// ============================================================
// ТЕСТ ГОЛОСА
// ============================================================

function testVoice(index) {

    const voice =
        availableVoices[index];

    if (!voice) {
        return;
    }

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

    window.speechSynthesis.speak(
        utterance
    );
}

// ============================================================
// СОЗДАНИЕ СПИСКА ГОЛОСОВ
// ============================================================

function showAvailableVoices() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    const voices =
        window.speechSynthesis.getVoices();

    if (!voices.length) {
        return;
    }

    availableVoices =
        voices;

    loadSavedVoice();

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
            max-width: 650px;
            background: rgba(0, 15, 25, 0.96);
            border: 1px solid rgba(0, 220, 255, 0.35);
            border-radius: 16px;
            color: #dffaff;
            font-family: Arial, sans-serif;
            font-size: 13px;
            text-align: left;
            box-shadow: 0 0 25px rgba(0, 200, 255, 0.12);
        `;

        document.body.appendChild(
            box
        );
    }

    box.innerHTML = "";

    const title =
        document.createElement("div");

    title.textContent =
        "🎙️ ГОЛОС JARVIS";

    title.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 8px;
    `;

    box.appendChild(
        title
    );

    const info =
        document.createElement("div");

    info.textContent =
        "Выберите голос. Он будет использоваться для всех ответов JARVIS.";

    info.style.cssText = `
        opacity: 0.7;
        margin-bottom: 15px;
        line-height: 1.5;
    `;

    box.appendChild(
        info
    );

    voices.forEach(
        function (voice, index) {

            const row =
                document.createElement("div");

            row.style.cssText = `
                display:flex;
                gap:8px;
                align-items:center;
                margin:7px 0;
            `;

            const testButton =
                document.createElement("button");

            testButton.type =
                "button";

            testButton.textContent =
                "🔊 " +
                voice.name +
                " — " +
                voice.lang;

            testButton.style.cssText = `
                flex:1;
                min-width:0;
                padding:11px;
                border-radius:10px;
                border:1px solid rgba(0,220,255,0.25);
                background:rgba(0,100,130,0.15);
                color:#ffffff;
                text-align:left;
                font-size:13px;
            `;

            testButton.addEventListener(
                "click",
                function () {

                    testVoice(index);
                }
            );

            const selectButton =
                document.createElement("button");

            selectButton.type =
                "button";

            selectButton.dataset.jarvisVoiceIndex =
                index;

            selectButton.textContent =
                "Выбрать";

            selectButton.style.cssText = `
                flex:0 0 auto;
                min-width:90px;
                padding:10px 8px;
                border-radius:10px;
                border:1px solid rgba(0,220,255,0.3);
                background:rgba(0,100,130,0.15);
                color:#ffffff;
                font-size:12px;
            `;

            selectButton.addEventListener(
                "click",
                function () {

                    selectJarvisVoice(
                        index
                    );
                }
            );

            row.appendChild(
                testButton
            );

            row.appendChild(
                selectButton
            );

            box.appendChild(
                row
            );
        }
    );

    updateVoiceButtons();
}

// ============================================================
// ЗАГРУЗКА ГОЛОСОВ
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
