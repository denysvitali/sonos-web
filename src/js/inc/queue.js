'use strict';

class Queue {
  
  constructor(ui) {
      this._ui = ui;
  }
  
  run(){
    window.ui.on('queue', ()=>{
      this.updateQueue();
    });
    this.updateQueue();
  }
  
  updateQueue(){
    let elements = document.querySelectorAll('div#content>div.queue>div.queue-el');
    for (let i in elements) {
        if(elements.hasOwnProperty(i)){
          elements[i].classList.remove('playing');
        }
    }
    let el = document.querySelector('div#content>div.queue>div.queue-el:nth-child(0n + ' + window.SonosStatus.positionInQueue + ')');
    if (el !== null){
      el.classList.add('playing');
    }
  }

}

export
default Queue;
