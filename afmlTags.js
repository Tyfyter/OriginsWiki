let headRequests = {};
function requestHead(url) {
	if (new URL(url, document.baseURI).origin !== document.location.origin) return new Promise((resolve) => resolve({ status: 0 }));
	return headRequests[url] ??= fetch(url, {method: "HEAD"});
}
var aLinkSuffix = '.html';
var pageName = document.location.pathname.split('/').pop().replaceAll('.html', '') || 'index';
pageName = decodeURI(pageName);
if (document.location.protocol === 'https:' && document.location.hostname !== '127.0.0.1'){
	aLinkSuffix = '';
}
function processImagePath(path) {
	return `${path.startsWith("§")?"":"Images/"}${path}`.replaceAll('§ModImage§', 'https://raw.githubusercontent.com/Tyfyter/Origins/master') + '.png';
}
let pageRequests = {};
let pageRequestLock = {};
async function getPageText(url) {
	if (pageRequests[url] === undefined) {
		pageRequests[url] ??= fetch(url);
	}
	if (pageRequests[url] instanceof Promise) {
		while(pageRequestLock[url]);
		pageRequestLock[url] = true;
		try {
			pageRequests[url] = await (await pageRequests[url]).text();
		} finally {
			pageRequestLock[url] = false;
		}
	}
	return pageRequests[url];
}
var aStats = {};
async function getStats(name) {
	var value = await aStats[name];
	if(value === undefined){
		var v = await (aStats[name] = getPageText('stats/'+name + '.json'));
		value = aStats[name] = JSON.parse(v.startsWith('<!DOCTYPE html>') ? null : v);
	}
	return value;
}
getStats(pageName);

function createElementWithTextAndAttributes(tag, text) {
	let element = document.createElement(tag);
	element.innerHTML = text;
	for (let index = 2; index < arguments.length; index++) {
		element.setAttribute(...arguments[index]);
	}
	return element;
}

Object.defineProperty(HTMLElement.prototype, "createChild", {
    value: function createChild(tag, contents) {
		let element = document.createElement(tag);
		if (contents) element.innerHTML = contents;
		this.appendChild(element);
		for (let index = 2; index < arguments.length; index++) {
			element.setAttribute(...arguments[index]);
		}
		return element;
    },
    writable: true,
    configurable: true,
}); 

class AFMLImg extends HTMLElement {
	static observedAttributes = ["src", "alt"];
	child;
	constructor() {
		// Always call super first in constructor
		super();
		//this.textContent = "";
		this.classList.add('picturebox');
		this.child ??= document.createElement('img');
		this.child.setAttribute('style', 'width: inherit;');
		this.appendChild(this.child);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'src':
			this.child.setAttribute('src', newValue);
			break;
			case 'alt':
			if (this.attributes['alt']) this.child.setAttribute('alt', newValue);
			else this.child.removeAttribute('alt');
			break;
		}
		//console.log(name, oldValue, newValue);
	}
}
customElements.define("a-img", AFMLImg);
class AFMLLink extends HTMLAnchorElement { // can be created with document.createElement('a', {is: 'a-link' })
	static observedAttributes = ["href", "image"];
	image;
	constructor() {
		// Always call super first in constructor
		super();
		let _notes = this.getElementsByTagName('note');
		let notes = [];
		for (let i = 0; i < _notes.length; i++) {
			const element = _notes[i];
			notes.push(element);
			element.parentNode.removeChild(element);
		}
		if (!this.hasAttribute('href')) {
			let targetPage = this.textContent.replaceAll(' ', '_');
			if (aliases[targetPage]) {
				targetPage = aliases[targetPage];
			}
			if (new URL(targetPage, document.baseURI).origin === new URL(document.location).origin) targetPage = targetPage.replaceAll('.html', '') + aLinkSuffix;
			this.setAttribute('href', targetPage);
		}
		if (new URL(this.getAttribute('href'), document.baseURI).href == document.location) {//self link
			this.classList.add('selflink');
			this.removeAttribute('href');
		}
		this.image = document.createElement('img');
		this.insertBefore(this.image, this.firstChild);
		if (notes) {
			let noteContainer = document.createElement('span');
			noteContainer.classList.add('linkandnote');
			let index = 0;
			while (this.childNodes.length > index) {
				const element = this.childNodes[index];
				if (element.nodeName === 'IMG') {
					index++;
					continue;
				}
				noteContainer.appendChild(element);
			}
			for (let i = 0; i < notes.length; i++) {
				notes[i].classList.add('linknote');
				noteContainer.appendChild(notes[i]);
			}
			this.appendChild(noteContainer);
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'href': {
				requestHead(newValue).then((v) => {
					if (v.status == 404) this.classList.add('redlink');
					else this.classList.remove('redlink');
				});
				break;
			}
			case 'image': {
				this.setImage(newValue);
				break;
			}
		}
	}
	setImage(path) {
		if (path === '$fromStats') {
			path = this.href.replaceAll('.html', '').split('/');
			path = path[path.length - 1];
			getStats(path).then((v) => {
				this.setImage(v.Image);
			});
		} else {
			this.image.src = processImagePath(path);
		}
	}
}
customElements.define("a-link", AFMLLink, { extends: "a" });

class AFMLSnippet extends HTMLElement { // can be created with document.createElement('a', {is: 'a-link' })
	static observedAttributes = ["href", "pluck"];
	button;
	content;
	constructor() {
		// Always call super first in constructor
		super();
		let text = this.textContent;
		this.textContent = "";
		this.button = document.createElement('a');
		this.button.classList.add('snippetButton');
		this.button.textContent = text;
		this.appendChild(this.button);

		this.content = document.createElement('span');
		this.content.classList.add('snippetContent');
		this.appendChild(this.content);
		if (!this.hasAttribute('href')) {
			this.setAttribute('open', '');
			this.content.textContent = "snippet is missing href attribute";
			return;
		}
		if (this.hasAttribute('hidden')) {
			this.setAttribute('open', '');
		}
		this.button.href = 'javascript:void(0)';
		this.button.onclick = () => {
			if (this.hasAttribute('open')) {
				this.removeAttribute('open');
			} else {
				this.setAttribute('open', '');
			}
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		let contentID = 'snippetContent' + this.getAttribute('href') + this.getAttribute('pluck');
		if (this.content.id === contentID) return;
		this.content.id = contentID;
		getPageText(this.getAttribute('href')).then(async (v) => {
			this.content.innerHTML = v;
			let pluckSelector = this.getAttribute('pluck');
			//console.debug('pluck: ', pluckSelector, ' from ', content.children);
			if (pluckSelector) {
				let children = this.content.querySelectorAll(pluckSelector);
				this.content.innerHTML = "";
				for (var i = 0; i < children.length; i++) {
					this.content.appendChild(children[i]);
				}
			}
			await parseAFML(false, this.content.id);
		});
	}
}
customElements.define("a-snippet", AFMLSnippet);

class AFMLCoins extends HTMLElement {
	constructor() {
		// Always call super first in constructor
		super();
		this.classList.add('coins');
		let count = parseInt(this.textContent);
		this.textContent = '';
		this.createCoin('platinum', count / (100 * 100 * 100));
		this.createCoin('gold', (count / (100 * 100)) % 100);
		this.createCoin('silver', (count / (100)) % 100);
		this.createCoin('copper', count % 100);
	}
	createCoin(type, count) {
		count = Math.floor(count);
		if (count == 0) return;
		this.createChild('span', count, ['class', type]);
	}
}
customElements.define("a-coins", AFMLCoins);

class AFMLRecipes extends HTMLElement {
	constructor() {
		// Always call super first in constructor
		super();
		if (!this.innerHTML.startsWith('{') && !this.innerHTML.startsWith('[')) return;
		//console.log('['+this.textContent+']');
		let sections = eval('['+this.innerHTML+']');
		this.textContent = '';
		let table = this.createChild('table', '', ['class', 'recipetable'], ['cellspacing', '0']);
		let head = table.createChild('thead');
		let row = head.createChild('tr');
		row.createChild('th', 'Result');
		row.createChild('th', 'Ingredients', ['class', 'middle']);
		row.createChild('th').createChild('a', 'Crafting Station', ['href', 'https://terraria.wiki.gg/wiki/Crafting_stations']);

		let body = table.createChild('tbody');
		for(let j = 0; j < sections.length; j++){
			console.log(sections[j]);
			this.processRecipeBlock(sections[j], body);
		}
	}
	processRecipeBlock(data, body){
		let stations = '<a href="https://terraria.wiki.gg/wiki/By_Hand">By Hand</a>';
		if(data.stations){
			console.log(data.stations);
			if(Array.isArray(data.stations)){
				stations = '';
				for(var j = 0; j < data.stations.length; j++){
					if(j>0){
						stations += '<br><div class="or">or</div><br>';
					}
					stations += data.stations[j];
				}
			}else{
				stations = data.stations;
			}
		}
		for(var i = 0; i < data.items.length; i++){
			let row = document.createElement('tr');
			row.createChild('td', data.items[i].result);
			let ingredientList = row.createChild('td', '', ['class', 'middle']);
			for(var j = 0; j < data.items[i].ingredients.length; j++){
				if(j>0){
					ingredientList.appendChild(document.createElement('br'));
				}
				this.parse(data.items[i].ingredients[j], ingredientList);
			}
			if(i <= 0) {
				row.createChild('td', stations, ['rowspan', data.items.length]);
			}
			body.append(row);
		}
	}
	parse(text, parent) {
		let span = document.createElement('span');
		span.innerHTML = text;
		while (span.childNodes.length) {
			parent.appendChild(span.childNodes[0]);
		}
		if (span.parentElement) span.parentElement.removeChild(span);
	}
}
customElements.define("a-recipes", AFMLRecipes);

class AFMLStat extends HTMLElement {
	constructor() {
		// Always call super first in constructor
		super();
		this.classList.add('stat');
		let stat = this.textContent.replace(' ', '_').split('.');
		getStats(stat[0]).then((v) => {
			for(var i = 1; i < stat.length; i++){
				v = v[stat[i]];
			}
			this.innerHTML = v;
		});
	}
}
customElements.define("a-stat", AFMLStat);