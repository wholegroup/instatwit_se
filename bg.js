chrome.webRequest.onHeadersReceived.addListener(
    details => {
        let idCSPHeader = details.responseHeaders.findIndex(header => /content-security-policy/i.test(header.name));
        if (-1 != idCSPHeader) {
            details.responseHeaders[idCSPHeader].value = details.responseHeaders[idCSPHeader].value.replace(
                "img-src", "img-src https://*.cdninstagram.com");
            details.responseHeaders[idCSPHeader].value = details.responseHeaders[idCSPHeader].value.replace(
                "media-src", "media-src https://*.cdninstagram.com");
            details.responseHeaders[idCSPHeader].value = details.responseHeaders[idCSPHeader].value.replace(
                "connect-src", "connect-src https://www.instagram.com");
        }
        return {
            responseHeaders: details.responseHeaders,
        };
    },
    {
        urls: ["*://twitter.com/*"],
        types: ["main_frame"],
    },
    [
        "blocking",
        "responseHeaders",
    ]
);
