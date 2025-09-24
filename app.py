import os
import shutil
import time
import traceback
from flask import Flask, render_template, request, jsonify, send_from_directory, abort, url_for
import soundfile as sf
import numpy as np
import json
import librosa
import glob
from datetime import datetime

app = Flask(__name__)

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_RTTM_DIR = os.path.join(BASE_DIR, "combined_dataset", "rttm")
DEFAULT_AUDIO_DIR = os.path.join(BASE_DIR, "combined_dataset", "preprocessed")
LABELS_DIR = os.path.join(BASE_DIR, "combined_dataset", "labels_diarization")
TEMP_DIR = os.path.join(BASE_DIR, "label_tool", "static", "temp")

# Current paths that can be changed via the UI
RTTM_DIR = DEFAULT_RTTM_DIR
AUDIO_DIR = DEFAULT_AUDIO_DIR

# Create directories if they don't exist
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(LABELS_DIR, exist_ok=True)

# Clean up temporary files
def cleanup_temp_files(older_than_seconds=3600):
    """
    Delete temporary files from TEMP_DIR.
    If older_than_seconds is None, delete all files regardless of age.
    If older_than_seconds is a number, only delete files older than that many seconds.
    """
    try:
        file_count = 0
        current_time = time.time()
        
        if not os.path.exists(TEMP_DIR):
            app.logger.warning(f"Temp directory does not exist: {TEMP_DIR}")
            return
            
        for file in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, file)
            if os.path.isfile(file_path):
                # If older_than_seconds is None, delete all files
                # Otherwise, only delete files older than the specified time
                if older_than_seconds is None or (current_time - os.path.getmtime(file_path)) > older_than_seconds:
                    try:
                        os.remove(file_path)
                        file_count += 1
                        app.logger.debug(f"Deleted temp file: {file_path}")
                    except Exception as e:
                        app.logger.error(f"Error deleting temp file {file_path}: {str(e)}")
        
        app.logger.info(f"Cleaned up {file_count} temporary files from {TEMP_DIR}")
    except Exception as e:
        app.logger.error(f"Error during cleanup of temp files: {str(e)}")
        app.logger.error(traceback.format_exc())

# RTTM format: SPEAKER file_id channel start_time duration <NA> <NA> speaker_id <NA> <NA>
def parse_rttm(rttm_path):
    try:
        raw_segments = []
        with open(rttm_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 8 and parts[0] == "SPEAKER":
                    file_id = parts[1]
                    start_time = float(parts[3])
                    duration = float(parts[4])
                    speaker_id = parts[7]
                    raw_segments.append({
                        'file_id': file_id,
                        'start_time': start_time,
                        'duration': duration,
                        'end_time': start_time + duration,
                        'speaker_id': speaker_id
                    })
        
        # Sort segments by start time
        raw_segments.sort(key=lambda x: x['start_time'])
        
        # Merge consecutive segments with the same speaker if gap <= 0.5s
        merged_segments = []
        if not raw_segments:
            return merged_segments
        
        current_segment = raw_segments[0].copy()
        for i in range(1, len(raw_segments)):
            next_segment = raw_segments[i]
            
            # If same speaker and gap <= 0.5s, merge the segments
            if (next_segment['speaker_id'] == current_segment['speaker_id'] and 
                next_segment['start_time'] - current_segment['end_time'] <= 0.5):
                # Update end time and duration of current segment
                current_segment['end_time'] = next_segment['end_time']
                current_segment['duration'] = current_segment['end_time'] - current_segment['start_time']
            else:
                # Add current segment to merged list and start a new current segment
                merged_segments.append(current_segment)
                current_segment = next_segment.copy()
        
        # Add the last segment
        merged_segments.append(current_segment)
        
        return merged_segments
    except Exception as e:
        app.logger.error(f"Error parsing RTTM file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return []

def write_rttm(segments, output_path, file_id):
    try:
        with open(output_path, 'w') as f:
            for segment in segments:
                # Format: SPEAKER file_id channel start_time duration <NA> <NA> speaker_id <NA> <NA>
                line = f"SPEAKER {file_id} 1 {segment['start_time']:.2f} {segment['duration']:.2f} <NA> <NA> {segment['speaker_id']} <NA> <NA>\n"
                f.write(line)
        return True
    except Exception as e:
        app.logger.error(f"Error writing RTTM file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return False

def extract_audio_segment(audio_path, start_time, duration, output_path):
    try:
        # Load the audio file
        y, sr = librosa.load(audio_path, sr=None, offset=start_time, duration=duration)
        
        # Write the segment to the output path
        sf.write(output_path, y, sr)
        
        return output_path
    except Exception as e:
        app.logger.error(f"Error extracting audio segment: {str(e)}")
        app.logger.error(traceback.format_exc())
        return None

@app.route('/check_saved_edits', methods=['POST'])
def check_saved_edits():
    try:
        rttm_file = request.form.get('rttm_file')
        if not rttm_file:
            return jsonify({'error': 'No RTTM file specified'}), 400
            
        # Get file_id and relative directory structure
        file_id = os.path.basename(rttm_file).replace('.rttm', '')
        rel_dir = os.path.dirname(rttm_file)
        
        # Construct the path to where saved edits would be
        if rel_dir:
            saved_path = os.path.join(LABELS_DIR, rel_dir, file_id, f"{file_id}.rttm")
        else:
            saved_path = os.path.join(LABELS_DIR, file_id, f"{file_id}.rttm")
        
        # Check if saved file exists
        has_saved_edits = os.path.exists(saved_path)
        
        # If it exists, get last modified timestamp
        last_modified = None
        if has_saved_edits:
            timestamp = os.path.getmtime(saved_path)
            last_modified = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'has_saved_edits': has_saved_edits,
            'last_modified': last_modified,
            'saved_path': saved_path if has_saved_edits else None
        })
    except Exception as e:
        app.logger.error(f"Error checking for saved edits: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    try:
        # Clean up old temporary files (older than 1 hour)
        cleanup_temp_files(3600)
        
        # Get list of RTTM files from all subdirectories
        rttm_files = []
        rttm_files_with_category = []
        for root, dirs, files in os.walk(RTTM_DIR):
            for file in files:
                if file.endswith('.rttm'):
                    # Get relative path from RTTM_DIR
                    rel_path = os.path.relpath(os.path.join(root, file), RTTM_DIR)
                    rttm_files.append(rel_path)
                    
                    # Extract category for easier template handling
                    parts = rel_path.split(os.sep)
                    category = parts[0] if len(parts) > 1 else "root"
                    rttm_files_with_category.append({
                        'path': rel_path,
                        'category': category
                    })
        
        # Sort files for better display
        rttm_files.sort()
        rttm_files_with_category.sort(key=lambda x: x['path'])
        
        # Get the categories (subdirectories)
        categories = set()
        for file_info in rttm_files_with_category:
            categories.add(file_info['category'])
        
        categories = sorted(list(categories))
        
        return render_template('index.html', rttm_files=rttm_files, rttm_files_with_category=rttm_files_with_category, 
                              categories=categories, rttm_dir=RTTM_DIR, audio_dir=AUDIO_DIR)
    except Exception as e:
        app.logger.error(f"Error in index route: {str(e)}")
        app.logger.error(traceback.format_exc())
        return render_template('error.html', error=str(e))

@app.route('/get_segment', methods=['POST'])
def get_segment():
    try:
        data = request.json
        file_id = data.get('file_id')
        start_time = data.get('start_time')
        duration = data.get('duration')
        rttm_path = data.get('rttm_path')
        
        if not all([file_id, start_time is not None, duration is not None]):
            return jsonify({'error': 'Missing required parameters'}), 400
            
        # Parse RTTM path to determine audio file location
        if rttm_path:
            rttm_dir = os.path.dirname(rttm_path)
            # Try to find audio file in the same subdirectory structure
            audio_path = os.path.join(AUDIO_DIR, rttm_dir, f"{file_id}.wav")
            
            # If not found, try the root of AUDIO_DIR
            if not os.path.exists(audio_path):
                audio_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
        else:
            # Fall back to directly using file_id
            audio_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
        
        # Check if audio file exists
        if not os.path.exists(audio_path):
            return jsonify({'error': f'Audio file not found at {audio_path}'}), 404
            
        # Create a temporary file for the segment
        temp_filename = f"segment_{file_id}_{start_time:.2f}_{duration:.2f}_{int(time.time())}.wav"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        # Extract the segment
        extract_audio_segment(audio_path, float(start_time), float(duration), temp_path)
        
        # Generate a URL for the segment (always use forward slashes for URLs)
        segment_url = url_for('static', filename=f"temp/{temp_filename}")
        
        return jsonify({'segment_url': segment_url})
    except Exception as e:
        app.logger.error(f"Error getting segment: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/update_paths', methods=['POST'])
def update_paths():
    global RTTM_DIR, AUDIO_DIR
    
    try:
        rttm_dir = request.form.get('rttm_dir')
        audio_dir = request.form.get('audio_dir')
        
        # Validate directories exist
        if not os.path.isdir(rttm_dir):
            return jsonify({'error': f'RTTM directory not found: {rttm_dir}'}), 400
        
        if not os.path.isdir(audio_dir):
            return jsonify({'error': f'Audio directory not found: {audio_dir}'}), 400
            
        # Validate RTTM files exist in the directory
        has_rttm_files = False
        for root, dirs, files in os.walk(rttm_dir):
            for file in files:
                if file.endswith('.rttm'):
                    has_rttm_files = True
                    break
            if has_rttm_files:
                break
        
        if not has_rttm_files:
            return jsonify({'error': f'No RTTM files found in {rttm_dir}'}), 400
        
        # Update global paths
        RTTM_DIR = rttm_dir
        AUDIO_DIR = audio_dir
        
        # Get list of RTTM files from all subdirectories
        rttm_files = []
        for root, dirs, files in os.walk(RTTM_DIR):
            for file in files:
                if file.endswith('.rttm'):
                    # Get relative path from RTTM_DIR
                    rel_path = os.path.relpath(os.path.join(root, file), RTTM_DIR)
                    rttm_files.append(rel_path)
        
        # Sort files for better display
        rttm_files.sort()
        
        # Get the categories (subdirectories)
        categories = set()
        for file_path in rttm_files:
            # Extract the top-level directory
            parts = file_path.split(os.sep)
            if len(parts) > 1:
                categories.add(parts[0])
            else:
                categories.add("root")
        
        categories = sorted(list(categories))
        
        return jsonify({
            'success': True,
            'rttm_files': rttm_files,
            'categories': categories
        })
    except Exception as e:
        app.logger.error(f"Error updating paths: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/load_rttm', methods=['POST'])
def load_rttm():
    try:
        # Clean up all temporary files when loading a new RTTM file
        app.logger.info("Cleaning up temporary files before loading new RTTM file")
        cleanup_temp_files(None)  # None means delete all files regardless of age
        
        rttm_file = request.form.get('rttm_file')
        use_saved = request.form.get('use_saved', 'false').lower() == 'true'
        
        # Path to the original RTTM file
        original_rttm_path = os.path.join(RTTM_DIR, rttm_file)
        
        # Check if the original RTTM file exists
        if not os.path.exists(original_rttm_path):
            return jsonify({'error': 'Original RTTM file not found'}), 404
        
        file_id = os.path.basename(rttm_file).replace('.rttm', '')
        rttm_dir = os.path.dirname(rttm_file)
        
        # Determine which RTTM file to load based on user choice
        if use_saved:
            # Construct path to saved RTTM file
            if rttm_dir:
                saved_rttm_path = os.path.join(LABELS_DIR, rttm_dir, file_id, f"{file_id}.rttm")
            else:
                saved_rttm_path = os.path.join(LABELS_DIR, file_id, f"{file_id}.rttm")
                
            # Check if saved file exists
            if not os.path.exists(saved_rttm_path):
                return jsonify({'error': 'Saved RTTM file not found'}), 404
                
            # Use the saved RTTM file
            rttm_path_to_load = saved_rttm_path
            source_type = "saved"
        else:
            # Use the original RTTM file
            rttm_path_to_load = original_rttm_path
            source_type = "original"
        
        # Parse the RTTM file
        segments = parse_rttm(rttm_path_to_load)
        if not segments:
            return jsonify({'error': 'No segments found in RTTM file'}), 400
        
        # Try to find audio file in the same subdirectory structure
        audio_path = os.path.join(AUDIO_DIR, rttm_dir, f"{file_id}.wav")
        
        # If not found, try the root of AUDIO_DIR (for backward compatibility)
        if not os.path.exists(audio_path):
            audio_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
            
            # If still not found, return error
            if not os.path.exists(audio_path):
                return jsonify({'error': f'Audio file not found at {audio_path}'}), 404
        
        # Return the segments and file information
        # Convert backslashes to forward slashes for URL paths
        audio_url_path = rttm_dir.replace('\\', '/') if rttm_dir else ''
        audio_url = f"/audio/{audio_url_path}/{file_id}.wav" if audio_url_path else f"/audio/{file_id}.wav"
        
        return jsonify({
            'segments': segments,
            'file_id': file_id,
            'rttm_path': rttm_file,
            'audio_path': audio_url,
            'source_type': source_type,
            'rttm_dir': RTTM_DIR,
            'audio_dir': AUDIO_DIR
        })
    except Exception as e:
        app.logger.error(f"Error loading RTTM file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<path:filepath>')
def serve_audio(filepath):
    try:
        # Split the path into directory and filename
        directory, filename = os.path.split(filepath)
        return send_from_directory(os.path.join(AUDIO_DIR, directory), filename)
    except Exception as e:
        app.logger.error(f"Error serving audio file: {str(e)}")
        app.logger.error(traceback.format_exc())
        abort(404)

@app.route('/get_directories', methods=['POST'])
def get_directories():
    try:
        # Use appropriate root path for the OS
        default_path = 'C:\\' if os.name == 'nt' else '/'
        base_path = request.form.get('base_path', default_path)
        
        # Validate base path exists
        if not os.path.isdir(base_path):
            return jsonify({'error': f'Directory not found: {base_path}'}), 400
            
        # Get list of subdirectories
        directories = []
        try:
            for entry in os.listdir(base_path):
                full_path = os.path.join(base_path, entry)
                if os.path.isdir(full_path):
                    directories.append({
                        'name': entry,
                        'path': full_path
                    })
        except PermissionError:
            return jsonify({'error': f'Permission denied for: {base_path}'}), 403
            
        # Sort directories by name
        directories.sort(key=lambda x: x['name'])
        
        return jsonify({
            'base_path': base_path,
            'directories': directories
        })
    except Exception as e:
        app.logger.error(f"Error getting directories: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/browse_dialog', methods=['GET'])
def browse_dialog():
    """Render a file browser dialog"""
    try:
        # Use appropriate root path for the OS
        default_path = 'C:\\' if os.name == 'nt' else '/'
        start_path = request.args.get('start_path', default_path)
        dialog_id = request.args.get('dialog_id', 'file-browser')
        
        return render_template('browser.html', start_path=start_path, dialog_id=dialog_id)
    except Exception as e:
        app.logger.error(f"Error rendering browser dialog: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/get_root_directories', methods=['GET'])
def get_root_directories():
    """Get a list of root directories to browse from"""
    try:
        # Common paths to check
        common_paths = [
            '/',
            '/home',
            '/mnt',
            '/media',
            '/data',
            '/opt',
            '/var',
            '/usr/local',
            os.path.expanduser('~'),  # Home directory
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Project root
        ]
        
        # Filter to only paths that exist and are accessible
        available_paths = []
        for path in common_paths:
            try:
                if os.path.isdir(path) and os.access(path, os.R_OK):
                    available_paths.append({
                        'name': os.path.basename(path) or path,
                        'path': path
                    })
            except:
                pass
                
        return jsonify({
            'directories': available_paths
        })
    except Exception as e:
        app.logger.error(f"Error getting root directories: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/save_labels', methods=['POST'])
def save_labels():
    try:
        data = request.json
        file_id = data.get('file_id')
        segments = data.get('segments')
        rttm_path = data.get('rttm_path', '')
        
        # Determine the appropriate output directory based on the input file's structure
        if rttm_path:
            # Get the relative directory structure from the original RTTM path
            rel_dir = os.path.dirname(rttm_path)
            output_dir = os.path.join(LABELS_DIR, rel_dir, file_id)
        else:
            output_dir = os.path.join(LABELS_DIR, file_id)
        
        # Create the output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Add timestamp for versioning
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save the RTTM file
        output_rttm_path = os.path.join(output_dir, f"{file_id}.rttm")
        # Also create a backup with timestamp
        output_rttm_backup = os.path.join(output_dir, f"{file_id}_{timestamp}.rttm")
        
        # Save to both files
        if not write_rttm(segments, output_rttm_path, file_id) or not write_rttm(segments, output_rttm_backup, file_id):
            return jsonify({'error': 'Failed to save RTTM file'}), 500
        
        # Save the segments as JSON for easier parsing later if needed
        output_json_path = os.path.join(output_dir, f"{file_id}.json")
        output_json_backup = os.path.join(output_dir, f"{file_id}_{timestamp}.json")
        
        try:
            with open(output_json_path, 'w') as f:
                json.dump(segments, f, indent=2)
            with open(output_json_backup, 'w') as f:
                json.dump(segments, f, indent=2)
        except Exception as e:
            app.logger.error(f"Error saving JSON: {str(e)}")
            app.logger.error(traceback.format_exc())
            return jsonify({'error': f'Failed to save JSON file: {str(e)}'}), 500
        
        return jsonify({
            'success': True, 
            'message': f'Labels saved to {output_dir}',
            'timestamp': timestamp
        })
    except Exception as e:
        app.logger.error(f"Error saving labels: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/stats')
def stats():
    try:
        stats = {
            'rttm_count': 0,
            'audio_count': 0,
            'label_count': 0,
            'categories': {}
        }
        
        # Count RTTM files
        for root, dirs, files in os.walk(RTTM_DIR):
            for file in files:
                if file.endswith('.rttm'):
                    stats['rttm_count'] += 1
                    # Get category (top-level directory)
                    rel_path = os.path.relpath(root, RTTM_DIR)
                    category = rel_path.split(os.sep)[0] if rel_path != '.' else 'root'
                    
                    if category not in stats['categories']:
                        stats['categories'][category] = {'rttm': 0, 'audio': 0, 'labels': 0}
                    
                    stats['categories'][category]['rttm'] += 1
        
        # Count audio files
        for root, dirs, files in os.walk(AUDIO_DIR):
            for file in files:
                if file.endswith('.wav'):
                    stats['audio_count'] += 1
                    # Get category (top-level directory)
                    rel_path = os.path.relpath(root, AUDIO_DIR)
                    category = rel_path.split(os.sep)[0] if rel_path != '.' else 'root'
                    
                    if category not in stats['categories']:
                        stats['categories'][category] = {'rttm': 0, 'audio': 0, 'labels': 0}
                    
                    stats['categories'][category]['audio'] += 1
        
        # Count label files
        for root, dirs, files in os.walk(LABELS_DIR):
            for file in files:
                if file.endswith('.rttm'):
                    stats['label_count'] += 1
                    # Get category (top-level directory)
                    rel_path = os.path.relpath(root, LABELS_DIR)
                    category = rel_path.split(os.sep)[0] if rel_path != '.' else 'root'
                    
                    if category not in stats['categories']:
                        stats['categories'][category] = {'rttm': 0, 'audio': 0, 'labels': 0}
                    
                    stats['categories'][category]['labels'] += 1
        
        return render_template('stats.html', stats=stats)
    except Exception as e:
        app.logger.error(f"Error in stats route: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return render_template('error.html', error='Page not found'), 404

@app.errorhandler(500)
def server_error(error):
    return render_template('error.html', error='Server error'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)