// Folder Configuration functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Folder configuration script loaded');
    
    // Check if elements exist
    if (!document.getElementById('folder-config-form') || 
        !document.getElementById('rttm-folder') ||
        !document.getElementById('audio-folder')) {
        console.error('Folder configuration elements are missing');
        return;
    }
    
    // Elements related to folder configuration
    const folderConfigForm = document.getElementById('folder-config-form');
    const rttmFolderInput = document.getElementById('rttm-folder');
    const audioFolderInput = document.getElementById('audio-folder');
    const categorySelect = document.getElementById('category-select');
    const rttmFileSelect = document.getElementById('rttm-file-select');
    
    // Browse buttons
    const browseRttmBtn = document.getElementById('browse-rttm-btn');
    const browseAudioBtn = document.getElementById('browse-audio-btn');
    
    // Hidden file inputs for browsing
    const folderBrowserRttm = document.getElementById('folder-browser-rttm');
    const folderBrowserAudio = document.getElementById('folder-browser-audio');
    
    // Set up advanced browse functionality for RTTM folder
    if (browseRttmBtn) {
        browseRttmBtn.addEventListener('click', function() {
            const currentPath = rttmFolderInput && rttmFolderInput.value ? rttmFolderInput.value.trim() : '/';
            openBrowserDialog(currentPath, 'rttm-browser');
        });
    }
    
    // Set up advanced browse functionality for Audio folder
    if (browseAudioBtn) {
        browseAudioBtn.addEventListener('click', function() {
            const currentPath = audioFolderInput && audioFolderInput.value ? audioFolderInput.value.trim() : '/';
            openBrowserDialog(currentPath, 'audio-browser');
        });
    }
    
    // Function to open browser dialog
    function openBrowserDialog(startPath, dialogId) {
        try {
            const width = 600;
            const height = 500;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            
            const browserWindow = window.open(
                `/browse_dialog?start_path=${encodeURIComponent(startPath)}&dialog_id=${dialogId}`,
                dialogId,
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );
            
            // Ensure focus
            if (browserWindow) {
                browserWindow.focus();
            } else {
                alert('Popup blocker may be preventing the folder browser from opening.');
            }
        } catch (error) {
            console.error('Error opening browser dialog:', error);
            alert('Error opening folder browser. Please try again or use the manual input method.');
        }
    }
    
    // Listen for messages from browser dialog
    window.addEventListener('message', function(event) {
        try {
            if (event.data && event.data.type === 'folderSelected') {
                const { dialogId, path } = event.data;
                
                if (dialogId === 'rttm-browser') {
                    if (rttmFolderInput) {
                        rttmFolderInput.value = path;
                        showNotification(`RTTM folder selected: ${path}`, 'info');
                    } else {
                        console.error('rttmFolderInput element not found');
                    }
                } else if (dialogId === 'audio-browser') {
                    if (audioFolderInput) {
                        audioFolderInput.value = path;
                        showNotification(`Audio folder selected: ${path}`, 'info');
                    } else {
                        console.error('audioFolderInput element not found');
                    }
                }
            }
        } catch (error) {
            console.error('Error processing message from browser dialog:', error);
        }
    });
    
    // Fallback file input method if the browser dialog doesn't work
    folderBrowserRttm.addEventListener('change', function(event) {
        if (event.target.files.length > 0) {
            // Get the directory path from the first file
            const path = event.target.files[0].webkitRelativePath;
            const folderPath = path.split('/')[0];
            
            // Get current path without the last segment
            const currentPath = rttmFolderInput.value;
            const pathParts = currentPath.split('/');
            pathParts.pop(); // Remove last segment
            
            // Build the full path
            const fullPath = pathParts.join('/') + '/' + folderPath;
            
            // Update the input
            rttmFolderInput.value = fullPath;
            
            // Show a notification
            showNotification(`Selected RTTM folder: ${folderPath}`, 'info');
        }
    });
    
    // Fallback file input method for Audio
    folderBrowserAudio.addEventListener('change', function(event) {
        if (event.target.files.length > 0) {
            // Get the directory path from the first file
            const path = event.target.files[0].webkitRelativePath;
            const folderPath = path.split('/')[0];
            
            // Get current path without the last segment
            const currentPath = audioFolderInput.value;
            const pathParts = currentPath.split('/');
            pathParts.pop(); // Remove last segment
            
            // Build the full path
            const fullPath = pathParts.join('/') + '/' + folderPath;
            
            // Update the input
            audioFolderInput.value = fullPath;
            
            // Show a notification
            showNotification(`Selected Audio folder: ${folderPath}`, 'info');
        }
    });
    
    // Handle form submission
    folderConfigForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Get input values
        const rttmFolder = rttmFolderInput.value.trim();
        const audioFolder = audioFolderInput.value.trim();
        
        // Validate inputs
        if (!rttmFolder) {
            alert('Please enter a valid RTTM folder path');
            rttmFolderInput.focus();
            return;
        }
        
        if (!audioFolder) {
            alert('Please enter a valid audio folder path');
            audioFolderInput.focus();
            return;
        }
        
        // Show loading indicator
        const submitBtn = folderConfigForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Updating...';
        submitBtn.disabled = true;
        
        // Send request to update paths
        fetch('/update_paths', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `rttm_dir=${encodeURIComponent(rttmFolder)}&audio_dir=${encodeURIComponent(audioFolder)}`
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            
            if (data.error) {
                showNotification(data.error, 'danger');
                return;
            }
            
            // Update category select
            categorySelect.innerHTML = '<option value="all">All Categories</option>';
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            // Update file select
            rttmFileSelect.innerHTML = '<option value="">-- Select RTTM File --</option>';
            data.rttm_files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                
                // Set data-category attribute
                const parts = file.split('/');
                const category = parts.length > 1 ? parts[0] : 'root';
                option.setAttribute('data-category', category);
                
                option.textContent = file;
                rttmFileSelect.appendChild(option);
            });
            
            // Reset current file if one is loaded
            if (currentFileId) {
                document.getElementById('current-file').textContent = 'No file loaded';
                document.getElementById('full-audio-player').style.display = 'none';
                document.getElementById('save-all-btn').disabled = true;
                document.getElementById('add-segment-btn').disabled = true;
                document.getElementById('no-segments-msg').style.display = 'block';
                document.getElementById('segments-list').innerHTML = '';
                document.getElementById('edit-panel').style.display = 'none';
                
                // Clear variables
                segments = [];
                currentFileId = null;
                currentRttmPath = null;
            }
            
            showNotification('Folders updated successfully. Please select an RTTM file to load.', 'success');
        })
        .catch(error => {
            console.error('Error updating paths:', error);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            showNotification('Error updating folders: ' + error.message, 'danger');
        });
    });
});
