"use strict";
//window.alert("test");
var jsLoaded = true;
var linkSuffix = '.html';
var linkPrefix = '';
const lightSettingSuffix = '.png';
const section = '§'.substring('§'.length-1);

const catCommaRegex = /(?<!\[|{|\s)([\s]*\n[\s]*)(?!]|}|\s)/g;
const catLeftQuoteRegex = /(^|(?<!\\):)(\s*)([^{}\[\]\s])/gm;
const catRightQuoteRegex = /([^{}\[\]\s])(\s*)($|(?<!\\):)/gm;

const themes = ['light', 'dark', 'ashen', 'brine', 'dawn', 'dusk', 'nightsky', 'riven', 'terminal'];

var lastErrObject;

var firstHeader = document.getElementsByTagName("h1");
if(firstHeader && firstHeader[0]){
	document.title = firstHeader[0].textContent;
}else{
	var urlExtractedTitle = /([^\/]+?)\.html/.exec(document.URL);
	if(urlExtractedTitle && urlExtractedTitle.length > 1 && urlExtractedTitle[1]){
		document.title = urlExtractedTitle[1];
	}
}
const logDiv = document.getElementById("error-log");
function resetLogDiv() {
	logDiv.textContent = '';
}
function logToDiv(data) {
	if (linkSuffix === '.html') logDiv.textContent += data;
}

async function requestPageText(page) {
	var pageText = await fetch(page);
	pageText = await pageText.text();
	return pageText;
}
function parseXMLSitemap(sitemapContent) {
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(sitemapContent, 'text/xml');
	return xmlDoc;
}
var _categories = requestPageText('categories.hjson');
var _generated_categories = requestPageText('generated_categories.json');
var _siteMap = requestPageText('https://tyfyter.github.io/OriginsWiki/sitemap.xml');

var pageName = document.location.pathname.split('/').pop().replaceAll('.html', '') || 'index';
pageName = decodeURI(pageName);

let catLock;
async function getCategories(){
	if(typeof await _categories === 'string'){
		catLock = AsyncLock.createLock();
		var catText = await _categories;
		catText = catText.replace(/(")/gm, '\\$1').
		replace(catLeftQuoteRegex, '$1$2"$3').
		replace(catRightQuoteRegex, '$1"$2$3').
		replace(catCommaRegex, ',$1').
		replace(/\r|\n/g, ' ').
		replace(/"(true|false)"/gm, '$1');
		_categories = JSON.parse(catText);
		function includes(pageName) {
			return this.items.includes(pageName) ^ this.blacklist;
		}
		for (let key in _categories) {
			if (_categories.hasOwnProperty(key)) {
				for(var i = 0; i < _categories[key].items.length; i++){
					_categories[key].items[i] = _categories[key].items[i].replace('\\:', ':');
				}
				_categories[key].includes = includes.bind(_categories[key]);
				console.log(key, _categories[key], _categories[key].includes);
			}
		}
		var genCat = JSON.parse(await _generated_categories);
		for (let key in genCat) {
			if (genCat.hasOwnProperty(key)) {
				if (_categories.hasOwnProperty(key)) {
					for(var i = 0; i < genCat[key].items.length; i++){
						let value = genCat[key].items[i].replace('\\:', ':');
						if (!_categories[key].items.includes(value)) _categories[key].items.push(value);
					}
				} else {
					_categories[key] = genCat[key];
				}
				_categories[key].includes = includes.bind(_categories[key]);
			}
		}
		catLock.disable();
	} else await catLock;
	return await _categories;
}

async function getSiteMap(){
	if(typeof await _siteMap === 'string'){
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
	}
	return await _siteMap;
}

async function getSearchLinks(query, filter = ".html"){
	var regexQuery = new RegExp("("+query.replace(/(?<=.)(?=.)/g, '.?').replaceAll('.', '\\.')+")","i");
	var results = [];
	results = (await getSiteMap()).filter(function(v){
		console.log(_categories.unimplimented.includes);
		return v.match(regexQuery) && (v.includes(section) == query.includes(section)) && (getSiteSettings().devMode || !_categories.unimplimented.includes(v));
	})
	results = results.sort(function(a, b) {
		try{
			var aIndex = a.indexOf(regexQuery.exec(a)[0]);
			var bIndex = b.indexOf(regexQuery.exec(b)[0]);
		}catch(e){
			console.error({error:e, a: a, b: b, regexQuery: regexQuery});
		}
		return aIndex-bIndex;
	});
	//window.alert(results);
	return results.map(function(v){
		return '<a href='+v+linkSuffix+' class="searchLink">'+v.replace(regexQuery, "<b>\$1</b>").replaceAll('_', ' ')+"</a>";
	}).join("<br>");
}

function forDescendants(element, action, actionFilter, indexer, index){
	var iFiltered = 0;
	for(var i = 0; i < element.children.length; i++){
		var currentIndex = index;
		if(actionFilter(element.children[i])){
			currentIndex = indexer(index, iFiltered++);
			action(element.children[i], currentIndex);
		}
		forDescendants(element.children[i], action, actionFilter, indexer, currentIndex);
	}
}

function getSummaryOrId(element){
	var summary = element.getElementsByTagName("summary")[0];
	
	if(summary){
		return summary.innerHTML.replace('<span class="divider"></span>', '');
	}
	return element.id;
}

function setSiteSettings(setting, value){
	localStorage.setItem(setting, value);
	refreshSiteSettings();
}

function getSiteSettings(){
	return localStorage;
}

function refreshSiteSettings(){
	var siteSettings = getSiteSettings();

	var background = !(siteSettings.nobackground || false);
	var theme = siteSettings.theme || themes[0];
	var html = document.getElementsByTagName('html')[0];
	var body = document.getElementsByTagName('body')[0];

	//console.log('setting dark mode to '+darkMode);
	for (let i = 0; i < html.classList.length; i++) {
		const element = html.classList[i];
		if (element.startsWith("theme-")) {
			html.classList.remove(element);
			i--;
		}
	}
	html.classList.add("theme-" + theme);
	var lightToggle = document.getElementById('lighttoggle');
	if(lightToggle){
		lightToggle.src = "Images/themes/" + "theme-" + theme + lightSettingSuffix;
		lightToggle.className = 'themeOption-' + theme;
	}
	refreshThemeIcon();

	html.classList.remove('background', 'nobackground');
	body.classList.remove('background', 'nobackground');
	var bgTogglePath = document.getElementById('bgtoggle').firstChild;
	if(background){
		html.classList.add('background');
		body.classList.add('background');
		bgTogglePath.setAttribute('d', 'm 3 16 l 5 -9 l 3 5 l 4 -8 l 5 12');
	} else {
		html.classList.add('nobackground');
		body.classList.add('nobackground');
		bgTogglePath.setAttribute('d', 'm 3 16 l 5 -9 l 3 5 l 4 -8 l 5 12 m 1 -11 l -20 10');
	}
	html.classList.remove('devmode');
	if (!(siteSettings.devMode || false)) html.classList.add('devmode');
}
function refreshThemeIcon(){
	let favicon = document.getElementById('favicon');
	if (favicon) {
		favicon.href = window.getComputedStyle(document.children[0]).getPropertyValue('--wiki-logo').replace('url(', '').replace(')', '');
	}
}
function setDarkMode(value){
	setSiteSettings('darkmode', value);
}

function getDarkMode(){
	return getSiteSettings().darkmode;
}
function toggleThemeSelector(){
	var themeContainer = document.getElementById("themeContainer");
	if (themeContainer.children.length > 0) {
		closeThemeSelector();
	} else {
		const currentTheme = getSiteSettings().theme || themes[0];
		for (let i = 0; i < themes.length; i++) {
			const themeName = themes[i];
			if (themeName === currentTheme) continue;
			var child = document.createElement('img');
			child.classList.add('themeOption');
			child.classList.add('themeOption-' + themeName);
			child.onclick = () => {
				closeThemeSelector();
				setSiteSettings('theme', themeName);
			}
			child.src = `Images/themes/theme-${themeName}.png`;
			themeContainer.appendChild(child);
		}
	}
}
function closeThemeSelector(){
	document.getElementById("themeContainer").replaceChildren();
}

function setBackground(value){
	setSiteSettings('nobackground', value ? '' : 'truthy');
}

function getBackground(){
	return !getSiteSettings().nobackground;
}
function waitForElement(selector) {
    return new Promise(resolve => {
		let element = document.querySelector(selector);
        if (element) {
            return resolve(element);
        }
        const observer = new MutationObserver(mutations => {
            for (let i = 0; i < mutations.length; i++)  {
				for (let j = 0; j < mutations[i].addedNodes.length; j++)  {
					if (mutations[i].addedNodes[j].matches && mutations[i].addedNodes[j].matches(selector)) {
						observer.disconnect();
						resolve(mutations[i].addedNodes[j]);
						return;
					}
					if (mutations[i].addedNodes[j].querySelector) {
						element = mutations[i].addedNodes[j].querySelector(selector);
						if (element) {
							observer.disconnect();
							resolve(element);
							return;
						}
					}
				}
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}
function GetSpeedName(useTime) {
	if (useTime <= 8) return "Insanely fast";
	if (useTime <= 20) return "Very fast";
	if (useTime <= 25) return "Fast";
	if (useTime <= 30) return "Average";
	if (useTime <= 35) return "Slow";
	if (useTime <= 45) return "Very slow";
	if (useTime <= 55) return "Extremely slow";
	return "Snail";
}

function selectTab(container, tabNumber){
	var statBlock = container.parentElement.parentElement;
	for(var i = statBlock.classList.length; i --> 0;){
		if(statBlock.classList[i].startsWith('ontab')){
			statBlock.classList.remove(statBlock.classList[i]);
		}
	}
	statBlock.classList.add('ontab'+tabNumber);
}
function clickSortableList(event, index){
	var target = event.target;
	while(target.tagName !== 'TH'){
		target = target.parentElement;
	}
	var sorted = target.classList.contains('sortedby');
	if(sorted || target.classList.contains('revsortedby')){
		var tableBody = target.parentElement.parentElement.parentElement.getElementsByTagName('tbody')[0];
		tableBody.replaceChildren(...Array.from(tableBody.children).reverse());
		if(sorted){
			target.classList.remove('sortedby');
			target.classList.add('revsortedby');
		}else{
			target.classList.remove('revsortedby');
			target.classList.add('sortedby');
		}
	}else{
		sortSortableList(target, index);
	}
}
function sortSortableList(target, index){
	var tableHead = target.parentElement;
	for (var i = 0; i < tableHead.children.length; i++) {
		tableHead.children[i].classList.remove('sortedby');
		tableHead.children[i].classList.remove('revsortedby');
	}
	target.classList.add('sortedby');
	var table = tableHead.parentElement.parentElement;
	var tableBody = table.getElementsByTagName('tbody')[0];
	console.log(tableBody.children[0].children);
	tableBody.replaceChildren(...Array.from(tableBody.children).sort((a,b)=>{
		var av = a.children[index];
		var bv = b.children[index];
		av = ([...av.getElementsByClassName('sortindex'),av])[0].textContent;
		bv = ([...bv.getElementsByClassName('sortindex'),bv])[0].textContent;
		var af = parseFloat(av);
		var bf = parseFloat(bv);
		if(af && bf){
			return af - bf;
		}else{
			return av.localeCompare(bv);
		}
	}));
}

async function createCategorySegment(){
	try {
		if(pageName == 'Category' && !getSiteSettings().devMode){
			return "";
		}
		var cats0 = await getCategories();
		var cats = [];
		//console.log("cats:");
		for (let key in cats0) {
			//console.log(key);
			if (cats0.hasOwnProperty(key)) {
				cats.push(key);
			}
		}
		let categoriesElement = document.createElement('div');
		categoriesElement.textContent = 'categories: ';
		categoriesElement.classList.add('categories');

		var catsIn = false;
		for (let i = 0; i < cats.length; i++) {
			var noCats = false;
			var thisCat = cats0[cats[i]];
			while (!noCats) {
				noCats = true;
				for (var i1 = 0; i1 < thisCat.items.length; i1++) {
					if(thisCat.items[i1].slice(0, 4) === 'cat:') {
						noCats = false;
						try{
							thisCat.items.push(...cats0[thisCat.items[i1].slice(4)].items);
						}catch(error){
							console.error(error);
						}
						thisCat.items.splice(i1,1);
					}
				}
			}
			if(thisCat.includes(pageName) && !thisCat.hidden && (getSiteSettings().devMode || !thisCat.dev)){
				if(catsIn){
					categoriesElement.append(document.createTextNode(', '));
				}
				catsIn = true;
				let newLink = document.createElement('a');
				newLink.textContent = thisCat.name;
				newLink.classList.add('category');
				newLink.href = thisCat.page ? (thisCat.page + linkSuffix) : ('Category'+linkSuffix+'?'+cats[i]);
				categoriesElement.append(newLink);
			}
		}
		if (getSiteSettings().devMode) {
			let siteMap = await getSiteMap();
			let index = siteMap.indexOf(pageName);
			if (index > 0) {
				let button = document.createElement('a', {is: 'a-link'});
				button.textContent = '<==';
				button.id = 'DevBackButton'
				button.href = siteMap[index - 1] + linkSuffix;
				categoriesElement.insertBefore(button, categoriesElement.firstChild);
			}
			if (index < siteMap.length - 1) {
				let button = document.createElement('a', {is: 'a-link'});
				button.textContent = '==>';
				button.id = 'DevNextButton'
				button.style.float = 'right';
				button.href = siteMap[index + 1] + linkSuffix;
				categoriesElement.appendChild(button);
			}
		}
		return categoriesElement;//'<div class="categories">categories: '+catsIn+'</div>';
	} catch (error) {
		console.log(error);
		return document.createElement('div');
	}
}
function getScrollTop() {
    if (typeof window.pageYOffset !== "undefined" ) {
        // Most browsers
        return window.pageYOffset;
    }
  
    var d = document.documentElement;
    if (typeof d.clientHeight !== "undefined") {
        // IE in standards mode
        return d.scrollTop;
    }
  
    // IE in quirks mode
    return document.body.scrollTop;
}
function applyScrollToLogo(){
    let logo = document.getElementById('wikilogo');
    if (visualViewport.width > visualViewport.height) {
        logo.style.top = -getScrollTop() + 'px';
    }
}
onscroll = applyScrollToLogo;
onresize = () => {
    let logo = document.getElementById('wikilogo');
	logo.style.top = 0;
	applyScrollToLogo();
};
let linkIndex = 0;
if (document.location.protocol === 'https:' && document.location.hostname !== '127.0.0.1'){
	linkSuffix = '';
	linkPrefix = '/OriginsWiki';
}
async function parseAFML(content){
	if (document.location.protocol === 'https:' && document.location.hostname !== '127.0.0.1'){
		linkSuffix = '';
		linkPrefix = '/OriginsWiki';
	}
	var toc = document.getElementById("table-of-contents");
	if(toc){
		toc.innerHTML = '';//"<div style = \"border: 1px solid grey; padding: 10px;\">Contents</div>"
		if (document.getElementsByClassName('section').length > 0) {
			var contents = '<details id="table-of-contents-details" open><summary>Contents<span class="divider"></span></summary>'
			forDescendants(content, (v, i) => {
				contents += '<div style="margin-left: '+0.2*i.length+'em"><a class="toc-link"  href="#'+v.id+'">'+i+'. '+getSummaryOrId(v)+'</a></div>'
			}, (v) => v.className == 'section', (pIndex, indexNumber) => (pIndex?pIndex+".":"")+(indexNumber+1), "");
			toc.innerHTML += contents+'</details>';
		} else {
			toc.style.display = 'none';
		}
	}
}
var onSearchbarInput = async (e)=>{
	var searchbar = document.getElementById("searchbar");
	document.getElementById("searchlinks").innerHTML = searchbar.value ? await getSearchLinks(searchbar.value.replaceAll(' ', '_')) : '';
};
var onSearchbarKeyDown = (e)=>{
	var searchlinks = document.getElementById("searchlinks");
	var dir = 0;
	switch(e.key){
		case 'ArrowUp':
		dir = -1;
		break;

		case 'ArrowDown':
		dir = 1;
		break;

		case 'Enter':
		var selectedLinks = searchlinks.getElementsByClassName('selectedSearch');
		if(selectedLinks.length > 0){
			window.open(selectedLinks[0].href, "_self");
		}else{
			window.open(`${linkPrefix}/searchPage${linkSuffix}?${document.getElementById("searchbar").value}`, '_self')
		}
		break;
	}
	if(dir != 0){
		var selectedLinks = searchlinks.getElementsByClassName('selectedSearch');
		if(selectedLinks.length > 0){
			var selectedLink = selectedLinks[0];
			selectedLink.classList.remove('selectedSearch');
			do{
				if(dir > 0){
					selectedLink = selectedLink.nextSibling;
				}else{
					selectedLink = selectedLink.previousSibling;
				}
			}while(selectedLink && !selectedLink.classList.contains('searchLink'));
			if(selectedLink){
				selectedLink.classList.add('selectedSearch');
			}
		}else{
			searchlinks.children[(searchlinks.childNodes.length + Math.min(dir, 0)) % searchlinks.childNodes.length].classList.add('selectedSearch');
		}
	}
};
function createElementWith(tag) {
	let element = document.createElement(tag);
	for (let index = 1; index < arguments.length; index++) {
		const arg = arguments[index];
		element[arg[0]] = arg[1];
	}
	return element;
}
function createElementWithAttributes(tag) {
	let element = document.createElement(tag);
	for (let index = 1; index < arguments.length; index++) {
		element.setAttribute(...arguments[index]);
	}
	return element;
}
function createElementWithTextAndAttributes(tag, text) {
	let element = document.createElement(tag);
	element.innerHTML = text;
	for (let index = 2; index < arguments.length; index++) {
		element.setAttribute(...arguments[index]);
	}
	return element;
}
function withChildren(parent) {
	for (let index = 1; index < arguments.length; index++) {
		parent.appendChild(arguments[index]);
	}
	return parent;
}
var pressedKeys = {};
window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }
function callDevScript() {
	eval(getSiteSettings().devScript);
}
function ignoreWebkitNotice(event) {
	setSiteSettings("ignoreWebkitWarning", true);
	document.getElementById('webkit-notice').remove();
}
var parse = async ()=>{
	typeof preParseCallback !== 'undefined' && preParseCallback();
	await parseAFML(document.getElementById("content"));
	var content = document.getElementById("content");
	
	content.insertBefore(
		withChildren(createElementWith('div', ['id', 'toolbar']),
			withChildren(createElementWith('div', ['id', 'toolbar-container']),
				withChildren(createElementWith('a', ['href', '.'], ['style', 'height: 0;']),
					createElementWith('img', ['id', 'wikilogo'])
				),
				withChildren(createElementWith('svg', ["xmlns", "http://www.w3.org/2000/svg"], ["id", "bgtoggle"]),//, [viewBox="0 0 24 18"]
					createElementWith('path', ['d', ''])
				),
				createElementWith('img', ['id', 'lighttoggle']),
				createElementWith('span', ['id', 'themeContainer']),
				createElementWith('input', ['id', 'searchbar'], ['placeholder', 'Search Origins wiki']),
				withChildren(createElementWith('svg', ["xmlns", "http://www.w3.org/2000/svg"], ["id", "searchIcon"]),),
			),
			createElementWith('div', ['id', 'searchlinks'])
		),
	content.childNodes[0]);
	if (!getSiteSettings().ignoreWebkitWarning) {
		let afterHeader = content.getElementsByTagName("h1");
		if (afterHeader.length) {
			afterHeader = afterHeader[0].nextSibling;
			if (afterHeader.tagName == "div" && afterHeader.classList.contains("divider")) afterHeader = afterHeader.nextSibling;
			content.insertBefore(
				createElementWithTextAndAttributes('span', `<div is="a-webkit-notice" style="font-size: small;color: var(--redlink-color);">It looks like you're using a browser based on Apple's "WebKit" browser engine;<br>
				Unfortunately, WebKit does not support the HTML standard;<br>
				As a result, some webpages may not display correctly;<br>
				If you live in the EU the Digital Markets Act requires Apple to allow you to install a browser which does,<br>
				otherwise you cannot install such a browser without jailbreaking your device<br><a href="javascript:void(0);" onClick=ignoreWebkitNotice(event) style="font-size: initial;">dismiss</a></div>`, ['id', 'webkit-notice']),
				afterHeader
			);
		}
	}
	document.getElementById('bgtoggle').outerHTML = '<svg xmlns="http://www.w3.org/2000/svg" id="bgtoggle" viewBox="0 0 24 18" onclick="setBackground(!getBackground())"><path d=""></path></svg>';
	document.getElementById('lighttoggle').outerHTML = '<img id="lighttoggle" onclick="toggleThemeSelector()">';
	document.getElementById('searchbar').outerHTML = '<input id="searchbar" placeholder="Search Origins wiki" oninput="onSearchbarInput(event)" onkeydown="onSearchbarKeyDown(event)">';
	document.getElementById('searchIcon').outerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="searchSymbol" onclick="search()">'+
	'<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>'+
	'</svg>';
	refreshSiteSettings();
	var head = document.getElementsByTagName("head");
	if(head && head[0]){
		var favicon = document.createElement('link');
		favicon.rel = 'icon';
		favicon.href = 'favicon.ico';
		favicon.type = 'image/icon type';
		favicon.id = 'favicon';
		head[0].appendChild(favicon);
	}
	refreshThemeIcon();
	let catSegPromise = createCategorySegment().then(function(v){content.append(v);});
	await catSegPromise;
	typeof postParseCallback !== 'undefined' && postParseCallback();
	if (getSiteSettings().autoCallDevScript) callDevScript();
};
parse();
