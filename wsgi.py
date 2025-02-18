import sys
import os

# Add your project directory to Python path
path = '/home/MissionCIT/missioncit-timer'
if path not in sys.path:
    sys.path.append(path)

from app import app as application

if __name__ == "__main__":
    application.run()
