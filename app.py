from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import string
import json
from datetime import datetime
import socket
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure SocketIO for PythonAnywhere
socketio = SocketIO(app, 
                   cors_allowed_origins='*',
                   logger=True, 
                   engineio_logger=True,
                   async_mode='gevent',
                   ping_timeout=60,
                   ping_interval=25,
                   transports=['websocket', 'polling'])

# Enable CORS for all routes
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Enable CORS in production with specific origins
if os.environ.get('FLASK_ENV') == 'production':
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": [
        "https://yourdomain.com",  # Replace with your domain
        "https://www.yourdomain.com"
    ]}})

# Store active exam sessions
exam_sessions = {}
# Store proctor connections
proctor_sessions = {}

def generate_session_code():
    """Generate a unique 6-digit session code"""
    while True:
        code = ''.join(random.choices(string.digits, k=6))
        if code not in exam_sessions:
            return code

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/proctor')
def proctor():
    return render_template('proctor.html')

@app.route('/candidate')
def candidate_entry():
    return render_template('candidate_entry.html')

@app.route('/join', methods=['POST'])
def join():
    session_code = request.form.get('session_code')
    if session_code in exam_sessions:
        return redirect(url_for('candidate_view', session_code=session_code))
    return redirect(url_for('candidate_entry', error='Invalid session code'))

@app.route('/candidate/<session_code>')
def candidate_view(session_code):
    if session_code in exam_sessions:
        return render_template('candidate.html', session_code=session_code)
    return redirect(url_for('candidate_entry', error='Invalid session code'))

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('connect_response', {'status': 'connected'})

@socketio.on('create_session')
def on_create_session(data):
    """Proctor creates a new exam session"""
    try:
        # Check if proctor already has a session
        proctor_id = request.sid
        if proctor_id in proctor_sessions:
            old_session = proctor_sessions[proctor_id]
            if old_session in exam_sessions:
                del exam_sessions[old_session]
            del proctor_sessions[proctor_id]
        
        # Create new session
        session_code = generate_session_code()
        print(f"Creating session {session_code} for proctor {proctor_id}")
        
        exam_sessions[session_code] = {
            'proctor_id': proctor_id,
            'timers': data.get('timers', []),
            'candidates': set()
        }
        proctor_sessions[proctor_id] = session_code
        join_room(session_code)
        emit('session_created', {'session_code': session_code})
    except Exception as e:
        print(f"Error creating session: {str(e)}")
        emit('session_error', {'message': 'Failed to create session'})

@socketio.on('join_session')
def on_join_session(data):
    """Candidate joins an exam session"""
    session_code = data['session_code']
    print(f"Client {request.sid} attempting to join session {session_code}")
    if session_code in exam_sessions:
        join_room(session_code)
        exam_sessions[session_code]['candidates'].add(request.sid)
        print(f"Client {request.sid} joined session {session_code}")
        emit('session_joined', {'status': 'success'}, room=request.sid)
        emit('candidate_joined', {'count': len(exam_sessions[session_code]['candidates'])}, 
             room=session_code)
    else:
        print(f"Invalid session code attempt: {session_code}")
        emit('session_joined', {'status': 'error', 'message': 'Invalid session code'}, 
             room=request.sid)

@socketio.on('timer_update')
def on_timer_update(data):
    """Proctor updates timer state"""
    proctor_id = request.sid
    if proctor_id in proctor_sessions:
        session_code = proctor_sessions[proctor_id]
        print(f"Timer update in session {session_code}: {data}")
        emit('timer_state', data, room=session_code)

@socketio.on('disconnect')
def on_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    print(f"Client disconnected: {sid}")
    # Handle proctor disconnect
    if sid in proctor_sessions:
        session_code = proctor_sessions[sid]
        if session_code in exam_sessions:
            # Notify all candidates in the session
            emit('proctor_disconnected', room=session_code)
            del exam_sessions[session_code]
        del proctor_sessions[sid]
    
    # Handle candidate disconnect
    for session_code, session in exam_sessions.items():
        if sid in session['candidates']:
            session['candidates'].remove(sid)
            emit('candidate_left', 
                 {'count': len(session['candidates'])}, 
                 room=session_code)
            break

def get_network_interfaces():
    interfaces = []
    try:
        # Get all network interfaces
        for iface in socket.getaddrinfo(socket.gethostname(), None):
            ip = iface[4][0]
            # Only include IPv4 addresses and exclude localhost
            if ':' not in ip and ip != '127.0.0.1':
                interfaces.append(ip)
    except:
        pass
    return interfaces

if __name__ == '__main__':
    print("\nStarting Timer Application...")
    try:
        interfaces = get_network_interfaces()
        print("\nAvailable Network Interfaces:")
        for i, ip in enumerate(interfaces, 1):
            print(f"{i}. http://{ip}:5000")
        
        print("\nTry each of these URLs on your tablet until you find the one that works.")
        print("Make sure your tablet is connected to VLAN 20.")
        print("\nIf none work, you might need to:")
        print("1. Check if Windows Firewall is blocking port 5000")
        print("2. Verify the tablet is on the same VLAN (20)")
        print("3. Try accessing the site using your computer's IP address from VLAN 20\n")
        
        socketio.run(
            app,
            host='0.0.0.0',  # Listen on all available network interfaces
            port=5000,
            debug=True,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        print(f"\nError starting server: {e}")
        print("Please check if port 5000 is already in use or if you need administrator privileges.")
