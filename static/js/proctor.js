let socket;
let timers = [];
let currentSessionCode = null;

function initializeTimers() {
    // Connect to Socket.IO server
    socket = io();

    // Socket event handlers
    socket.on('connect', () => {
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').classList.add('connected');
    });

    socket.on('disconnect', () => {
        document.getElementById('connectionStatus').textContent = 'Disconnected';
        document.getElementById('connectionStatus').classList.remove('connected');
        document.getElementById('connectionStatus').classList.add('disconnected');
    });

    socket.on('session_created', (data) => {
        currentSessionCode = data.session_code;
        document.getElementById('sessionCode').textContent = currentSessionCode;
        document.getElementById('candidateUrl').textContent = window.location.origin + '/join';
        document.getElementById('sessionInfo').style.display = 'block';
    });

    socket.on('candidate_joined', (data) => {
        document.getElementById('connectionCount').textContent = data.count;
    });

    socket.on('candidate_left', (data) => {
        document.getElementById('connectionCount').textContent = data.count;
    });

    socket.on('session_error', (data) => {
        alert('Error creating session: ' + data.message);
        document.getElementById('createNewSession').disabled = false;
    });

    // Event listeners
    document.getElementById('addTimer').addEventListener('click', addTimer);
    document.getElementById('resetAll').addEventListener('click', resetAllTimers);
    document.getElementById('createNewSession').addEventListener('click', createSession);
    document.getElementById('testSound').addEventListener('click', testSound);

    // Add initial timer
    addTimer();
}

function createSession() {
    // Disable the button to prevent multiple clicks
    const createButton = document.getElementById('createNewSession');
    createButton.disabled = true;
    
    const timerData = timers.map(timer => ({
        label: timer.labelInput.value,
        minutes: parseInt(timer.minutesInput.value) || 0,
        seconds: parseInt(timer.secondsInput.value) || 0,
        yellowThreshold: parseInt(timer.yellowThresholdInput.value) || 30,
        redThreshold: parseInt(timer.redThresholdInput.value) || 10
    }));

    socket.emit('create_session', { timers: timerData });
    
    // Re-enable the button after 2 seconds
    setTimeout(() => {
        createButton.disabled = false;
    }, 2000);
}

function addTimer() {
    const template = document.getElementById('timer-card-template');
    const timerCard = template.content.cloneNode(true);
    const container = document.getElementById('timerContainer');
    
    const timer = {
        element: timerCard.querySelector('.timer-card'),
        display: timerCard.querySelector('.timer-display'),
        labelInput: timerCard.querySelector('.timer-label'),
        minutesInput: timerCard.querySelector('.timer-minutes'),
        secondsInput: timerCard.querySelector('.timer-seconds'),
        yellowThresholdInput: timerCard.querySelector('.yellow-threshold'),
        redThresholdInput: timerCard.querySelector('.red-threshold'),
        startButton: timerCard.querySelector('.start-individual'),
        pauseButton: timerCard.querySelector('.pause-individual'),
        resetButton: timerCard.querySelector('.reset-individual'),
        removeButton: timerCard.querySelector('.remove-timer'),
        timeLeft: 0,
        originalTime: 0,
        interval: null,
        isRunning: false
    };

    // Event listeners
    timer.startButton.addEventListener('click', () => startTimer(timer));
    timer.pauseButton.addEventListener('click', () => pauseTimer(timer));
    timer.resetButton.addEventListener('click', () => resetTimer(timer));
    timer.removeButton.addEventListener('click', () => removeTimer(timer));

    // Input event listeners
    timer.minutesInput.addEventListener('change', () => updateTimerDisplay(timer));
    timer.secondsInput.addEventListener('change', () => updateTimerDisplay(timer));

    timers.push(timer);
    container.appendChild(timer.element);
    updateTimerDisplay(timer);
}

function startTimer(timer) {
    if (!timer.isRunning) {
        if (timer.timeLeft === 0) {
            const minutes = parseInt(timer.minutesInput.value) || 0;
            const seconds = parseInt(timer.secondsInput.value) || 0;
            timer.timeLeft = minutes * 60 + seconds;
            timer.originalTime = timer.timeLeft;
        }

        timer.isRunning = true;
        timer.startButton.disabled = true;
        timer.pauseButton.disabled = false;

        timer.interval = setInterval(() => {
            timer.timeLeft--;
            updateTimerDisplay(timer);
            
            if (currentSessionCode) {
                socket.emit('timer_update', {
                    label: timer.labelInput.value,
                    timeLeft: timer.timeLeft,
                    originalTime: timer.originalTime,
                    yellowThreshold: parseInt(timer.yellowThresholdInput.value),
                    redThreshold: parseInt(timer.redThresholdInput.value)
                });
            }

            if (timer.timeLeft <= 0) {
                clearInterval(timer.interval);
                timer.isRunning = false;
                timer.startButton.disabled = false;
                timer.pauseButton.disabled = true;
                playAlarm();

                if (document.getElementById('autoStartNext').checked) {
                    startNextTimer(timer);
                }
            }
        }, 1000);
    }
}

function pauseTimer(timer) {
    if (timer.isRunning) {
        clearInterval(timer.interval);
        timer.isRunning = false;
        timer.startButton.disabled = false;
        timer.pauseButton.disabled = true;
    }
}

function resetTimer(timer) {
    clearInterval(timer.interval);
    timer.isRunning = false;
    timer.timeLeft = 0;
    timer.startButton.disabled = false;
    timer.pauseButton.disabled = true;
    updateTimerDisplay(timer);

    if (currentSessionCode) {
        socket.emit('timer_update', {
            label: timer.labelInput.value,
            timeLeft: 0,
            originalTime: 0,
            yellowThreshold: parseInt(timer.yellowThresholdInput.value),
            redThreshold: parseInt(timer.redThresholdInput.value)
        });
    }
}

function removeTimer(timer) {
    const index = timers.indexOf(timer);
    if (index > -1) {
        if (timer.isRunning) {
            clearInterval(timer.interval);
        }
        timers.splice(index, 1);
        timer.element.remove();
    }
}

function resetAllTimers() {
    timers.forEach(timer => resetTimer(timer));
}

function updateTimerDisplay(timer) {
    const timeToShow = timer.timeLeft || 0;
    const minutes = Math.floor(timeToShow / 60);
    const seconds = timeToShow % 60;
    timer.display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update color based on thresholds
    const yellowThreshold = parseInt(timer.yellowThresholdInput.value) || 30;
    const redThreshold = parseInt(timer.redThresholdInput.value) || 10;

    timer.display.classList.remove('timer-yellow', 'timer-red');
    if (timeToShow <= redThreshold) {
        timer.display.classList.add('timer-red');
    } else if (timeToShow <= yellowThreshold) {
        timer.display.classList.add('timer-yellow');
    }
}

function startNextTimer(currentTimer) {
    const currentIndex = timers.indexOf(currentTimer);
    if (currentIndex < timers.length - 1) {
        const nextTimer = timers[currentIndex + 1];
        startTimer(nextTimer);
    }
}

function playAlarm() {
    if (document.getElementById('soundEnabled').checked) {
        const audio = document.getElementById('alarmSound');
        audio.currentTime = 0;
        audio.play();
    }
}

function testSound() {
    playAlarm();
}
