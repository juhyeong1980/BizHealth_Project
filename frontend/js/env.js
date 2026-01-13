window.APP_CONFIG = {
    // API_URL: "http://43.201.66.185:8000" // Old Config
    // [Updated] Configuration for Amplify <-> EC2
    // If running on EC2 (same origin), use relative path.
    // If running on Amplify or Local, use fixed EC2 IP.
    API_URL: window.location.hostname === '43.201.66.185'
        ? window.location.origin
        : "http://43.201.66.185:8000"
};
