# MissionCIT Event Timer

A web-based event timer application that allows proctors to create and manage multiple timers that can be accessed by candidates using a 6-digit code. Perfect for managing timed events, exams, and training sessions.

## Features

- Multiple proctor support
- Unique 6-digit session codes for each event
- Real-time timer synchronization between proctor and candidates
- Multiple timer support with individual controls
- Visual and audio alerts for time thresholds
- Auto-start next timer option
- Sound controls for both proctor and candidate views
- MissionCIT branding and professional interface

## Local Setup

1. Install Python requirements:
```bash
pip install -r requirements.txt
```

2. Run the application locally:
```bash
python app.py
```

3. Access the application:
   - Main interface: http://localhost:5000/
   - Proctor interface: http://localhost:5000/proctor
   - Candidate interface: http://localhost:5000/candidate

## Web Server Deployment

### Option 1: PythonAnywhere (Recommended for Quick Setup)

1. Create a PythonAnywhere account at www.pythonanywhere.com

2. Upload your files:
   - Use the Files tab to upload your project files
   - Or use Git to clone your repository

3. Set up a virtual environment:
```bash
mkvirtualenv --python=/usr/bin/python3.8 missioncit
pip install -r requirements.txt
```

4. Configure the web app:
   - Go to the Web tab
   - Add a new web app
   - Choose Flask
   - Set the working directory to your project folder
   - Update WSGI file with:
   ```python
   import sys
   path = '/home/yourusername/missioncit-timer'
   if path not in sys.path:
       sys.path.append(path)
   
   from app import app as application
   ```

### Option 2: Heroku Deployment

1. Install Heroku CLI and create an account

2. Create Procfile in your project root:
```
web: gunicorn app:app
```

3. Add gunicorn to requirements.txt:
```bash
pip install gunicorn
pip freeze > requirements.txt
```

4. Deploy to Heroku:
```bash
heroku login
heroku create missioncit-timer
git push heroku main
```

### Option 3: DigitalOcean Droplet

1. Create a DigitalOcean account and create a new Droplet

2. SSH into your Droplet:
```bash
ssh root@your_droplet_ip
```

3. Install required packages:
```bash
apt update
apt install python3-pip python3-venv nginx
```

4. Clone your repository and set up the environment:
```bash
git clone <your-repo>
cd missioncit-timer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

5. Configure Nginx:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

6. Set up systemd service:
```ini
[Unit]
Description=MissionCIT Timer
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/missioncit-timer
Environment="PATH=/path/to/missioncit-timer/venv/bin"
ExecStart=/path/to/missioncit-timer/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app

[Install]
WantedBy=multi-user.target
```

## Usage

### For Proctors:
1. Access the proctor interface
2. Click "Create New Session" to get a 6-digit code
3. Set up your timers with labels and durations
4. Share the 6-digit code with candidates
5. Control timers as needed

### For Candidates:
1. Access the candidate interface
2. Enter the 6-digit code provided by the proctor
3. View the current timer status
4. Receive visual and audio alerts for time notifications

## Security Notes

- Ensure SSL/HTTPS is enabled in production
- Keep your `SECRET_KEY` secure and different from development
- Consider implementing rate limiting for session creation
- Monitor server logs for unusual activity

## Support

For support or feature requests, please contact the MissionCIT team.

## License

 2024 MissionCIT. All rights reserved.
