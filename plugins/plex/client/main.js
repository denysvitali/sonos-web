'use strict';
(()=>{
    const PLEX_API_ENDPOINT = '/plugins/plex/api';
    const content = document.getElementById('content');
    const plex = content.getElementsByClassName('plex')[0];
    const section = plex.getElementsByClassName('section')[0];
    const loading = section.getElementsByClassName('loading')[0];

    let sections = [];
    
    function loadSections(){
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if (oReq.status === 200) {
                var json = null;
                try {
                    json = JSON.parse(oReq.responseText);
                } catch (e) {
                    console.log('Unable to parse JSON: ' + e);
                    return;
                }
                if (json.length === 0) {
                    return;
                }

                for(let i in json.MediaContainer.Directory){
                    if(json.MediaContainer.Directory.hasOwnProperty(i)){
                        let el = json.MediaContainer.Directory[i];
                        if(el.type == 'artist'){
                            sections.push(el);
                        }
                    }
                }
                console.log(sections);
                displaySections();
            }
        });
        oReq.open('GET', `${PLEX_API_ENDPOINT}/library/sections/`);
        oReq.send();
    }

    function loadSection(sectionId){
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if (oReq.status === 200) {
                var json = null;
                try {
                    json = JSON.parse(oReq.responseText);
                } catch (e) {
                    console.log('Unable to parse JSON: ' + e);
                    return;
                }
                if (json.length === 0) {
                    return;
                }

                let elements = [];

                for(let i in json.MediaContainer.Directory){
                    if(json.MediaContainer.Directory.hasOwnProperty(i)){
                        elements.push(json.MediaContainer.Directory[i]);
                    }
                }
                loadSectionElements(sectionId, json.MediaContainer.title1, elements);
            }
        });
        oReq.open('GET', `${PLEX_API_ENDPOINT}/library/sections/${sectionId}`);
        oReq.send();
    }

    function displaySections(){
        let sectionList = document.createElement('div');
        sectionList.classList.add('plex-section-list');

        for(let i in sections){
            if(sections.hasOwnProperty(i)){
                let el = sections[i];
                let divEl = document.createElement('div');
                divEl.classList.add('plex-section-element');
                
                let thumbnail = document.createElement('img');
                thumbnail.setAttribute('src', `${PLEX_API_ENDPOINT}${el.thumb}`);
                thumbnail.classList.add('plex-section-image');

                let sectionTitle = document.createElement('div');
                sectionTitle.classList.add('plex-section-title');
                sectionTitle.innerText = el.title;

                let sectionBackground = document.createElement('div');
                sectionBackground.classList.add('plex-section-background');
                sectionBackground.style.backgroundImage = `url('${PLEX_API_ENDPOINT}${el.art}')`;

                let sectionBackgroundOverlay = document.createElement('div');
                sectionBackgroundOverlay.classList.add('plex-section-background-overlay');

                let sectionInfos = document.createElement('div');
                sectionInfos.classList.add('plex-section-infos');

                sectionInfos.appendChild(thumbnail);
                sectionInfos.appendChild(sectionTitle);

                divEl.appendChild(sectionInfos);
                divEl.appendChild(sectionBackground);
                divEl.appendChild(sectionBackgroundOverlay);
                


                divEl.onclick = ()=>{
                    loadSection(el.key);
                }

                sectionList.appendChild(divEl);
            }
        }

        section.appendChild(sectionList);
        loading.remove();
    }

    function loadSectionElement(path){
        console.log("loadSectionElement");
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if (oReq.status === 200) {
                var json = null;
                try {
                    json = JSON.parse(oReq.responseText);
                } catch (e) {
                    console.log('Unable to parse JSON: ' + e);
                    return;
                }
                if (json.length === 0) {
                    return;
                }
                
                console.log(json.MediaContainer.Directory);
                console.log(json.MediaContainer.Metadata);

                let data;
                if(json.MediaContainer.Metadata != null){
                    data = json.MediaContainer.Metadata;
                } else {
                    data = json.MediaContainer.Directory;
                }

                try{
                    section.getElementsByClassName('plex-result')[0].remove();
                } catch(e){

                }
                
                let result = document.createElement('div');
                result.classList.add('plex-result');
                for(let i in data){
                    if(data.hasOwnProperty(i)){
                        let el = data[i];
                        if(el.hasOwnProperty("key") && el.hasOwnProperty("title")){
                            let divEl = document.createElement("div");
                            divEl.classList.add('plex-result-entry');
                            divEl.setAttribute("data-plex-key", el.key);

                            let divText = document.createElement("div");
                            divText.classList.add("plex-result-title");
                            divText.innerText = el.title;

                            let img = document.createElement("img");
                            img.classList.add("plex-result-picture");
                            img.setAttribute("src", `${PLEX_API_ENDPOINT}${el.thumb}`);

                            divEl.appendChild(img);
                            divEl.appendChild(divText);

                            divEl.onclick = ()=>{
                                if(el.type === 'track'){
                                    let base_url = `http://${SonosWeb._ipaddress}:${SonosWeb._port}${PLEX_API_ENDPOINT}`
                                    let track_url = `${base_url}${el.Media[0].Part[0].key}`;
                                    window.ui._playManager.playMp3(track_url, {
                                        title: el.title,
                                        artist: el.grandparentTitle,
                                        album: el.parentTitle,
                                        albumArt: `${base_url}${el.thumb}`,
                                        duration: el.Media[0].Part[0].duration/1000
                                    });
                                    window.ui.toastMessage(`${el.grandparentTitle} - ${el.title} added to the queue`);
                                } else {
                                    loadSectionElement(`${el.key}`);
                                }
                            }
                            result.appendChild(divEl);
                        }
                    }
                }
                section.appendChild(result);
            }
        });
        oReq.open('GET', `${PLEX_API_ENDPOINT}${path}`);
        oReq.send();
    }

    function loadSectionElements(sectionId, title, elements){
        section.getElementsByClassName('plex-section-list')[0].remove();

        let result = document.createElement('div');
        result.classList.add('plex-result');
        for(let i in elements){
            if(elements.hasOwnProperty(i)){
                let el = elements[i];
                if(el.hasOwnProperty("key") && el.hasOwnProperty("title")){
                    let divEl = document.createElement("div");
                    divEl.classList.add('plex-result-entry');
                    divEl.setAttribute("data-plex-key", el.key);
                    divEl.innerText = el.title;
                    divEl.onclick = ()=>{
                        console.log("Clicked");
                        console.log(`Loading ${sectionId} - ${el.key}`);
                        loadSectionElement(`/library/sections/${sectionId}/${el.key}`);
                    }
                    result.appendChild(divEl);
                }
            }
        }
        section.appendChild(result);
    }
    
    loadSections();
})();