document.addEventListener('DOMContentLoaded', function() {
    const rttmFolderInput = document.getElementById('rttm-folder-input');
    const audioFolderInput = document.getElementById('audio-folder-input');
    const overlay = document.getElementById('folder-selection-overlay');
    const overlayRttmInput = document.getElementById('overlay-rttm-folder-input');
    const overlayAudioInput = document.getElementById('overlay-audio-folder-input');
    const confirmButton = document.getElementById('confirm-folder-selection');
    const rttmFileSelect = document.getElementById('rttm-file-select');

    rttmFolderInput.addEventListener('change', function(event) {
        const relativePath = event.target.files[0]?.webkitRelativePath;
        const folderPath = relativePath ? PathUtils.getFirstDir(relativePath) : null;
        if (folderPath) {
            console.log('Selected RTTM folder:', folderPath);
            sendFolderPathToBackend('rttm', folderPath);
        }
    });

    audioFolderInput.addEventListener('change', function(event) {
        const relativePath = event.target.files[0]?.webkitRelativePath;
        const folderPath = relativePath ? PathUtils.getFirstDir(relativePath) : null;
        if (folderPath) {
            console.log('Selected Audio folder:', folderPath);
            sendFolderPathToBackend('audio', folderPath);
        }
    });

    rttmFileSelect.addEventListener('change', function() {
        const selectedFile = rttmFileSelect.value;

        if (!selectedFile) {
            console.log('No RTTM file selected.');
            return;
        }

        fetch(`/list_files?type=audio`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Audio files for RTTM:', data.files);
                    // Logic to associate audio files with the selected RTTM file can be added here
                } else {
                    console.error('Failed to list audio files:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching audio files:', error);
            });
    });

    function populateRttmFiles() {
        fetch('/list_files?type=rttm')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const rttmSelect = document.getElementById('rttm-file-select');
                    rttmSelect.innerHTML = '<option value="">-- Select RTTM File --</option>';
                    data.files.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        rttmSelect.appendChild(option);
                    });
                } else {
                    console.error('Failed to list RTTM files:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching RTTM files:', error);
            });
    }

    confirmButton.addEventListener('click', function() {
        const rttmRelativePath = overlayRttmInput.files[0]?.webkitRelativePath;
        const audioRelativePath = overlayAudioInput.files[0]?.webkitRelativePath;
        const rttmFolder = rttmRelativePath ? PathUtils.getFirstDir(rttmRelativePath) : null;
        const audioFolder = audioRelativePath ? PathUtils.getFirstDir(audioRelativePath) : null;

        if (!rttmFolder || !audioFolder) {
            alert('Please select both RTTM and Audio folders.');
            return;
        }

        sendFolderPathToBackend('rttm', rttmFolder);
        sendFolderPathToBackend('audio', audioFolder);

        overlay.style.display = 'none';

        // Populate RTTM files after folder selection
        populateRttmFiles();
    });

    function sendFolderPathToBackend(type, path) {
        fetch(`/set_folder_path`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`${type} folder path set successfully.`);
            } else {
                console.error(`Failed to set ${type} folder path.`);
            }
        })
        .catch(error => {
            console.error('Error setting folder path:', error);
        });
    }
});
