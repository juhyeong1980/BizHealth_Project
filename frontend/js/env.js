window.APP_CONFIG = {
    // [Updated] Smart Configuration for Local/EC2/Amplify
    // 1. If hostname is localhost or 127.0.0.1 -> Use Local Backend
    // 2. If hostname matches EC2 IP -> Use Relative Path (same origin)
    // 3. Otherwise (Amplify/External) -> Use Fixed EC2 IP (Port 8080 based on user feedback)
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? "http://127.0.0.1:8000"
        : (window.location.hostname === '15.164.233.12' ? window.location.origin : "http://15.164.233.12:8080")
};
