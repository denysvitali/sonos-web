'use strict';
class UIDebugEv{
	constructor(ui){
		this._ui = ui;
		this.elements = {};
		this.elements.roomSelector = document.querySelector('.ui-debug>div.select-room>select');
	}

	run(){
		console.log('run()',this.elements.roomSelector);
		this.elements.roomSelector.addEventListener('change', ()=>{
			var value = document.querySelector('.ui-debug>div.select-room>select>option:checked').value;
			console.log(value);
			this._ui.autoHeroMenuImage(value);
		});
	}
}

export default UIDebugEv;