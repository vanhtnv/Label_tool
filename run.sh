#!/bin/bash

# Navigate to the label tool directory
cd "$(dirname "$0")"

# Create necessary directories if they don't exist
mkdir -p static/temp
mkdir -p ../combined_dataset/labels_diarization

# Clean up old temporary files
find static/temp -type f -mtime +1 -name "*.wav" -delete

echo "=============================================="
echo "Starting RTTM Label Tool..."
echo "Access the tool at: http://localhost:5000"
echo "Features:"
echo "- Full audio player to check gaps between segments"
echo "- Delete segment functionality"
echo "- Seek to position in full audio"
echo "- Only one audio plays at a time (segment or full)"
echo "- Visual highlight of currently playing audio"
echo "- End time field in editor (auto-calculates with duration)"
echo "- Load from previously saved edits (continue editing)"
echo "- Add new segments functionality"
echo "=============================================="
echo "Press Ctrl+C to stop the server"

# Run the Flask application
python app.py
