// Directory selection functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const rttmDirInput = document.getElementById('rttm-dir-input');
    const audioDirInput = document.getElementById('audio-dir-input');
    const setDirsBtn = document.getElementById('set-directories-btn');
    const resetDirsBtn = document.getElementById('reset-directories-btn');
    const dirStatus = document.getElementById('directory-status');
    
    // Set default values
    if (rttmDirInput && audioDirInput) {
        rttmDirInput.value = rttmDirInput.dataset.default || '';
        audioDirInput.value = audioDirInput.dataset.default || '';
    }
    
    // Add event listener for the Set Directories button
    if (setDirsBtn) {
        setDirsBtn.addEventListener('click', function() {
            // Get the values from the inputs
            const rttmDir = rttmDirInput.value.trim();
            const audioDir = audioDirInput.value.trim();
            
            // Validate inputs
            if (!rttmDir || !audioDir) {
                showDirectoryStatus('Please enter both RTTM and Audio directories', 'danger');
                return;
            }
            
            // Send request to set directories
            const formData = new FormData();
            formData.append('rttm_dir', rttmDir);
            formData.append('audio_dir', audioDir);
            
            fetch('/set_directories', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showDirectoryStatus(`Error: ${data.error}`, 'danger');
                    return;
                }
                
                // Show success message
                showDirectoryStatus('Directories updated successfully', 'success');
                
                // Refresh the file list
                refreshFileList();
            })
            .catch(error => {
                console.error('Error setting directories:', error);
                showDirectoryStatus(`Error: ${error.message}`, 'danger');
            });
        });
    }
    
    // Add event listener for the Reset Directories button
    if (resetDirsBtn) {
        resetDirsBtn.addEventListener('click', function() {
            // Reset inputs to default values
            rttmDirInput.value = rttmDirInput.dataset.default || '';
            audioDirInput.value = audioDirInput.dataset.default || '';
            
            // Send request to reset directories
            const formData = new FormData();
            formData.append('rttm_dir', rttmDirInput.dataset.default || '');
            formData.append('audio_dir', audioDirInput.dataset.default || '');
            
            fetch('/set_directories', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showDirectoryStatus(`Error: ${data.error}`, 'danger');
                    return;
                }
                
                // Show success message
                showDirectoryStatus('Directories reset to defaults', 'success');
                
                // Refresh the file list
                refreshFileList();
            })
            .catch(error => {
                console.error('Error resetting directories:', error);
                showDirectoryStatus(`Error: ${error.message}`, 'danger');
            });
        });
    }
    
    // Function to refresh the file list
    function refreshFileList() {
        fetch('/refresh_file_list')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error refreshing file list:', data.error);
                    return;
                }
                
                // Update the category select
                const categorySelect = document.getElementById('category-select');
                categorySelect.innerHTML = '<option value="all">All Categories</option>';
                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
                
                // Update the RTTM file select
                const rttmFileSelect = document.getElementById('rttm-file-select');
                rttmFileSelect.innerHTML = '<option value="">-- Select RTTM File --</option>';
                data.rttm_files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file;
                    
                    // Extract category from file path
                    const parts = PathUtils.split(file);
                    const category = parts.length > 1 ? parts[0] : 'root';
                    
                    option.dataset.category = category;
                    option.textContent = file;
                    rttmFileSelect.appendChild(option);
                });
                
                // Update current directories info
                const currentRttmDir = document.getElementById('current-rttm-dir');
                const currentAudioDir = document.getElementById('current-audio-dir');
                if (currentRttmDir) currentRttmDir.textContent = data.current_rttm_dir;
                if (currentAudioDir) currentAudioDir.textContent = data.current_audio_dir;
            })
            .catch(error => {
                console.error('Error refreshing file list:', error);
            });
    }
    
    // Function to show directory status
    function showDirectoryStatus(message, type) {
        if (dirStatus) {
            dirStatus.textContent = message;
            dirStatus.className = `alert alert-${type} mt-3`;
            dirStatus.style.display = 'block';
            
            // Hide the status message after 5 seconds
            setTimeout(function() {
                dirStatus.style.display = 'none';
            }, 5000);
        }
    }
});
