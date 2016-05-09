'use strict';
console.log('[SC] Loaded succesfully');

var soundcloud_div = document.querySelector('div#content div.soundcloud');
if (soundcloud_div !== null) {
    var searchBar = document.getElementById('sc-search');
    var lastFired = '';
    var resWindowShown = false;
    var resWindow = null;
    var searchBarKeyPress = (e) => {
        if (searchBar.value !== lastFired) {
            // search
            if(searchBar.value === '')
            {
              if(resWindow !== null)
              {
                resWindow.parentElement.removeChild(resWindow);
                resWindow = null;
                return;
              }
              return;
            }
            var oReq = new XMLHttpRequest();
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

                    var bindClickToResult = (item, result)=>{
                      resultItem.addEventListener('click', ()=>{
                          window.ui._playManager.playMp3(result.url, {
                              title: result.text,
                              artist: result.artist,
                              album: '',
                              albumArt: result.artwork,
                              duration: Math.round(result.duration/1000)
                          });
                      });
                    };

                    if (json.results.length !== 0) {
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
                        for (var i in json.results) {
                            if (json.results.hasOwnProperty(i)) {
                                var resultItem = document.createElement('div');
                                resultItem.classList.add('sc-reswindow-result');

                                /*resultItem.setAttribute('data-stream', json.results[i].url);
                                resultItem.setAttribute('data-title', json.results[i].text);
                                resultItem.setAttribute('data-artist', json.results[i].artist);
                                resultItem.setAttribute('data-albumart', json.results[i].artwork);*/

                                bindClickToResult(resultItem, json.results[i]);

                                var resultImage = document.createElement('img');
                                if (json.results[i].artwork !== null) {
                                    resultImage.setAttribute('src', json.results[i].artwork.toString().replace('t500x500', 'large'));
                                } else {
                                    resultImage.style.backgroundImage = 'linear-gradient(135deg,#846170,#8e8485)';
                                }
                                resultImage.classList.add('sc-reswindow-result-img');

                                var resultText = document.createElement('div');
                                resultText.classList.add('sc-reswindow-result-text');
                                resultText.innerHTML = json.results[i].text;

                                resultItem.appendChild(resultImage);
                                resultItem.appendChild(resultText);
                                resWindow.appendChild(resultItem);
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
            lastFired = searchBar.value;
        }
    };
    searchBar.addEventListener('keydown', searchBarKeyPress);
    searchBar.addEventListener('keyup', searchBarKeyPress);
}