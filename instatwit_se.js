(function () {
    const resolve = (path, obj) => {
        return path.split('.').reduce(function (prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj || self)
    }

    const extractInstaInfo = (body) => {
        // image
        const reImage = /(?:meta property="og:image" content="(.+)")/imu;
        const imageMatches = body.match(reImage);
        const imageUrl = imageMatches ? imageMatches[1] : null;
        if (!imageUrl) {
            throw Error(`No direct url`)
        }

        // video
        const reVideo = /(?:meta property="og:video:secure_url" content="(.+)")/imu;
        const videoMatches = body.match(reVideo);
        const videoUrl = videoMatches ? videoMatches[1] : null

        // additional data
        const reSharedData = /(?:window\._sharedData\s=\s(.+?);<\/script>)/imu;
        const sharedDataMatches = body.match(reSharedData);
        const sharedData = JSON.parse(sharedDataMatches[1] || "{}");
        const description = resolve("entry_data.PostPage.0.graphql.shortcode_media.edge_media_to_caption.edges.0."
            + "node.text", sharedData) || null;
        const location = resolve("entry_data.PostPage.0.graphql.shortcode_media.location.name", sharedData) || null;

        return {imageUrl, videoUrl, description, location};
    };

    const generateHtml = (instaUrl, instaInfo) => {
        if (instaInfo.videoUrl) {
            return $("<div>").append(
                $("<video>")
                    .attr("playsinline", "")
                    .attr("poster", instaInfo.imageUrl)
                    .attr("preload", "none").attr("src", instaInfo.videoUrl)
                    .attr("type", "video/mp4")
            ).append(
                $("<div>").addClass("video-info").html("click on video to play")
            ).html();
        }
        return `<a href="${encodeURI(instaUrl)}" rel="nofollow" target="_blank">`
            + `<img src="${encodeURI(instaInfo.imageUrl)}"></a>`;
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
                    if (response.status !== 200) {
                        throw Error(`${response.url} has returned ${response.status} status code.`);
                    }
                    return response.text()
                })
                .then(body => {
                    return extractInstaInfo(body);
                })
                .then(instaInfo => {
                    if (instaInfo.description) {
                        const tweetText = tweet.find('.tweet-text');
                        const instaAnchor = tweetText.find('a');
                        tweetText.text(instaInfo.description
                            + (instaInfo.location ? ' @ ' + instaInfo.location : '')
                            + ' '
                        );
                        instaAnchor.appendTo(tweetText);
                    }
                    const html = generateHtml(instaUrl, instaInfo);
                    const injectedCode = $("<div/>").html(html).addClass('instatwit-se');
                    const footer = tweet.find('.stream-item-footer');
                    footer.before(injectedCode);
                    if (instaInfo.videoUrl) {
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
        doc.find('.js-stream-item[data-item-type=tweet]').each((n, value) => {
            addInsta($(value).find('div.tweet').first());
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
