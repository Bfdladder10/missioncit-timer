let socket;
let soundActivated = false;

document.addEventListener('DOMContentLoaded', () => {
    // Get session code from URL
    const pathParts = window.location.pathname.split('/');
    const sessionCode = pathParts[pathParts.length - 1];

    // Connect to Socket.IO server with explicit configuration
    socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').classList.add('connected');
        
        // Join the session
        socket.emit('join_session', { session_code: sessionCode });
    });

    socket.on('connect_error', (error) => {
        console.log('Connection error:', error);
        document.getElementById('connectionStatus').textContent = 'Connection Error';
        document.getElementById('connectionStatus').classList.add('disconnected');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        document.getElementById('connectionStatus').textContent = 'Disconnected';
        document.getElementById('connectionStatus').classList.remove('connected');
        document.getElementById('connectionStatus').classList.add('disconnected');
    });

    socket.on('session_joined', (data) => {
        console.log('Session joined response:', data);
        if (data.status === 'error') {
            document.getElementById('connectionStatus').textContent = data.message;
            document.getElementById('connectionStatus').classList.add('disconnected');
        }
    });

    socket.on('timer_state', (data) => {
        console.log('Timer state update:', data);
        updateDisplay(data);
    });

    socket.on('proctor_disconnected', () => {
        console.log('Proctor disconnected');
        document.getElementById('connectionStatus').textContent = 'Proctor Disconnected';
        document.getElementById('connectionStatus').classList.add('disconnected');
        document.getElementById('timerDisplay').textContent = '00:00';
        document.getElementById('timerLabel').textContent = '';
    });

    // Sound activation button
    const activateButton = document.getElementById('activateSound');
    activateButton.addEventListener('click', () => {
        // Play a silent audio to activate audio context
        const audio = document.getElementById('alarmSound');
        audio.volume = 0;
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1;
            soundActivated = true;
            activateButton.style.display = 'none';

            // Play a short test sound at 30% volume
            audio.volume = 0.3;
            audio.play().then(() => {
                setTimeout(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1.0;
                }, 500);
            });
        }).catch((error) => {
            console.log('Error activating audio:', error);
        });
    });
});

function updateDisplay(data) {
    const display = document.getElementById('timerDisplay');
    const label = document.getElementById('timerLabel');
    
    // Update timer display
    const minutes = Math.floor(data.timeLeft / 60);
    const seconds = data.timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update label
    label.textContent = data.label;

    // Update color based on thresholds
    display.classList.remove('timer-yellow', 'timer-red');
    if (data.timeLeft <= data.redThreshold) {
        display.classList.add('timer-red');
        if (soundActivated && data.timeLeft === 0) {
            playAlarm();
        }
    } else if (data.timeLeft <= data.yellowThreshold) {
        display.classList.add('timer-yellow');
    }
}

function playAlarm() {
    const audio = document.getElementById('alarmSound');
    if (audio && soundActivated) {
        audio.currentTime = 0;
        audio.play();
    }
}
