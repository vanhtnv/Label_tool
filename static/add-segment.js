// Add Segment functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Add segment script loaded');
    
    // Make sure all necessary elements exist
    if (!document.getElementById('add-segment-btn') || 
        !document.getElementById('add-segment-modal') ||
        !document.getElementById('save-new-segment-btn') ||
        !document.getElementById('cancel-add-segment-btn') ||
        !document.getElementById('close-add-segment-btn') ||
        !document.getElementById('set-position-btn') ||
        !document.getElementById('new-start-time') ||
        !document.getElementById('new-duration') ||
        !document.getElementById('new-end-time') ||
        !document.getElementById('new-speaker-id')) {
        console.error('Some add segment elements are missing');
        return;
    }
    
    // Elements related to add segment
    const addSegmentBtn = document.getElementById('add-segment-btn');
    const addSegmentModal = document.getElementById('add-segment-modal');
    const saveNewSegmentBtn = document.getElementById('save-new-segment-btn');
    const cancelAddSegmentBtn = document.getElementById('cancel-add-segment-btn');
    const closeAddSegmentBtn = document.getElementById('close-add-segment-btn');
    const setPositionBtn = document.getElementById('set-position-btn');
    
    // Form elements
    const newStartTime = document.getElementById('new-start-time');
    const newDuration = document.getElementById('new-duration');
    const newEndTime = document.getElementById('new-end-time');
    const newSpeakerId = document.getElementById('new-speaker-id');
    
    // Handle clicking the Add Segment button
    addSegmentBtn.addEventListener('click', function() {
        console.log('Add segment button clicked');
        console.log('currentFileId:', window.currentFileId || currentFileId);
        
        // Only allow adding segments if a file is loaded
        if (!window.currentFileId && !currentFileId) {
            alert('Please load an RTTM file first');
            return;
        }
        
        // Clear form
        newStartTime.value = '';
        newDuration.value = '';
        newEndTime.value = '';
        newSpeakerId.value = '';
        
        // Show modal
        addSegmentModal.style.display = 'block';
    });
    
    // Handle automatic time field calculations for new segment
    function setupNewSegmentTimeCalculations() {
        // When start time changes, update end time based on duration
        newStartTime.addEventListener('input', function() {
            if (!isNaN(parseFloat(this.value)) && !isNaN(parseFloat(newDuration.value))) {
                const startTime = parseFloat(this.value);
                const duration = parseFloat(newDuration.value);
                newEndTime.value = (startTime + duration).toFixed(2);
            }
        });
        
        // When duration changes, update end time based on start time
        newDuration.addEventListener('input', function() {
            if (!isNaN(parseFloat(this.value)) && !isNaN(parseFloat(newStartTime.value))) {
                const startTime = parseFloat(newStartTime.value);
                const duration = parseFloat(this.value);
                newEndTime.value = (startTime + duration).toFixed(2);
            }
        });
        
        // When end time changes, update duration based on start time
        newEndTime.addEventListener('input', function() {
            if (!isNaN(parseFloat(this.value)) && !isNaN(parseFloat(newStartTime.value))) {
                const startTime = parseFloat(newStartTime.value);
                const endTime = parseFloat(this.value);
                newDuration.value = (endTime - startTime).toFixed(2);
            }
        });
    }
    
    // Set up time calculations
    setupNewSegmentTimeCalculations();
    
    // Handle "Set From Current Position" button
    setPositionBtn.addEventListener('click', function() {
        const fullAudio = document.getElementById('full-audio');
        
        if (fullAudio && !isNaN(fullAudio.currentTime)) {
            // Set the start time to the current position in the full audio
            newStartTime.value = fullAudio.currentTime.toFixed(2);
            
            // If duration is already set, update end time
            if (!isNaN(parseFloat(newDuration.value))) {
                const duration = parseFloat(newDuration.value);
                newEndTime.value = (fullAudio.currentTime + duration).toFixed(2);
            }
        } else {
            alert('Please start playing the full audio first');
        }
    });
    
    // Close modal when clicking close button or cancel
    closeAddSegmentBtn.addEventListener('click', function() {
        addSegmentModal.style.display = 'none';
    });
    
    cancelAddSegmentBtn.addEventListener('click', function() {
        addSegmentModal.style.display = 'none';
    });
    
    // Also close when clicking outside the modal
    window.addEventListener('click', function(event) {
        if (event.target === addSegmentModal) {
            addSegmentModal.style.display = 'none';
        }
    });
    
    // Save new segment
    saveNewSegmentBtn.addEventListener('click', function() {
        console.log('Save new segment button clicked');
        console.log('currentFileId:', window.currentFileId || currentFileId);
        console.log('segments:', window.segments || segments);
        
        // Check if currentFileId exists
        if (!window.currentFileId && !currentFileId) {
            alert('Please load an RTTM file first');
            return;
        }
        
        const startTime = parseFloat(newStartTime.value);
        const duration = parseFloat(newDuration.value);
        const speakerId = newSpeakerId.value.trim();
        
        // Validate inputs
        if (isNaN(startTime) || startTime < 0) {
            alert('Please enter a valid start time (must be a positive number)');
            return;
        }
        
        if (isNaN(duration) || duration <= 0) {
            alert('Please enter a valid duration (must be greater than 0)');
            return;
        }
        
        if (!speakerId) {
            alert('Please enter a speaker ID');
            return;
        }
        
        // Create new segment object
        const newSegment = {
            start_time: startTime,
            duration: duration,
            end_time: startTime + duration,
            speaker_id: speakerId,
            file_id: window.currentFileId || currentFileId
        };
        
        console.log('New segment:', newSegment);
        
        // Use either local or global segments variable
        const segmentsArray = window.segments || segments;
        
        // Add to segments array
        segmentsArray.push(newSegment);
        
        // Sort segments by start time
        segmentsArray.sort((a, b) => a.start_time - b.start_time);
        
        // Update global segments if it exists
        if (window.segments) {
            window.segments = segmentsArray;
        }
        
        // Refresh display
        displaySegments();
        
        // Close modal
        addSegmentModal.style.display = 'none';
        
        // Show success message
        showNotification('New segment added successfully');
    });
});
