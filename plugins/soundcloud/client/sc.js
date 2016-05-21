'use strict';
console.log('[SC] Loaded succesfully');

var soundcloud_div = document.querySelector('div#content div.soundcloud');
if (soundcloud_div !== null) {
    var searchBar = document.getElementById('sc-search');
    var lastFired = '';
    var resWindowShown = false;
    var resWindow = null;

    var addToResultList = (url, artwork, title, artist, duration) => {

        var bindClickToResult = (item, result) => {
            item.addEventListener('click', () => {
                console.log('clicked item!');
                console.log(result);

                var artwork = result.artwork;
                if (artwork !== null && artwork.match(/sndcdn\.com/i)) {
                    artwork = artwork.toString().replace('large', 't500x500');
                }

                window.ui._playManager.playMp3(result.url, {
                    title: result.title,
                    artist: result.artist,
                    album: '',
                    albumArt: artwork,
                    duration: Math.round(result.duration / 1000)
                });
            });
        };

        var resultItem = document.createElement('div');
        resultItem.classList.add('sc-reswindow-result');

        /*resultItem.setAttribute('data-stream', json.results[i].url);
        resultItem.setAttribute('data-title', json.results[i].text);
        resultItem.setAttribute('data-artist', json.results[i].artist);
        resultItem.setAttribute('data-albumart', json.results[i].artwork);*/
        var resultObj = {
            'url': url,
            'title': title,
            'artist': artist,
            'artwork': artwork,
            'duration': duration
        };
        bindClickToResult(resultItem, resultObj);

        var resultImage = document.createElement('img');
        if (artwork !== null) {
            resultImage.setAttribute('src', artwork.toString().replace('t500x500', 'large'));
        } else {
            resultImage.style.backgroundImage = 'linear-gradient(135deg,#846170,#8e8485)';
        }
        resultImage.classList.add('sc-reswindow-result-img');

        var resultText = document.createElement('div');
        resultText.classList.add('sc-reswindow-result-text');
        resultText.innerHTML = (artist !== null ? artist + ' - ' : '') + title;

        resultItem.appendChild(resultImage);
        resultItem.appendChild(resultText);
        resWindow.appendChild(resultItem);
    };

    var createResWindow = () => {
        if (resWindow === null) {
            resWindow = document.createElement('div');
            resWindow.setAttribute('id', 'sc_reswindow');
            resWindow.classList.add('soundcloud');
            resWindow.classList.add('sc-reswindow');
            soundcloud_div.appendChild(resWindow);
            console.log(searchBar.offsetTop, searchBar.offsetLeft, searchBar.offsetWidth, resWindow.style.top);
            resWindow.style.top = (searchBar.offsetTop + searchBar.offsetHeight) + 'px';
            resWindow.style.left = searchBar.offsetLeft + 'px';
            resWindow.style.width = searchBar.offsetWidth + 'px';
            resWindowShown = true;
        }
        resWindow.innerHTML = '';
    };

    var searchBarKeyPress = () => {
        if (searchBar.value !== lastFired) {
            // search
            if (searchBar.value === '') {
                if (resWindow !== null) {
                    resWindow.parentElement.removeChild(resWindow);
                    resWindow = null;
                    return;
                }
                return;
            }

            var oReq = new XMLHttpRequest();

            if (searchBar.value.match(/^http(?:s|):\/\/(?:www\.|)soundcloud\.com\/(.*?)\/(.*?)$/i)) {
                oReq.addEventListener('load', () => {
                    if (oReq.status === 200) {
                        var json = null;
                        try {
                            json = JSON.parse(oReq.responseText);
                        } catch (e) {
                            console.log('Unable to parse JSON: ' + e);
                            return;
                        }

                        if (json.kind === 'track') {
                            createResWindow();
                            addToResultList(json.permalink_url, json.artwork_url, json.title, json.user.username, json.duration);
                        } else {
                            if (resWindow !== null) {
                                resWindow.parentElement.removeChild(resWindow);
                                resWindow = null;
                            }
                        }
                    }
                });
                oReq.open('GET', '/plugins/soundcloud/resolve/' + encodeURIComponent(searchBar.value));
                oReq.send();
            } else {
                oReq.addEventListener('load', () => {
                    if (oReq.status === 200) {
                        var json = {
                            results: []
                        };
                        try {
                            json = JSON.parse(oReq.responseText);
                        } catch (e) {
                            console.log('Unable to parse JSON', e);
                        }
                        if (json.results.length !== 0) {
                            createResWindow();
                            for (var i in json.results) {
                                if (json.results.hasOwnProperty(i)) {
                                    addToResultList(
                                        json.results[i].url,
                                        json.results[i].artwork,
                                        json.results[i].text,
                                        json.results[i].artist,
                                        json.results[i].duration
                                    );
                                }
                            }
                        } else {
                            if (resWindow !== null) {
                                resWindow.parentElement.removeChild(resWindow);
                                resWindow = null;
                            }
                        }
                    }
                });
                oReq.open('GET', '/plugins/soundcloud/suggest/' + encodeURIComponent(searchBar.value), true);
                oReq.send();
            }
            lastFired = searchBar.value;
        }
    };
    searchBar.addEventListener('keydown', searchBarKeyPress);
    searchBar.addEventListener('keyup', searchBarKeyPress);
}