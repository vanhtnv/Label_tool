@echo off
REM Navigate to the label tool directory
cd /d "%~dp0"

REM Create necessary directories if they don't exist
if not exist "static\temp" mkdir "static\temp"
if not exist "..\combined_dataset\labels_diarization" mkdir "..\combined_dataset\labels_diarization"

REM Clean up old temporary files (older than 1 day)
forfiles /p "static\temp" /s /m *.wav /d -1 /c "cmd /c del @path" 2>nul

echo ==============================================
echo Starting RTTM Label Tool...
echo Access the tool at: http://localhost:5000
echo Features:
echo - Full audio player to check gaps between segments
echo - Delete segment functionality
echo - Seek to position in full audio
echo - Only one audio plays at a time (segment or full)
echo ==============================================
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the Flask application
python app.py

pause
