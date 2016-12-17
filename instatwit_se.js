(function () {
    const extractDirectUrl = (body) => {
        const reImage = /(?:meta property="og:image" content="(.+)")/imu;
        const imageMatches = body.match(reImage);
        if (!imageMatches) {
            throw Error(`No direct url`)
        }
        const reVideo = /(?:meta property="og:video:secure_url" content="(.+)")/imu;
        const videoMatches = body.match(reVideo);
        return {
            imageUrl: imageMatches[1],
            videoUrl: videoMatches ? videoMatches[1] : null,
        };
    };

    const generateHtml = (instaUrl, directUrl) => {
        if (directUrl.videoUrl) {
            return $("<div>").append(
                $("<video>")
                    .attr("poster", directUrl.imageUrl)
                    .attr("preload", "none").attr("src", directUrl.videoUrl)
                    .attr("type", "video/mp4")
            ).append(
                $("<div>").addClass("video-info").html("click on video to play")
            ).html();
        }
        return `<a href="${encodeURI(instaUrl)}" rel="nofollow" target="_blank">`
            + `<img src="${encodeURI(directUrl.imageUrl)}"></a>`;
    };

    const addInsta = (tweet) => {
        if (!tweet.hasClass('instaProcessed')) {
            tweet.addClass('instaProcessed');

            const text = tweet.find(".js-tweet-text").text();
            if (!text || ((text.indexOf("instagr.am") == -1) && (text.indexOf("instagram.com") == -1))) {
                return;
            }

            const instaUrl = tweet.find('[data-expanded-url]').data('expanded-url');
            if (!instaUrl) {
                return;
            }

            fetch(instaUrl)
                .then(response => {
                    if (response.status != 200) {
                        throw Error(`${response.url} has returned ${response.status} status code.`);
                    }
                    return response.text();
                })
                .then(body => {
                    return extractDirectUrl(body);
                })
                .then(directUrl => {
                    const html = generateHtml(instaUrl, directUrl);
                    const injectedCode = $("<div/>").html(html).addClass('instatwit-se');
                    tweet.find('.stream-item-footer').before(injectedCode);
                    if (directUrl.videoUrl) {
                        tweet.find('video').click((event) => {
                            event.target.paused ? event.target.play() : event.target.pause();
                            return false;
                        });
                    }
                })
                .catch(reason => {
                    console.log(`An unknown error loading of ${instaUrl}. The reason: ${reason}`);
                });
        }
    };

    // list
    const doc = $("#doc");
    new MutationObserver(() => {
        doc.find('.js-stream-item').each((n, value) => {
            addInsta($(value));
        });
    }).observe(doc[0], {
        childList: true,
        subtree: true,
    });

    // single post
    const permalinkOverlay = $("#permalink-overlay");
    new MutationObserver(() => {
        if (permalinkOverlay.is(":visible")) {
            permalinkOverlay.find(".permalink .permalink-tweet").each((n, value) => {
                addInsta($(value));
            });
        }
    }).observe(permalinkOverlay[0], {
        attributes: true,
        subtree: true,
    });
})();
