# RTTM Label Tool

A simple web-based tool for labeling and adjusting RTTM (Rich Transcription Time Marked) files with corresponding audio.

## Features

- Load RTTM files from `combined_dataset/rttm` (supports subdirectories)
- Filter RTTM files by category (subdirectory)
- Play audio segments from the corresponding audio files in `combined_dataset/preprocessed` (supports matching subdirectory structure)
- Edit segment start time, duration, and speaker ID
- Save edited labels to `combined_dataset/labels_diarization` (preserving the original directory structure)
- Automatically merge consecutive segments with the same speaker when the gap is ≤ 0.5 seconds

## Directory Structure

The tool supports the following directory structure:

```
combined_dataset/
├── rttm/
│   ├── ThongTinChinhPhu/
│   │   └── *.rttm files
│   ├── baodanang_audio/
│   │   └── *.rttm files
│   └── baoquangnam_audio/
│       └── *.rttm files
│
├── preprocessed/
│   ├── ThongTinChinhPhu/
│   │   └── *.wav files
│   ├── baodanang_audio/
│   │   └── *.wav files
│   └── baoquangnam_audio/
│       └── *.wav files
│
└── labels_diarization/
    ├── ThongTinChinhPhu/
    │   └── labeled files
    ├── baodanang_audio/
    │   └── labeled files
    └── baoquangnam_audio/
        └── labeled files
```

## Setup and Usage

### On Linux/macOS:

1. Navigate to the label_tool directory:
   ```bash
   cd /label_tool
   ```

2. Run the application:
   ```bash
   ./run.sh
   ```

### On Windows:

1. Navigate to the label_tool directory:
   ```cmd
   cd \label_tool
   ```

2. Run the application:
   ```cmd
   run.bat
   ```

   Or alternatively, run directly with Python:
   ```cmd
   python app.py
   ```

### Prerequisites

Install required dependencies (if not already installed):
```bash
pip install flask soundfile numpy librosa
```

### Access the Application

Open a web browser and go to:
   ```
   http://127.0.0.1:5000
   ```

5. Use the interface to:
   - Select an RTTM file from the dropdown
   - Click "Load File" to display segments
   - Click on any segment to edit it
   - Use the play button to hear the segment
   - Adjust the start time, duration, or speaker ID
   - Click "Update Segment" to save changes
   - Click "Save All Labels" to save all segments to the labels directory

## Directory Structure

- `combined_dataset/rttm`: Contains original RTTM files
- `combined_dataset/preprocessed`: Contains corresponding audio files
- `combined_dataset/labels`: Output directory for edited labels
- `label_tool/static/temp`: Temporary directory for audio segments

## Notes

- Make sure the audio files and RTTM files have matching names (except for the file extension)
- The tool automatically creates necessary directories if they don't exist
- **Windows Compatibility**: The tool now properly handles Windows path separators (backslashes) and includes a `run.bat` file for Windows users
- Path configuration supports both Windows (e.g., `C:\path\to\files`) and Unix-style paths (e.g., `/path/to/files`)

## Cross-Platform Compatibility

This tool has been updated to work seamlessly on both Unix-like systems (Linux, macOS) and Windows:

- **Path handling**: Automatically uses the correct path separators for your operating system
- **File browser**: Adapts to Windows drive letters (C:\, D:\, etc.) or Unix root (/) 
- **Startup scripts**: Use `run.sh` on Linux/macOS or `run.bat` on Windows
