// Cross-platform path utilities for Windows/Unix compatibility
const PathUtils = {
    // Detect if we're likely on Windows (simple heuristic)
    isWindows: function() {
        return navigator.platform.includes('Win') || 
               navigator.userAgent.includes('Windows') ||
               /^[A-Z]:\\/.test(window.location.pathname);
    },
    
    // Get the appropriate path separator
    getSeparator: function() {
        return this.isWindows() ? '\\' : '/';
    },
    
    // Get default root path for the OS
    getDefaultRoot: function() {
        return this.isWindows() ? 'C:\\' : '/';
    },
    
    // Normalize path separators for the current OS
    normalize: function(path) {
        if (!path) return path;
        const separator = this.getSeparator();
        // Replace all types of separators with the correct one for this OS
        return path.replace(/[\\\/]+/g, separator);
    },
    
    // Split path using appropriate separator
    split: function(path) {
        if (!path) return [];
        // Handle both types of separators
        return path.split(/[\\\/]+/).filter(part => part.length > 0);
    },
    
    // Join path parts with appropriate separator
    join: function(...parts) {
        const separator = this.getSeparator();
        return parts.filter(part => part && part.length > 0).join(separator);
    },
    
    // Convert path to URL format (always use forward slashes for URLs)
    toUrl: function(path) {
        if (!path) return path;
        return path.replace(/\\/g, '/');
    },
    
    // Get the first directory part of a relative path
    getFirstDir: function(path) {
        const parts = this.split(path);
        return parts.length > 0 ? parts[0] : '';
    },
    
    // Check if path is absolute
    isAbsolute: function(path) {
        if (!path) return false;
        if (this.isWindows()) {
            return /^[A-Z]:[\\\/]/.test(path) || path.startsWith('\\\\');
        } else {
            return path.startsWith('/');
        }
    }
};

// Make it available globally
window.PathUtils = PathUtils;
