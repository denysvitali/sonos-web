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

                let data;
                if(json.MediaContainer.Metadata != null){
                    data = json.MediaContainer.Metadata;
                } else {
                    data = json.MediaContainer.Directory;
                }

                try{
                    section.getElementsByClassName('plex-result')[0].remove();
                    section.getElementsByClassName('plex-add-all-button')[0].remove();
                } catch(e){

                }
                
                let add_all_button = document.createElement('button');
                add_all_button.classList.add('plex-add-all-button');
                add_all_button.innerText = 'Add all to queue';

                let elementList = [];

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

                            if(el.thumb != null){
                                let img = document.createElement("img");
                                img.classList.add("plex-result-picture");
                                img.setAttribute("src", `${PLEX_API_ENDPOINT}${el.thumb}`);
                                divEl.appendChild(img);
                            }

                            let base_url, track_url, metadata;

                            if(el.type == 'track'){
                                base_url = `http://${SonosWeb._ipaddress}:${SonosWeb._port}${PLEX_API_ENDPOINT}`
                                track_url = `${base_url}${el.Media[0].Part[0].key}`;
                                metadata = {
                                    title: el.title,
                                    artist: el.grandparentTitle,
                                    album: el.parentTitle,
                                    albumArt: `${base_url}${el.thumb}`,
                                    duration: el.Media[0].Part[0].duration / 1000
                                };
                                elementList.push({url: track_url, metadata: metadata});
                            }
                            

                            divEl.appendChild(divText);
                            divEl.onclick = ()=>{
                                if(el.type === 'track'){
                                    window.ui._playManager.playMp3(track_url, metadata);
                                    window.ui.toastMessage(`${el.grandparentTitle} - ${el.title} added to the queue`);
                                } else {
                                    if(el.fastKey != null){
                                        loadSectionElement(el.fastKey);
                                    } else {
                                        loadSectionElement(el.key);
                                    }
                                }
                            }
                            result.appendChild(divEl);
                        }
                    }
                }

                add_all_button.onclick = () => {
                    let prom = [];
                    if (elementList.length == 0){
                        return;
                    }
                    for(let i in elementList){
                        prom.push(
                            window.ui._playManager.playMp3Promise(
                                elementList[i].url,
                                elementList[i].metadata,
                                (answer)=>{
                                    console.log(`${i} added. Answer: ${answer}`);
                                }
                            ));
                    }

                    for(let i = 0; i<=prom.length-2; i++){
                        prom[i].then(prom[i+1]);
                    }
                    prom[prom.length - 1].then(()=>{
                        window.ui.toastMessage(`${elementList.length} elements added to the queue.`);
                    });
                }

                section.appendChild(add_all_button);
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
                    
                    let divText = document.createElement("div");
                    divText.classList.add("plex-result-title");
                    divText.innerText = el.title;

                    divEl.appendChild(divText);

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