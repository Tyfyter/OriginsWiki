let errors = [];
window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
    errors.push({mesage: errorMsg, line: lineNumber, url: url});
    return false;
}
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
function getLinkSuffix(url) {
	if (new URL(url, document.baseURI).origin !== document.location.origin) return '';
	return aLinkSuffix
}
function processImagePath(path) {
	return `${path.startsWith("§")?"":"Images/"}${path}`.replaceAll('§ModImage§', 'https://raw.githubusercontent.com/Tyfyter/Origins/master') + '.png';
}
let rarityOrder = {
	Master: -13,
	Expert: -12,
	Quest: -11,
	Gray: -1,
	White: 0,
	Blue: 1,
	Green: 2,
	Orange: 3,
	LightRed: 4,
	Pink: 5,
	LightPurple: 6,
	Lime: 7,
	Yellow: 8,
	Cyan: 9,
	AltCyan: 9,
	Red: 10,
	Purple: 11,
	Butterscotch: 12,
	Crimson: 13,
	RoyalBlue: 14
}
class AsyncLock {
	constructor () {
		this.disable = () => {}
		this.promise = Promise.resolve()
	}

	enable () {
		this.promise = new Promise(resolve => this.disable = resolve)
	}
	static createLock() {
		let lock = new AsyncLock();
		lock.enable();
		return lock;
	}
}
let pageRequests = {};
let pageRequestLock = {};
async function getPageText(url) {
	if (pageRequests[url] === undefined) {
		pageRequests[url] ??= fetch(encodeURI(url));
	}
	if (pageRequests[url] instanceof Promise) {
		pageRequests[url] = await pageRequests[url];
		if (pageRequests[url].status === 404) pageRequests[url] = null;
	}
	if (pageRequests[url] === null) return null;
	if (pageRequestLock[url]) await pageRequestLock[url].promise;
	else pageRequestLock[url] = AsyncLock.createLock();
	if (pageRequests[url].text) {
		pageRequests[url] = await pageRequests[url].text();
		pageRequestLock[url].disable();
	}
	return await pageRequests[url];
}
var _aliases = getPageText('aliases.json');
var defaultStats;

var aliases = false;
async function getAliases(){
	if (!aliases) {
		try {
			aliases = JSON.parse(await _aliases);
		} catch (error) {
			aliases = {};
		}
	}
	return aliases;
}
getAliases();
var aStats = {};
let statRequestLock = {};
async function getStats(name) {
	if(aStats[name] === undefined){
		aStats[name] = getPageText('stats/'+name + '.json');
	}
	if (aStats[name] === null) return null;
	if (statRequestLock[name]) await statRequestLock[name].promise;
	else statRequestLock[name] = AsyncLock.createLock();
	if (aStats[name] instanceof Promise) {
		let v = await aStats[name];
		try {
			if (!v || v.startsWith('<!DOCTYPE html>')) {
				aStats[name] = null;
			} else {
				aStats[name] = JSON.parse(v);
				let buffTasks = [];
				if (aStats[name].Buffs) {
					for (let i = 0; i < aStats[name].Buffs.length; i++) {
						let buff = aStats[name].Buffs[i];
						if (buff.src) {
							let index = i;
							let task = getStats(buff.src);
							task.then(v => {
								aStats[name].Buffs[index] = Object.assign(buff, v)
							});
							buffTasks.push(task);
						}
					}
				}
				if (aStats[name].Debuffs) {
					for (let i = 0; i < aStats[name].Debuffs.length; i++) {
						let buff = aStats[name].Debuffs[i];
						if (buff.src) {
							let index = i;
							let task = getStats(buff.src);
							task.then(v => {
								aStats[name].Debuffs[index] = Object.assign(buff, v)
							});
							buffTasks.push(task);
						}
					}
				}
				await Promise.all(buffTasks);
			}
		} catch (error) {
			console.error(error, v);
		}
	}
	statRequestLock[name].disable();
	return await aStats[name];
}
getStats(pageName);

let mapLock;

var _siteMap = getPageText('https://tyfyter.github.io/OriginsWiki/sitemap.xml');
async function getSiteMap(){
	if(typeof await _siteMap === 'string'){
		mapLock = AsyncLock.createLock();
		var siteMap = parseXMLSitemap(await _siteMap);
		var allPages = [];
		for(var i0 = 0; i0 < siteMap.children[0].children.length; i0++){
			var child = siteMap.children[0].children[i0];
			for(var i1 = 0; i1 < child.children.length; i1++){
				if(child.children[i1].tagName === 'loc'){
					var pageName = child.children[i1].firstChild.nodeValue.split('/');
					pageName = pageName[pageName.length - 1].replaceAll('.html', '') || 'index';
					allPages.push(pageName.replaceAll('.html', ''));
					break;
				}
			}
		}
		_siteMap = allPages;
		mapLock.disable();
	} else await mapLock;
	return await _siteMap;
}
getSiteMap();
const delay = ms => new Promise(res => setTimeout(res, ms));

function createElementWithTextAndAttributes(tag, text) {
	let element = document.createElement(tag);
	element.innerHTML = text;
	for (let index = 2; index < arguments.length; index++) {
		element.setAttribute(...arguments[index]);
	}
	return element;
}

function createHeader(parent, text) {
	let header = parent.createChild('div', '', ['class', 'header']);
	header.createChild('span', '', ['class', "padding"], ['style', "padding-left: 7.5px;"]);
	header.createChild('span', text, ['class', "text"]);
	header.createChild('span', '', ['class', "padding"], ['style', "flex-grow: 1;"]);
}

Object.defineProperty(HTMLElement.prototype, "createChild", {
    value: function createChild(tag, contents) {
		let element = document.createElement(tag);
		if (tag === 'a-link') element = document.createElement('a', { is: tag });
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
		super();
	}
	connectedCallback(){
		this.setup();
	}
	setup(){
		if (this.child) return;
		this.classList.add('picturebox');
		this.child ??= document.createElement('img');
		this.child.onclick = this.onClickImage.bind(this);
		this.insertBefore(this.child, this.firstChild);
	}
	onClickImage() {
		document.getElementById('imageViewer').style.display = '';
		document.getElementById('imageViewer_image').src = this.getAttribute('src');
		document.getElementById('imageViewer_caption').textContent = this.textContent;
	}

	attributeChangedCallback(name, oldValue, newValue) {
		this.setup();
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
		super();
		this.image = document.createElement('img');
		this.insertBefore(this.image, this.firstChild);
	}
	connectedCallback(){
		if (this.image.parentNode === null) this.insertBefore(this.image, this.firstChild);
		this.classList.add('link');
		let _notes = this.getElementsByTagName('note');
		let notes = [];
		for (let i = 0; i < _notes.length; i++) {
			const element = _notes[i];
			notes.push(element);
			element.parentNode.removeChild(element);
		}
		let target = this.getAttribute('href');
		if (!target && !this.classList.contains('selflink')) {
			let targetPage = this.textContent.replaceAll(' ', '_');
			if (aliases[targetPage]) {
				targetPage = aliases[targetPage];
			}
			if (new URL(targetPage, document.baseURI).origin === new URL(document.location).origin) {
				targetPage = targetPage.replaceAll('.html', '');
				getSiteMap().then(this.matchCapitalsToPage.bind(this));
			}
			target = targetPage;
		} else if (target) {
			target = target.replaceAll('.html', '');
			if (aliases[target]) {
				target = aliases[target];
			}
		}
		if (new URL(target, document.baseURI).href == document.location) {//self link
			this.classList.add('selflink');
			this.removeAttribute('href');
		} else if (target) {
			target += getLinkSuffix(target);
			if (target != this.getAttribute('href')) {
				this.setAttribute('href', target);
			}
		}
		if (notes.length) {
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
		for (let i = this.childNodes.length - 1; i > 0; i--) {
			let child = this.childNodes[i];
			if (child.nodeName === 'IMG' && child != this.image) {
				this.removeChild(child);
			}
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (newValue === oldValue) return;
		if (this.image.parentNode === null) this.insertBefore(this.image, this.firstChild);
		//console.log(this, name, newValue);
		switch (name) {
			case 'href': {
				if (new URL(newValue, document.baseURI).href == document.location) {//self link
					this.classList.add('selflink');
					this.removeAttribute('href');
				} else if (newValue) {
					this.classList.remove('selflink');
					requestHead(newValue).then((v) => {
						if (this.getAttribute('href') != newValue) return;
						if (v.status == 404) this.classList.add('redlink');
						else this.classList.remove('redlink');
					});
				}
				break;
			}
			case 'image': {
				this.setImage(newValue);
				break;
			}
		}
	}
	setImage(path) {
		if(!path){
			this.image.style.display = 'none';
		} else if (path === '$fromStats') {
			path = (this.href || this.textContent.replaceAll(' ', '_')).replaceAll('.html', '').split('/');
			path = path[path.length - 1];
			getStats(path).then((v) => {
				if (v) {
					if (v.Image) {
						this.setImage(v.Image);
					} else if (v.Images) {
						this.setImage(v.Images[0]);
					}
				}
			});
		} else {
			this.image.src = processImagePath(path);
			this.image.style.display = '';
		}
		this.classList.remove('hideText');
		if (this.hasAttribute('imageOnly') && this.image.src) {
			this.classList.add('hideText');
		}
	}
	matchCapitalsToPage(result) {
		let targetPage = this.getAttribute('href').replaceAll('.html', '');
		let target = result.find(e => !e.localeCompare(targetPage, 'en', { sensitivity: 'base' }));
		if (target) this.setAttribute('href', target + getLinkSuffix(targetPage));
	}
}
customElements.define("a-link", AFMLLink, { extends: "a" });

class AFMLSnippet extends HTMLElement {
	static observedAttributes = ["src", "pluck"];
	button;
	content;
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		this.setup();
	}
	setup(){
		if (this.content) return;
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
		this.setup();
		let contentID = 'snippetContent' + this.getAttribute('src') + this.getAttribute('pluck');
		if (this.content.id === contentID) return;
		this.content.id = contentID;
		getPageText(this.getAttribute('src').replaceAll('.html', '') + aLinkSuffix).then(async (v) => {
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
	}
	connectedCallback(){
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

class AFMLCoin extends HTMLElement {
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		this.classList.add('coins');
		let type = this.textContent.trim().toLowerCase();
		this.textContent = '';
		this.createChild('span', '', ['class', type]);
	}
}
customElements.define("a-coin", AFMLCoin);

class AFMLToolStats extends HTMLElement {
	static observedAttributes = ["pick", "hammer", "axe"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		this.setup();
	}
	setup(){
		if (this.child) return;
		this.classList.add('toolstats');
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this.setup();
		this.textContent = '';
		this.createTool(this.getAttribute('pick'), 'Pickaxe power', 'https://terraria.wiki.gg/images/thumb/0/05/Pickaxe_icon.png/16px-Pickaxe_icon.png');
		this.createTool(this.getAttribute('hammer'), 'Hammer power', 'https://terraria.wiki.gg/images/thumb/0/05/Pickaxe_icon.png/16px-Pickaxe_icon.png');
		this.createTool(this.getAttribute('axe'), 'Axe power', 'Images/Axe_Icon.png');
	}
	createTool(amount, name, src) {
		if (!amount) return;
		let container = this.createChild('span', amount + "%", ['class', 'toolstat']);
		container.createChild('img', '',
			['title', name],
			['src', src],
			['decoding', "async"],
			['loading', "lazy"]
		);
	}
}
customElements.define("a-tool", AFMLToolStats);

class AFMLRecipes extends HTMLElement {
	static observedAttributes = ["src"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		if (!this.hasAttribute('src')) {
			let contents = this.innerHTML.trim();
			if (!contents.startsWith('{') && !contents.startsWith('[')) return;
			let sections = eval('['+contents+']');
			this.textContent = '';
			let table = this.createChild('table', '', ['class', 'recipetable'], ['cellspacing', '0']);
			let head = table.createChild('thead');
			let row = head.createChild('tr');
			row.createChild('th', 'Result');
			row.createChild('th', 'Ingredients', ['class', 'middle']);
			row.createChild('th').createChild('a', 'Crafting Station', ['href', 'https://terraria.wiki.gg/wiki/Crafting_stations']);
			
			let body = table.createChild('tbody');
			for(let j = 0; j < sections.length; j++){
				this.processRecipeBlock(sections[j], body);
			}
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'src') {
			getStats(newValue.replace(' ', '_')).then((value) => {
				let sections = this.hasAttribute('usedIn') ? value.UsedIn : value.Recipes;
				this.textContent = '';
				let table = this.createChild('table', '', ['class', 'recipetable'], ['cellspacing', '0']);
				let head = table.createChild('thead');
				let row = head.createChild('tr');
				row.createChild('th', 'Result');
				row.createChild('th', 'Ingredients', ['class', 'middle']);
				row.createChild('th').createChild('a', 'Crafting Station', ['href', 'https://terraria.wiki.gg/wiki/Crafting_stations']);
				
				let body = table.createChild('tbody');
				for (let i = 0; i < sections.length; i++) {
					this.processRecipeBlock(sections[i], body);
				}
			});
		}
	}
	processRecipeBlock(data, body){
		let stations = '<a href="https://terraria.wiki.gg/wiki/By_Hand">By Hand</a>';
		if(data.stations){
			if(Array.isArray(data.stations)){
				stations = '';
				for(var j = 0; j < data.stations.length; j++){
					if(j>0){
						stations += ' <strong>and</strong> ';
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
				row.createChild('td', `<span>${stations}</span>`, ['rowspan', data.items.length]);
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
	stats;
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		this.classList.add('stat');
		let stat = this.textContent.replace(' ', '_').split('.');
		getStats(stat[0]).then((v) => {
			this.stats = v;
			for(var i = 1; i < stat.length; i++){
				v = v[stat[i]];
			}
			this.innerHTML = AFMLStat.formatStat(stat[stat.length - 1], v, this);
		});
	}
	static formatStat(name, stat, self) {
		switch (name) {
			case 'Coins':
			return `<a-coins>${stat}</a-coins>`;
			case 'Drops':
			let drops = '';
			for (let i = 0; i < stat.length; i++) {
				const item = stat[i];
				if (item.Name) {
					let extraAttributes = '';
					if (item.hasOwnProperty('LinkOverride')) extraAttributes += ' linkOverride="' + item.LinkOverride + '"';
					if (item.hasOwnProperty('ImageOverride')) extraAttributes += ' imageOverride="' + item.ImageOverride + '"';
					drops += `<a-drop item="${item.Name}" amount="${item.Amount || ''}" chance="${item.Chance || ''}"${extraAttributes}></a-drop>`;
				} else {
					drops += item;
				}
			}
			return drops;
			case 'Images':
			var widthVal = self.stats.SpriteWidth ? self.stats.SpriteWidth : false;
			var images = [];
			let is2D = Array.isArray(self.stats.Images[0]);
			for (let i = 0; i < self.stats.Images.length; i++) {
				const image = self.stats.Images[i];
				if (is2D) {
					images[i] = [];
					for (let j = 0; j < image.length; j++) {
						images[i][j] = processImagePath(image[j]);
					}
				} else {
					images[i] = processImagePath(image);
				}
			}
			let container = self.createChild('div', '', ['class', 'statimagecontainer']);
			for (let j = 0; j < images.length; j++) {
				const element = images[j];
				if (is2D) {
					if (j > 0) {
						container.createChild('div', '', ['class', 'statimagedivider']);
					}
					let container2 = container.createChild('div', '', ['class', 'statimagecontainer']);
					for (let k = 0; k < element.length; k++) {
						AFMLStatBlock.createImage(element[k], widthVal && widthVal[j][k], container2);
					}
				} else {
					AFMLStatBlock.createImage(element, widthVal && widthVal[j], container);
				}
			}
			return container.outerHTML;
		}
		return stat;
	}
}
customElements.define("a-stat", AFMLStat);

class AFMLStatBlock extends HTMLElement {
	static observedAttributes = ["src"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		this.setup();
	}
	setup(){
		if (this.child) return;
		this.classList.add('ontab0');
		if (!this.hasAttribute('src')) {
			let value = new Function(`return ${this.innerHTML};`)();
			this.textContent = '';
			for (let i = 0; i < value.length; i++) {
				this.addContents(value[i]);
			}
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this.setup();
		getStats(newValue.replace(' ', '_')).then((v) => { this.doAutoStats(v) });
	}
	doAutoStats(stats) {
		if (!stats) {
			this.textContent = `Could not find stats for ${this.getAttribute('src')}`;
			return;
		}
		this.textContent = '';
		var values = [];
		var statistics = {header:"Statistics", items:[]};
		function labeled(value, text, href) {
			statistics.items.push({label:href ? `<a is="a-link" ${href ? 'href=' + href: ''}>${text}</a>` : text, value: value});
		}
		function valueOrValues(value, text, href){
			let obj = {label:href ? `<a is="a-link" ${href ? 'href=' + href: ''}>${text}</a>` : text};
			if (Array.isArray(value)) {
				obj.values = value;
			} else {
				obj.value = value;
			}
			statistics.items.push(obj);
		}
    	if(stats.Images){
			var widthVal = stats.SpriteWidth ? stats.SpriteWidth: false;
			var images = [];
			let is2D = Array.isArray(stats.Images[0]);
			for (let i = 0; i < stats.Images.length; i++) {
				const image = stats.Images[i];
				if (is2D) {
					images[i] = [];
					for (let j = 0; j < image.length; j++) {
						images[i][j] = processImagePath(image[j]);
					}
				} else {
					images[i] = processImagePath(image);
				}
			}
        	values.push({
				header: stats.Name || this.getAttribute('src').replaceAll('_',' '),
				items: [{images: images, spriteWidth:widthVal}]
			});
    	} else if(stats.Image){
			var widthVal = stats.SpriteWidth ? stats.SpriteWidth: false;
        	values.push({
				header: stats.Name || this.getAttribute('src').replaceAll('_',' '),
				items:[{image: processImagePath(stats.Image), spriteWidth:widthVal}]
			});
    	}
		if (stats.Types && stats.Types.includes("Item")) {
			var setSuffix = stats.Types.includes("ArmorSet") ? '(set)' : '';
			if (stats.PickPower || stats.HammerPower || stats.AxePower) {
				statistics.items.push({
					literalvalue: `<a-tool ${stats.PickPower ? 'pick=' + stats.PickPower : ''} ${stats.HammerPower ? 'hammer=' + stats.HammerPower : ''} ${stats.AxePower ? 'axe=' + stats.AxePower : ''}></a-tool>`
				});
			}
			if (stats.FishPower) labeled(stats.FishPower+'%', 'Fishing power', 'https://terraria.wiki.gg/wiki/Fishing');
			if (stats.BaitPower) labeled(stats.BaitPower+'%', 'Bait power', 'https://terraria.wiki.gg/wiki/Bait');
			if (stats.PickReq || stats.HammerReq) {
				statistics.items.push({
					literalvalue: `<a-tool ${stats.PickReq ? 'pick=' + stats.PickReq : ''} ${stats.HammerReq ? 'hammer=' + stats.HammerReq : ''}></a-tool>`
				});
			}
			if(stats.LightIntensity|| stats.LightColor){
				var torchIcon = '';
				var torchIntensity = stats.LightIntensity || '';
				if (stats.LightColor) {
					torchIcon = `<img src="Images/Torch_Icon.png" style="mix-blend-mode: screen;background-color: ${
						`rgb(${(stats.LightColor[0]) * 255}, ${(stats.LightColor[1]) * 255}, ${(stats.LightColor[2]) * 255})`
					};">`;
				}
				statistics.items.push({
					literalvalue: torchIcon + torchIntensity
				});
			}
			if (stats.PlacementSize) labeled(`yes (${stats.PlacementSize[0]}x${stats.PlacementSize[1]})`, 'Placeable', 'https://terraria.wiki.gg/wiki/Placement');
			if (stats.Defense) {
				labeled(stats.Defense + setSuffix, 'Defense', 'https://terraria.wiki.gg/wiki/Defense');
				if (stats.Tooltip) valueOrValues(stats.Tooltip, 'Tooltip', 'https://terraria.wiki.gg/wiki/Tooltips');
			}
			if (stats.SetBonus) labeled(stats.SetBonus, 'Set Bonus', 'https://terraria.wiki.gg/wiki/Armor');
			if (stats.ArmorSlot) labeled(stats.ArmorSlot, 'Armor Slot');
			if (stats.Damage) labeled(stats.Damage + (stats.DamageClass ? ` (${stats.DamageClass})`: ''), 'Damage');
			if (stats.ArmorPenetration) labeled(stats.ArmorPenetration, 'Armor Penetration', 'https://terraria.wiki.gg/wiki/Defense#Armor_penetration');
			if (stats.Knockback) labeled(stats.Knockback, 'Knockback', 'https://terraria.wiki.gg/wiki/Knockback');
			if (stats.ManaCost) labeled(stats.ManaCost, 'Mana cost', 'https://terraria.wiki.gg/wiki/Mana');
			if (stats.HealLife) labeled(stats.HealLife, 'Heals Health', 'https://terraria.wiki.gg/wiki/Health');
			if (stats.HealMana) labeled(stats.HealMana, 'Heals mana', 'https://terraria.wiki.gg/wiki/Mana');
			if (stats.Crit) labeled(stats.Crit, 'Critical chance', 'https://terraria.wiki.gg/wiki/Critical_hit');
			if (stats.UseTime) labeled(`${stats.UseTime} (${GetSpeedName(stats.UseTime)})`, 'Use time', 'https://terraria.wiki.gg/wiki/Use_Time');
			if (stats.Velocity) labeled(stats.Velocity, 'Velocity', 'https://terraria.wiki.gg/wiki/Velocity');
			if (stats.Tooltip && !stats.Defense) {
				if (stats.Tooltip) valueOrValues(stats.Tooltip, 'Tooltip', 'https://terraria.wiki.gg/wiki/Tooltips');
			}
			if (stats.Rarity) labeled(`<a-rarity>${stats.Rarity}</a-rarity>`, 'Rarity', 'Rarity');
			if (stats.Buy) labeled(`<a-coins>${stats.Buy}</a-coins>`, 'Buy', 'https://terraria.wiki.gg/wiki/Value');
			if (stats.Sell) labeled(`<a-coins>${stats.Sell}</a-coins>`, 'Sell', 'https://terraria.wiki.gg/wiki/Value');
			if (stats.Research) labeled(`<abbr class="journey" title="Journey Mode">${stats.Research} required</abbr>`, 'Research', 'https://terraria.wiki.gg/wiki/Journey_Mode#Research');
		}
		var normalTabClass = (stats.Expert || stats.Master) ? 'onlytab0' : false;
		var _expertClass = 'onlytab1';
		var _masterClass = stats.Expert ? 'onlytab2' : 'onlytab1';
		const getTabClass = (val) => {
			return (stats.Expert && stats.Expert[val]) || (stats.Master && stats.Master[val])? normalTabClass : false;
		};
		function addStat(area, label, propertyName, dataProcessor = null){
			let valueClass = getTabClass(propertyName);
			let value = {label:label};
			if (valueClass) value.class = valueClass;
			let propertyValue = stats[propertyName];
			if (propertyValue) {
				propertyValue = AFMLStat.formatStat(propertyName, propertyValue);
				//if (dataProcessor) propertyValue = dataProcessor(propertyValue);
				value[`value${Array.isArray(propertyValue)?'s':''}`] = propertyValue;
				area.items.push(value);
			}
			if (stats.Expert) {
				value = {label:label, class:_expertClass, valueClass:'expert'};
				propertyValue = stats.Expert[propertyName];
				if (propertyValue) {
					propertyValue = AFMLStat.formatStat(propertyName, propertyValue);
					//if (dataProcessor) propertyValue = dataProcessor(propertyValue);
					value[`value${Array.isArray(propertyValue)?'s':''}`] = propertyValue;
					area.items.push(value);
				}
			}
			if (stats.Master) {
				value = {label:label, class:_masterClass, valueClass:'master'};
				propertyValue = stats.Master[propertyName];
				if (propertyValue) {
					propertyValue = AFMLStat.formatStat(propertyName, propertyValue);
					//if (dataProcessor) propertyValue = dataProcessor(propertyValue);
					value[`value${Array.isArray(propertyValue)?'s':''}`] = propertyValue;
					area.items.push(value);
				}
			}
		}
		if (normalTabClass) {
			statistics.tabs = ['Normal'];
			if (stats.Expert) statistics.tabs.push({toString:()=>'Expert', class:'expert'});
			if (stats.Master) statistics.tabs.push({toString:()=>'Master', class:'master'});
		}
		if(stats.Types && stats.Types.includes("NPC")){
			addStat(statistics, '<a is="a-link" href="https://terraria.wiki.gg/wiki/Biome">Environment</a>', 'Biome');
			addStat(statistics, '<a is="a-link" href="https://terraria.wiki.gg/wiki/AI">AI Style</a>', 'AIStyle');
			addStat(statistics, 'Damage', 'Damage');
			addStat(statistics, 'Max Life', 'MaxLife');
			addStat(statistics, '<a is="a-link" href="https://terraria.wiki.gg/wiki/Defense">Defense</a>', 'Defense');
			addStat(statistics, '<a is="a-link" href="https://terraria.wiki.gg/wiki/Knockback">Knockback</a>', 'KBResist');
			addStat(statistics, 'Immune to', 'Immunities');
		}

		if (statistics.items.length) values.push(statistics);
		if (stats.Buffs) {
			var buffs = {header: `Grants buff${stats.Buffs.length > 1 ? 's' : ''}`, items:[]};
			for (let buffIndex = 0; buffIndex < stats.Buffs.length; buffIndex++) {
				const buff = stats.Buffs[buffIndex];
				buffs.items.push({label:'Buff', value:`<a is="a-link"${buff.Image ? (' image="' + buff.Image + '"') : ''}>${buff.Name}</a>`});
				if(buff.Tooltip){
					buffs.items.push({label:'Buff tooltip',value:buff.Tooltip});
				}
				if(buff.Chance){
					buffs.items.push({label:'Chance',value:buff.Chance});
				}
				if(buff.Duration){
					buffs.items.push({label:'Duration',value:buff.Duration});
				}
			}
			if (buffs.items.length > 0) values.push(buffs);
		}
		if (stats.Debuffs) {
			var buffs = {header: `Inflicts debuff${stats.Debuffs.length > 1 ? 's' : ''}`, items:[]};
			for (let buffIndex = 0; buffIndex < stats.Debuffs.length; buffIndex++) {
				const buff = stats.Debuffs[buffIndex];
				buffs.items.push({label:'Debuff', value:`<a is="a-link"${buff.Image ? (' image="' + buff.Image + '"') : ''}>${buff.Name}</a>`});
				if(buff.Tooltip){
					buffs.items.push({label:'Debuff tooltip',value:buff.Tooltip});
				}
				if(buff.Chance){
					buffs.items.push({label:'Chance',value:buff.Chance});
				}
				if(buff.Duration){
					buffs.items.push({label:'Duration',value:buff.Duration});
				}
			}
			if (buffs.items.length > 0) values.push(buffs);
		}
		if (stats.Pet) {
			values.push({header: `Summons <a href="https://terraria.wiki.gg/wiki/Pets">Pet</a>`, items:[
				{literalvalue: stats.Pet.Name, class: 'petname'},
				{image: processImagePath("Pets/" + stats.Pet.Image)}
			]});
		}
		if(stats.Drops || stats.Coins) {
			var loot = {header:"Drops", items:[]};
			addStat(loot, '<a is="a-link" href="https://terraria.wiki.gg/wiki/NPC_drops#Coin_drops">Coins</a>', 'Coins');
			addStat(loot, 'Items', 'Drops');
			values.push(loot);
		}
		for (let i = 0; i < values.length; i++) {
			this.addContents(values[i]);
		}
		if (stats.InternalName) this.createChild('div', 'Internal Name: ' + stats.InternalName, ['class', "internalname"]);
	}
	
	addContents(data) {
		if (data.header) createHeader(this, data.header);
		if (data.tabs && data.tabs.length > 1) {
			let container = this.createChild('div', '', ['class', 'tabnames']);
			for(var i = 0; i < data.tabs.length; i++){
				container.createChild('span', data.tabs[i].name || data.tabs[i], ['class', `tabname ${data.tabs[i].class || ''}`], ['onClick', `selectTab(event.srcElement,${i})`]);
			}
		}
		if(data.items){
			for(var i = 0; i < data.items.length; i++){
				const item = data.items[i];
				if (item.images) {
					let container = this.createChild('div', '', ['class', 'statimagecontainer']);
					const is2D = Array.isArray(item.images[0]);
					for (let j = 0; j < data.items[i].images.length; j++) {
						const element = data.items[i].images[j];
						if (is2D) {
							if (j > 0) {
								container.createChild('div', '', ['class', 'statimagedivider']);
							}
							let container2 = container.createChild('div', '', ['class', 'statimagecontainer']);
							for (let k = 0; k < element.length; k++) {
								AFMLStatBlock.createImage(element[k], item.spriteWidth && item.spriteWidth[j][k], container2);
							}
						} else {
							AFMLStatBlock.createImage(element, item.spriteWidth && item.spriteWidth[j], container);
						}
					}
				} else if(item.image) {
					AFMLStatBlock.createImage(item.image, item.spriteWidth, this);
				} else {
					let element = this.createChild('div', item.literalvalue || (item.label && `${item.label}: `));
					element.className = 'stat ' + (item.class || '');
					if(item.value) {
						let stat = element.createChild('span', item.value);
						if (item.valueClass) stat.classList = item.valueClass;
					} else if(item.values) {
						let stat = element.createChild('span', item.values.join('<br>'));
						stat.className = 'statvalues ' + (item.valueClass || '');
					}
				}
			}
		}
	}
	static createImage(src, width, container) {
		let image = container.createChild('img', '', ['src', src]);
		console.log(width);
		if (width) image.style.maxWidth = `min(${width}px, 90%)`;
		if (src.endsWith && src.endsWith('_Female.png')) image.title = 'female sprite';
	}
}
customElements.define("a-statblock", AFMLStatBlock);

class AFMLDrop extends HTMLElement {
	static observedAttributes = ["item", "amount", "chance", "conditions"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	lastAttr;
	attributeChangedCallback(name, oldValue, newValue) {
		let attr = '';
		for (let i = 0; i < this.attributes.length; i++) {
			attr += `${this.attributes[i].name} ${this.attributes[i].value}`;
		}
		if (attr === this.lastAttr) return;
		this.lastAttr = attr;
		getStats(this.getAttribute('item').replaceAll(' ', '_')).then((stats) => {
			let linkTarget = this.getAttribute('linkOverride') || (this.getAttribute('item').replaceAll(' ', '_') + aLinkSuffix);

			let image = stats && (stats.Image || (stats.Images && stats.Images[0]));
			if (this.hasAttribute('imageOverride')) image = this.getAttribute('imageOverride'); 

			let textContent = (stats && stats.Name) || this.getAttribute('item').replaceAll('_', ' ');
			//console.log(linkTarget, image, textContent);
			let text = `<a is="a-link" href="${linkTarget}" ${image ? `image="${image}"` : ''}>${textContent}</a> - `;
			if (this.getAttribute('amount')) text += `(${this.getAttribute('amount')}) `;
			text += this.getAttribute('chance') || '100%';
			//console.log(text);
			this.innerHTML = text;
			if (stats && stats.Drops) {
				for (let i = 0; i < stats.Drops.length; i++) {
					const item = stats.Drops[i];
					if (item.Name) {
						let extraAttributes = [];
						if (item.hasOwnProperty('LinkOverride')) extraAttributes.push(['linkOverride', item.LinkOverride]);
						if (item.hasOwnProperty('ImageOverride')) extraAttributes.push(['imageOverride', item.ImageOverride]);
						this.createChild('a-drop', '', 
							['item', item.Name],
							['amount', item.Amount || ''],
							['chance', item.Chance || ''],
							...extraAttributes
						);
					} else {
						this.createChild('div', item);
					}
				}
			}
		});
	}
}
customElements.define("a-drop", AFMLDrop);

class AFMLSortableList extends HTMLElement {
	static observedAttributes = ["src"];
	table;
	constructor() {
		// Always call super first in constructor
		super();
		this.table = this.createChild('table', '', ['class', 'sortablelist']);
	}
	connectedCallback(){
		if (!this.hasAttribute('src')) {
			try {
				let value = new Function(`return ${this.innerHTML.substring(0, this.innerHTML.length - this.table.outerHTML.length).trim()};`)();
				for (let i = this.childNodes.length - 1; i >= 0; i--) {
					let child = this.childNodes[i];
					if (child != this.table) {
						this.removeChild(child);
					}
				}
				this.setContents(value);
			} catch (error) {
				console.error(error, `return ${this.innerHTML.substring(0, this.innerHTML.length - this.table.outerHTML.length).trim()};`);
			}
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		getStats('statLists/'+newValue.replace(' ', '_')).then((v) => { this.doAutoSetup(v) });
	}
	async processExtension(data, name) {
		if (data.extends) {
			let parent = await this.processExtension(await getStats('statLists/' + data.extends.name), data.extends.name);
			try {
				data.headers = [];
				for (let index = 0; index < parent.headers.length; index++) {
					data.headers.push(parent.headers[index]);
				}
				if (data.extends.changes) {
					for (let index = 0; index < data.extends.changes.length; index++) {
						const change = data.extends.changes[index];
						let j = 0;
						for (j = 0; j < data.headers.length; j++) {
							if (data.headers[j] === change.name || (data.headers[j].name && data.headers[j].name === change.name)) {
								break;
							}
						}
						switch (change.type) {
							case 'remove':
							data.headers.splice(j, 1);
							break;
							case 'insertAfter':
							data.headers.splice(j + 1, 0, change.value);
							break;
						}
					}
				}
			} catch (error) {
				console.error(data.extends.name, error);
			}
		}
		return data;
	}
	doAutoSetup(data) {
		if (!data) {
			this.table.innerHTML = `could not find statList ${this.getAttribute('src')}`;
			return;
		}
		let processedData = this.processExtension(data, this.getAttribute('src'));
		getCategories().then(async (cats) => {
			await processedData;
			if (!(data.items instanceof Array)) data.items = [];
			var currentCat;
		
			if (!data.categories) {
				console.error(`stat list "${this.getAttribute('src')}" is missing categories`, data);
				return;
			}
			if (data.intersection) {
				currentCat = cats[data.categories[0]];
				try {
					for (var i = 0; i < currentCat.items.length; i++) {
						data.items.push(currentCat.items[i]);
					}
					for (var i = 1; i < data.categories.length; i++) {
						currentCat = cats[data.categories[i]];
						for (var j = 0; j < data.items.length; j++) {
							currentCat.items.includes(data.items[j]) || data.items.splice(j--,1);
						}
					}
				} catch (error) {
					console.error(error, Object.assign({}, data.categories), Object.assign({}, cats), 'intersection');
				}
			} else {
				try {
					for (var i = 0; i < data.categories.length; i++) {
						currentCat = cats[data.categories[i]];
						if (!currentCat) {
							console.error(`could not find category "${data.categories[i]}"`);
							continue;
						}
						for (var j = 0; j < currentCat.items.length; j++) {
							data.items.includes(currentCat.items[j]) || data.items.push(currentCat.items[j]);
						}
					}
				} catch (error) {
					console.error(error, Object.assign({}, data.categories), Object.assign({}, cats), 'all');
				}
			}
			this.setContents(data);
		});
	}
	async setContents(data) {
		//console.log(`processing sortable list:`, data);
		if (!defaultStats) defaultStats = await getStats("Defaults");

		let head = this.table.createChild('thead');
		let row = head.createChild('tr');
		if(data.headers[0] === 'Name'){
			data.headers[0] = {name:'Name', expr:"`<a is=\"a-link\" ${item.WikiName ? `href=\"${item.WikiName + aLinkSuffix}\"` : ''} image=\"$fromStats\">${item.Name}</a>`", sortIndex:'item.Name', noAbbr:true};
		}
		for(var j = 0; j < data.headers.length; j++){
			if(data.headers[j] === 'Rarity'){
				data.headers[j] = {name:'Rarity', expr:"`<a-rarity>${item.Rarity}</a-rarity>`", sortIndex:'rarityOrder[item.Rarity]', noAbbr:true};
			}
			let th = row.createChild('th');
			if (j>0&&j<data.headers.length) th.classList.add('notleft');
			let index = j;
			th.onclick = (event) => clickSortableList(event, index);
			let text = data.headers[j].expr ? data.headers[j].name : data.headers[j];
			if (data.headers[j].expr && !data.headers[j].noAbbr) {
				th.createChild('abbr', text, ['title', data.headers[j].expr.replaceAll('item.','')]);
			} else {
				th.createChild('span', text);
			}
		}
		let body = this.table.createChild('tbody');
		for(var i = 0; i < data.items.length; i++){
			row = body.createChild('tr');
			let promise = data.items[i] instanceof Object ? Promise.resolve({ isManualValue: true, value: data.items[i] }) : getStats(data.items[i]);
			let tableItems = [];
			for(var j = 0; j < data.headers.length; j++) {
				let attributes = [];
				if (j>0&&j<data.headers.length) attributes.push(['class', 'notleft']);
				tableItems.push(row.createChild('td', '', ...attributes));
			}
			let actualI = i;
			promise.then((v) => {
				try {
					var item;
					if(v.isManualValue){
						item = v.value;
					}else{
						item = Object.assign({}, v);
						item.WikiName = data.items[actualI];
					}
					if(!item.Name && !(data.items[actualI] instanceof Object)){
						item.Name = data.items[actualI];
					}
					for(let key in defaultStats){
						if(!item.hasOwnProperty(key)){
							item[key] = defaultStats[key];
						}
					}
					for(var j = 0; j < data.headers.length; j++){
						var displayValue = item[data.headers[j]];
						if (data.headers[j].expr){
							try {
								displayValue = new Function('item', 'return '+data.headers[j].expr+';')(item);
							} catch (error) {
								console.error(`error while evaluating ${data.headers[j].expr} for ${v}`, item, error);
							}
						}
						if (Array.isArray(displayValue)) {
							displayValue = displayValue.join('<br>');
						}
						if (displayValue !== undefined) tableItems[j].innerHTML = displayValue;
						if (data.headers[j].sortIndex) tableItems[j].createChild('span', new Function('item', 'return '+data.headers[j].sortIndex+';')(item), ['class', 'sortindex']);
					}
				} catch (error) {
					console.error(error, actualI, data, data.items[actualI]);
				}
			});
		}
	}
}
customElements.define("a-sortablelist", AFMLSortableList);

class AFMLBiomeContents extends HTMLElement {
	static observedAttributes = ["src"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		if (!this.hasAttribute('src')) {
			if (!this.innerHTML.trim().startsWith('{')) return;
			try {
				let value = new Function(`return [${this.innerHTML}];`)();
				this.textContent = '';
				for (let i = 0; i < value.length; i++) {
					this.processBiomeContents(value[i], this);
				}
			} catch (error) {
				console.error(error, this.innerHTML);
			}
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		getStats('biomeContents/'+newValue.replace(' ', '_')).then((value) => { 
			for (let i = 0; i < value.length; i++) {
				this.processBiomeContents(value[i], this);
			}
		});
	}
	async processBiomeContents(data, parent){
		if(data.header) createHeader(parent, data.header);
		if(data.items){
			for(var i = 0; i < data.items.length; i++){
				if(typeof data.items[i] === 'string' || data.items[i] instanceof String){
					let span = parent.createChild('span');
					if(data.items[i].startsWith('&amp;')){
						span.appendChild(document.createTextNode(data.items[i].substring('&amp;'.length)));
					} else {
						span.createChild('a-link', data.items[i]);
					}
				}else if(data.items[i] instanceof Array){
					let span = parent.createChild('span');
					let text = data.items[i][0];
					if (data.items[i].length > 3) text += `<note>${data.items[i][3]}</note>`;
					let link = span.createChild('a-link', text);
					const pass = (index, name) => (data.items[i].length > index && data.items[i][index]) && link.setAttribute(name, data.items[i][index]);
					pass(1, 'image');
					pass(2, 'href');
				}else{
					let classes = "subcontents";
					let attributes = [];
					if(data.items[i]) {
						if(data.items[i].class) classes += ' '+data.items[i].class;
						if (data.items[i].style) attributes.push(['style', data.items[i].style]);
					}
					let div = parent.createChild('div', '', ['class', classes], ...attributes);
					this.processBiomeContents(data.items[i], div);
				}
			}
		}
	}
}
customElements.define("a-biomecontents", AFMLBiomeContents);

class AFMLExpert extends HTMLAnchorElement {
	lastClicked = 0;
	constructor() {
		// Always call super first in constructor
		super();
		this.classList.add('rexpert');
		this.href = 'https://terraria.wiki.gg/wiki/Expert_Mode';
		this.onclick = event => {
			if(Date.now() - this.lastClicked > 500) event.preventDefault();
			this.lastClicked = Date.now();
		 };
		 this.innerHTML = '<abbr title="double-click to open" style="text-decoration-line: none;">Expert</abbr>'
	}
}
customElements.define("a-expert", AFMLExpert, { extends: "a" });

class AFMLMaster extends HTMLAnchorElement {
	lastClicked = 0;
	constructor() {
		// Always call super first in constructor
		super();
		this.classList.add('rmaster');
		this.href = 'https://terraria.wiki.gg/wiki/Master_Mode';
		this.onclick = event => {
			if(Date.now() - this.lastClicked > 500) event.preventDefault();
			this.lastClicked = Date.now();
		 };
		this.innerHTML = '<abbr title="double-click to open" style="text-decoration-line: none;">Master</abbr>'
	}
}
customElements.define("a-master", AFMLMaster, { extends: "a" });

class WebkitNoticeElement extends HTMLDivElement {
	lastClicked = 0;
	constructor() {
		// Always call super first in constructor
		super();
		this.innerHTML = '';
		//https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
	}
	connectedCallback(){
		this.remove();
	}
}
customElements.define("a-webkit-notice", WebkitNoticeElement, { extends: "div" });

class AFMLRarity extends HTMLElement {
	constructor() {
		// Always call super first in constructor
		super();
		if (!this.innerHTML.startsWith('<')) this.innerHTML = `<a is="a-link" href="Rarity" image="Rare${this.innerHTML}"></a>`;
	}
}
customElements.define("a-rarity", AFMLRarity);

class AFMLSourceBlock extends HTMLElement {
	static observedAttributes = ["src"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	connectedCallback(){
		this.setup();
	}
	setup(){
		if (this.child) return;
		if (this.hasAttribute('src')) {
			this.classList.add('ontab0');
			let header = this.createChild('div', 'Obtained from', ['class', 'obtainedFromHeader']);
			let tabs = this.createChild('div', '', ['class', 'tabnames']);
			tabs.createChild('span', 'Normal', ['class', 'tabname']).onclick = this.setTab(0);
			tabs.createChild('span', 'Expert', ['class', 'tabname expert']).onclick = this.setTab(1);
			tabs.createChild('span', 'Master', ['class', 'tabname master']).onclick = this.setTab(2);
			let table = this.createChild('table');
			let tseg = table.createChild('thead');
			let row = tseg.createChild('tr');
			row.createChild('th', 'Entity').onclick = (event) => clickSortableList(event, 0);
			row.createChild('th', 'Quantity', ['class', 'notleft']).onclick = (event) => clickSortableList(event, 1);
			row.createChild('th', 'Rate', ['class', 'notleft']).onclick = (event) => clickSortableList(event, 2);
			tseg = table.createChild('tbody');
			getStats(this.getAttribute('src')).then((stats) => {
				if (!stats.DropSources) return;
				for (let i = 0; i < stats.DropSources.length; i++) {
					let tab = "";
					switch (stats.DropSources[i].Difficulty) {
						case "Normal":
						tab = 'onlytab0';
						break;
						case "Expert":
						tab = 'onlytab1';
						break;
						case "Master":
						tab = 'onlytab2';
						break;
					}
					row = tseg.createChild('tr', '', ['class', tab]);
					console.log(row);
					row.createChild('td', stats.DropSources[i].Name);
					row.createChild('td', (stats.DropSources[i].Min == stats.DropSources[i].Max) ? stats.DropSources[i].Min : `${stats.DropSources[i].Min}-${stats.DropSources[i].Max}`, ['class', 'notleft']);
					row.createChild('td', (stats.DropSources[i].Rate * 100) + '%', ['class', 'notleft']);
				}
			});
		} else {
			this.textContent = "missing src attribute";
		}
	}
	setTab(tab){
		return () => {
			this.selectTab(tab);
		}
	}
	selectTab(tabNumber){
		for(var i = this.classList.length; i --> 0;){
			if(this.classList[i].startsWith('ontab')){
				this.classList.remove(this.classList[i]);
			}
		}
		this.classList.add('ontab'+tabNumber);
	}
}
customElements.define("a-source", AFMLSourceBlock);

class AFMLBestiaryQuote extends HTMLElement {
	static observedAttributes = ["src"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'src') {
			getStats(newValue.replace(' ', '_')).then((value) => {
				let name = value["Name"];
				let quote = value["BestiaryQuotation"];
				if (quote) {
					this.innerHTML = `- The <a is=\"a-link\" href=\"https://terraria.wiki.gg/wiki/Bestiary\">Bestiary</a> entry for the ${name}: \"${quote}\"`;
				} else {
					this.innerHTML = `- There is no <a is=\"a-link\" href=\"https://terraria.wiki.gg/wiki/Bestiary\">Bestiary</a> entry for the ${name}.`;
				}
			});
		}
	}
}
customElements.define("a-bestiarytrivia", AFMLBestiaryQuote);