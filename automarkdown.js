//window.alert("test");
var jsLoaded = true;
var linkSuffix = '.html';
var linkPrefix = '';
const lightSettingSuffix = '.png';
var cookieSuffix = 'path=/;';
const section = '§'.substring('§'.length-1);

const catCommaRegex = /(?<!\[|{|\s)([\s]*\n[\s]*)(?!]|}|\s)/g;
const catLeftQuoteRegex = /(^|(?<!\\):)(\s*)([^{}\[\]\s])/gm;
const catRightQuoteRegex = /([^{}\[\]\s])(\s*)($|(?<!\\):)/gm;

const themes = ['light', 'dark', 'ashen', 'brine', 'dawn', 'dusk', 'nightsky', 'riven', 'terminal'];

var lastErrObject;

if(document.location.protocol == 'https:'){
	cookieSuffix = cookieSuffix + 'Secure';
}

console.log('cookieSuffix: ' + cookieSuffix);

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
var _siteMap = requestPageText('sitemap.xml');
var _aliases = requestPageText('aliases.json');
var defaultStats;

var aliases = false;
var _stats = {};
var pageName = document.location.pathname.split('/').pop().replaceAll('.html', '') || 'index';
pageName = decodeURI(pageName);
_stats[pageName] = new Promise((resolve, reject) => {
		requestPageText('stats/'+pageName + '.json').then((v) => {
			_stats[pageName] = v.startsWith('<!DOCTYPE html>') ? null: v;
			_stats[pageName] ? resolve(_stats[pageName]) : reject(404);
		});
	}
);

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
async function getCategories(){
	if(typeof await _categories === 'string'){
		var catText = await _categories;
		catText = catText.replace(/(")/gm, '\\$1').
		replace(catLeftQuoteRegex, '$1$2"$3').
		replace(catRightQuoteRegex, '$1"$2$3').
		replace(catCommaRegex, ',$1').
		replace(/\r|\n/g, ' ').
		replace(/"(true|false)"/gm, '$1');
		_categories = JSON.parse(catText);
		for (let key in _categories) {
			if (_categories.hasOwnProperty(key)) {
				for(var i = 0; i < _categories[key].items.length; i++){
					_categories[key].items[i] = _categories[key].items[i].replace('\\:', ':');
				}
			}
		}
		var genCat = JSON.parse(await _generated_categories);
		for (let key in genCat) {
			if (genCat.hasOwnProperty(key)) {
				if (_categories.hasOwnProperty(key)) {
					for(var i = 0; i < genCat[key].items.length; i++){
						_categories[key].items.push(genCat[key].items[i].replace('\\:', ':'));
					}
				} else {
					_categories[key] = genCat[key];
				}
			}
		}
	}
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

async function pageExists(page){
	return (await getSiteMap()).includes(page)
}

function createFilteredResponseHandler(filter, action, includeExtension){
	function getResponse() {
		// `this` will refer to the `XMLHTTPRequest` object that executes this function
		var responseObj = JSON.parse(this.responseText);
		var values = [];
		for(var i = 0; i < responseObj.tree.length; i++){
			var match = responseObj.tree[i].path.match(/\.[^.]+/g);
			var addition = responseObj.tree[i].path.replace(match, "");
			if(addition && (!filter || match==filter) && addition != 'index'){
				if(includeExtension){
					values.push(addition+match);
				}else{
					values.push(addition);
				}
			}
		}
		action(values);
	}
	return getResponse;
}

function appendAllToContent(values){
	values = values.map(function(v){
		return "<a href="+v+">"+v+"</a>";
	});
	document.getElementById("content").innerHTML += "<div>"+values.join("<br>")+"</div>";
}

function requestAndProcessPageList(action, filter, sync){
	if(!filter){
		filter = ".html";
	}
	var request = new XMLHttpRequest();
	request.onload = createFilteredResponseHandler(filter, action, true);
	request.open('get', 'https://api.github.com/repos/Tyfyter/OriginsWiki/git/trees/main', !sync);
	//request.open('get', 'https://api.github.com/repos/Tyfyter/OriginsWiki/commits/main', true);
	//request.open('get', 'https://api.github.com/users/Tyfyter/repos/OriginsWiki', true);
	request.send();
}

async function getSearchLinks(query, filter = ".html"){
    query = query.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
	var regexQuery = new RegExp("("+query+")","i");
	var results = [];
	results = (await getSiteMap()).filter(function(v){
		return v.match(regexQuery) && (v.includes(section) == query.includes(section));
	})
	/*requestAndProcessPageList(function(re){
		results = re.filter(function(v){
			return v.match(regexQuery) && (v.includes(section) == query.includes(section));
		});
	}, filter, true);*/
	//console.log(results);
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
		return '<a href='+v+linkSuffix+' class="searchLink">'+v.replace(/\.[^.]+/g, "").replace(regexQuery, "<b>\$1</b>").replaceAll('_', ' ')+"</a>";
	}).join("<br>");
}

//requestAndProcessPageList(appendAllToContent);
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

const siteSettingsRegex = /sitesettings:(.*?)(;|$)/;
function setSiteSettings(setting, value){
	var match = siteSettingsRegex.exec(document.cookie.toString());
	if(match){
		var siteSettings = JSON.parse(match[1]);
		siteSettings[setting] = value;
		document.cookie = 'sitesettings:'+JSON.stringify(siteSettings)+'; ' + cookieSuffix;
	}else{
		if (typeof value === 'string') value = `"${value}"`;
		document.cookie = 'sitesettings:{"'+setting+'":'+value+'}; ' + cookieSuffix;
	}
	refreshSiteSettings();
}

function getSiteSettings(){
	var cookie = document.cookie;
	var changedcookie = document.cookie.replace('"darkmode":true', '"theme":"dark"');
	if (cookie != changedcookie) {
		document.cookie = cookie = changedcookie;
	}
	var match = siteSettingsRegex.exec(document.cookie.toString());
	var siteSettings = {};
	if(match){
		siteSettings = JSON.parse(match[1]);
	}
	return siteSettings;
}

function refreshSiteSettings(){
	var siteSettings = getSiteSettings();

	var background = !siteSettings.nobackground;
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

	const backgroundSettingRegex = /background|nobackground/g;
	html.className = html.className.replaceAll(backgroundSettingRegex, '');
	body.className = body.className.replaceAll(backgroundSettingRegex, '');
	var bgTogglePath = document.getElementById('bgtoggle').firstChild;
	if(background){
		html.className = html.className + " background";
		body.className = body.className + " background";
		bgTogglePath.setAttribute('d', 'm 3 16 l 5 -9 l 3 5 l 4 -8 l 5 12');
	} else {
		html.className = html.className + " nobackground";
		body.className = body.className + " nobackground";
		bgTogglePath.setAttribute('d', 'm 3 16 l 5 -9 l 3 5 l 4 -8 l 5 12 m 1 -11 l -20 10');
	}
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
	setSiteSettings('nobackground', !value);
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
async function processLinkWithID(id, targetName, image, targetPage, note) {
	return (await processLink(targetName, image, targetPage, note)).replace('class="link"', `class="link" id="${id}"`);
}
let linkNum = 0
async function processLink(targetName, image, targetPage, note){
	if (aliases[targetPage]) {
		targetPage = aliases[targetPage];
	}
	if(image === '$default'){
		image = undefined;
	}
	if(image === '$fromStats'){
		try {
			image = JSON.parse(await requestStats(targetName.replaceAll(' ', '_'))).Image + ".png";
		} catch (error) {}
	}
	if(targetPage === undefined || targetPage === '$default'){
		targetPage = targetName.replaceAll(' ', '_');
		if (aliases[targetPage]) {
			targetPage = aliases[targetPage];
		}
		targetPage = targetPage + linkSuffix
	}
	let tag = 'a';
	if (new URL(targetPage, document.baseURI).href == document.location) {
		tag = 'b';
	}
	const linkIndex = linkNum++;
	var result = `<${tag} class="link" id="link${linkIndex}" href="${targetPage}">`;
	waitForElement(`a#link${linkIndex}`).then(element => {
		//console.log(element);
		if (new URL(element.href).origin == new URL(window.location).origin) {
			fetch(element.href, {method: 'HEAD'}).then(response => {
				//console.log(response);
				if (response.status == 404) {
					document.getElementById(element.id).classList.add('redlink');
				}
			});
		}
	});
	/*fetch(targetPage, { method:"HEAD"}).then((response) => {
		if (response.status == 404) {
			let linkElement;
			linkElement = document.getElementById("link"+linkIndex);
			while (!linkElement) {
				setTimeout
				linkElement = document.getElementById("link"+linkIndex);
			}
			console.log
		}
	});*/
	
	if(image){
		result += `<img src=${image}>`;
	}
	if(!targetPage){
		return targetName + `</${tag}>`;
	}
	if(note){
		result += '<span class="linkandnote">';
		result += targetName;
		result += '<br><span class="linknote">'+note+'</span>';
		result += '</span>';
	}else{
		result += targetName;
	}
	return result + `</${tag}>`;
}
function generateCoinsTag(value){
	return `[coins ${Math.floor(value / 1000000) % 100} | ${Math.floor(value / 10000) % 100} | ${Math.floor(value / 100) % 100} | ${(value) % 100}]`;
}
function processCoins(copper = 0, silver = 0, gold = 0, platinum = 0){
	var result = '<span class="coins">';
	if(platinum != 0){
		result += '<span class="platinum">'+platinum+'</span>';
	}
	if(gold != 0){
		result += '<span class="gold">'+gold+'</span>';
	}
	if(silver != 0){
		result += '<span class="silver">'+silver+'</span>';
	}
	if(copper != 0){
		result += '<span class="copper">'+copper+'</span>';
	}
	return result + '</span>';
}
function processToolStats(pick = 0, hammer = 0, axe = 0){
	var result = '<div class="toolstats">';
	if(pick){
		result += '<span class="toolstat">'+
		'<img title="Pickaxe power" src="https://terraria.wiki.gg/images/thumb/0/05/Pickaxe_icon.png/16px-Pickaxe_icon.png" decoding="async" loading="lazy">'+
		pick+
		'%</span>';
	}
	if(hammer){
		result += '<span class="toolstat">'+
		'<img title="Hammer power" src="https://terraria.wiki.gg/images/thumb/5/57/Hammer_icon.png/16px-Hammer_icon.png" decoding="async" loading="lazy">'+
		hammer+
		'%</span>';
	}
	if(axe){
		result += '<span class="toolstat">'+
		'<img title="Axe power" src="Images/Axe_Icon.png" decoding="async" loading="lazy">'+
		axe+
		'%</span>';
	}
	return result + '</div>';
}
async function requestStats(name){
	var value = await _stats[name];
	if(value === undefined){
		var v = await (_stats[name] = requestPageText('stats/'+name + '.json'));
		value = (_stats[name] = v.startsWith('<!DOCTYPE html>') ? null: v);
	}
	return value;
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
function imagePathPrefix(path){
	return `${path.startsWith("§")?"":"Images/"}${path}`;
}
function setValueOrValues(obj, value){
	if(Array.isArray(value)){
		obj.values = value;
	}else{
		obj.value = value;
	}
	return obj;
}
async function processAutoStats(name = pageName, inline){
	var data = await requestStats(name);
	if(data === null){
		return null;
	}
	data = JSON.parse(data);
	
    var values = [];
	if(data.Types.includes("Item")){
		var setSuffix = data.Types.includes("ArmorSet") ? '(set)' : '';
    	if(data.Image){
			var widthStr = data.SpriteWidth ? `, spriteWidth:${data.SpriteWidth}`: false;
        	values.push({
				header: data.Name || name.replaceAll('_',' '),
				items:[{image:`${imagePathPrefix(data.Image)}.png`, spriteWidth:widthStr}]
			});
    	} else if(data.Images){
			var widthStr = data.SpriteWidth ? `, spriteWidth:${data.SpriteWidth}`: false;
			var images = data.Images;
			for (let i = 0; i < images.length; i++) {
				const image = images[i];
				if (Array.isArray(image)) {
					for (let j = 0; j < image.length; j++) {
						image[j] = `${imagePathPrefix(image[j])}.png`;
					}
				} else {
					images[i] = `${imagePathPrefix(image)}.png`;
				}
			}
        	values.push({
				header: data.Name || name.replaceAll('_',' '),
				items: [{images: images}]
			});
    	}
		var statistics = {header:"Statistics", items:[]};
		if (data.PickPower || data.HammerPower || data.AxePower) {
			statistics.items.push({
				literalvalue: `[toolpower ${data.PickPower || ''} | ${data.HammerPower || ''} | ${data.AxePower || ''}]`
			});
		}
		if(data.FishPower){
			statistics.items.push({
				label:'[link Fishing power | | https://terraria.wiki.gg/wiki/Fishing]',
				value:data.FishPower+'%'
			});
		}
		if(data.BaitPower){
			statistics.items.push({
				label:'[link Bait power | | https://terraria.wiki.gg/wiki/Bait]',
				value:data.BaitPower+'%'
			});
		}
		if (data.PickReq || data.HammerReq) {
			statistics.items.push({
				literalvalue: `[toolpower ${data.PickReq || ''} | ${data.HammerReq || ''}]`
			});
		}
		if(data.LightIntensity){
			var torchIcon = '';
			var torchIntensity = data.LightIntensity;
			if (data.LightColor) {
				torchIcon = `<img src="Images/Torch_Icon.png" style="mix-blend-mode: screen;background-color: ${
					`rgb(${(data.LightColor[0]) * 255}, ${(data.LightColor[1]) * 255}, ${(data.LightColor[2]) * 255})`
				};">`;
			}
			statistics.items.push({
				label:'Light',
				value: torchIcon + torchIntensity
			});
		}
		if(data.PlacementSize){
			statistics.items.push({
				label:'[link Placeable | | https://terraria.wiki.gg/wiki/Placement]',
				value:`yes (${data.PlacementSize[0]}x${data.PlacementSize[1]})`
			});
		}
		if(data.Defense){
			statistics.items.push({
				label:'[link Defense | | https://terraria.wiki.gg/wiki/Defense]',
				value:data.Defense + setSuffix
			});
			if(data.Tooltip){
				statistics.items.push(setValueOrValues({
					label:'[link Tooltip | | https://terraria.wiki.gg/wiki/Tooltips]'
				}, data.Tooltip));
			}
		}
		if(data.SetBonus){
			statistics.items.push({
				label:'[link Set Bonus | | https://terraria.wiki.gg/wiki/Armor]',
				value:data.SetBonus
			});
		}
		if(data.ArmorSlot){
			statistics.items.push({
				label:'Armor slot',
				value:data.ArmorSlot
			});
		}
		if(data.Damage){
			var classStr = data.DamageClass ? ` (${data.DamageClass})`: '';
			statistics.items.push({label:'Damage',value:`${data.Damage}${classStr}`});
		}
		if(data.Knockback){
			statistics.items.push({
				label:'[link Knockback | | https://terraria.wiki.gg/wiki/Knockback]',
				value:data.Knockback
			});
		}
		if(data.ManaCost){
			statistics.items.push({label:'[link Mana cost | | https://terraria.wiki.gg/wiki/Mana]',value:data.ManaCost});
		}
		if(data.HealLife){
			statistics.items.push({label:'[link Heals Health | | https://terraria.wiki.gg/wiki/Health]',value:data.HealLife});
		}
		if(data.HealMana){
			statistics.items.push({label:'[link Heals mana | | https://terraria.wiki.gg/wiki/Mana]',value:data.HealMana});
		}
		if(data.Crit){
			statistics.items.push({label:'[link Critical chance | | https://terraria.wiki.gg/wiki/Critical_hit]',value:data.Crit});
		}
		if(data.UseTime){
			statistics.items.push({label:'[link Use time | | https://terraria.wiki.gg/wiki/Use_Time]',value:`${data.UseTime} (${GetSpeedName(data.UseTime)})`});
		}
		if(data.Velocity){
			statistics.items.push({label:'[link Velocity | | https://terraria.wiki.gg/wiki/Velocity]',value:data.Velocity});
		}
		if(data.Tooltip && !data.Defense){
			statistics.items.push(setValueOrValues({
				label:'[link Tooltip | | https://terraria.wiki.gg/wiki/Tooltips]'
			}, data.Tooltip));
		}
		if(data.Rarity){
			statistics.items.push({
				label:'[link Rarity | | https://terraria.wiki.gg/wiki/Rarity]',
				value:`[link | Images/Rare${data.Rarity}.png | https://terraria.wiki.gg/wiki/Rarity]`
			});
		}
		if(data.Buy){
			statistics.items.push({
				label:'[link Buy | | https://terraria.wiki.gg/wiki/Value]',
				value:generateCoinsTag(data.Buy) + setSuffix
			});
		}
		if(data.Sell){
			statistics.items.push({
				label:'[link Sell | | https://terraria.wiki.gg/wiki/Value]',
				value:generateCoinsTag(data.Sell) + setSuffix
			});
		}
		if(data.Research){
			statistics.items.push({
				label:'[link Research | | https://terraria.wiki.gg/wiki/Journey_Mode#Research]',
				value:`<abbr class="journey" title="Journey Mode">${data.Research||1} required</abbr>`
			});
		}
		values.push(statistics);
	}
	if(data.Types.includes("NPC")){
		var _class = (data.Expert || data.Master) ? 'onlytab0' : false;
		var _expertClass = 'onlytab1';
		var _masterClass = data.Expert ? 'onlytab2' : 'onlytab1';
		var addComma = false;
		const getClass = (val) => {
			return (data.Expert && data.Expert[val]) || (data.Master && data.Master[val])? _class : false;
		};
		if(data.Image){
			var widthStr = data.SpriteWidth ? `, spriteWidth:${data.SpriteWidth}`: false;
        	values.push({
				header: data.Name || name.replaceAll('_',' '),
				items:[{image:`Images/${data.Image}.png`, spriteWidth:widthStr}]
			});
		}
		var statistics = {header:"Statistics", items:[]};
		if (_class) {
			statistics.tabs = ['Normal'];
			if (data.Expert) statistics.tabs.push({toString:()=>'Expert', class:'expert'});
			if (data.Master) statistics.tabs.push({toString:()=>'Master', class:'master'});
		}
		function addStat(area, label, propertyName, dataProcessor = null){
			let valueClass = getClass(propertyName);
			let value = {label:label};
			if (valueClass) value.class = valueClass;
			let propertyValue = data[propertyName];
			if (propertyValue) {
				if (dataProcessor) propertyValue = dataProcessor(propertyValue);
				value[`value${Array.isArray(propertyValue)?'s':''}`] = propertyValue;
				area.items.push(value);
			}
			if (data.Expert) {
				value = {label:label, class:_expertClass, valueClass:'expert'};
				propertyValue = data.Expert[propertyName];
				if (propertyValue) {
					if (dataProcessor) propertyValue = dataProcessor(propertyValue);
					value[`value${Array.isArray(propertyValue)?'s':''}`] = propertyValue;
					area.items.push(value);
				}
			}
			if (data.Master) {
				value = {label:label, class:_masterClass, valueClass:'master'};
				propertyValue = data.Master[propertyName];
				if (propertyValue) {
					if (dataProcessor) propertyValue = dataProcessor(propertyValue);
					value[`value${Array.isArray(propertyValue)?'s':''}`] = propertyValue;
					area.items.push(value);
				}
			}
		}
		result += (addComma ? ',{' : '{') + `header:Statistics, ${_class?`tabs:,`:''} items:[`;
		addStat(statistics, '[link Environment | | https://terraria.wiki.gg/wiki/Biome]', 'Biome');
		addStat(statistics, '[link AI Style | | https://terraria.wiki.gg/wiki/AI]', 'AIStyle');
		addStat(statistics, 'Damage', 'Damage');
		addStat(statistics, 'Max Life', 'MaxLife');
		addStat(statistics, '[link Defense | | https://terraria.wiki.gg/wiki/Defense]', 'Defense');
		addStat(statistics, '[link Knockback | | https://terraria.wiki.gg/wiki/Knockback] Resistance', 'KBResist');
		addStat(statistics, 'Immune to', 'Immunities');
		values.push(statistics);
		if(data.Drops || data.Coins) {
			var loot = {header:"Drops", items:[]};
			result += ',{header:Drops, items:['
			addStat(loot, '[link Coins | | https://terraria.wiki.gg/wiki/NPC_drops#Coin_drops]', 'Coins', generateCoinsTag);
			addStat(loot, 'Items', 'Drops');
			values.push(loot);
		}
	}
	if(data.Buffs){
		var buffs = {header: `Grants buff${data.Buffs.length > 1 ? 's' : ''}`, items:[]};
		for (let buffIndex = 0; buffIndex < data.Buffs.length; buffIndex++) {
			const buff = data.Buffs[buffIndex];
			buffs.items.push({label:'Buff', value:`[link ${buff.Name} | ${buff.Image ? `${imagePathPrefix(buff.Image)}.png` : '$default'}]`});
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
	if(data.Debuffs){
		var buffs = {header: `Inflicts debuff${data.Debuffs.length > 1 ? 's' : ''}`, items:[]};
		for (let buffIndex = 0; buffIndex < data.Debuffs.length; buffIndex++) {
			const buff = data.Debuffs[buffIndex];
			buffs.items.push({label:'Debuff', value:`[link ${buff.Name} | ${buff.Image ? `${imagePathPrefix(buff.Image)}.png` : '$default'}]`});
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
	console.log('autostatblock:');
	console.log(values);
	var result = `<div class="${inline ? 'inlinestatblock': 'statblock'} ontab0">`;
	for (let i = 0; i < values.length; i++) {
		result += processStatBlock(values[i]);
	}
	if(data.InternalName){
		result += `<div class="internalname">Internal Name: ${data.InternalName}</div>`;//
	}
	return result + "</div>";
}

async function processStat(...stat){
	var value = await requestStats((stat[0] + '').trim());
	if(value === null){
		return null;
	}
	value = JSON.parse(value);
	for(var i = 1; i < stat.length; i++){
		value = value[(stat[i]+'').trim()];
	}
	return value;
}

function makeHeader(text){
	return '<div class="header"><span class="padding" style="padding-left: 7.5px;"></span><span class="text">'+text+'</span><span class="padding" style="flex-grow: 1;"></span></div>';
}

function makeTabs(tabs){
	var text = '<div class="tabnames">';
	for(var i = 0; i < tabs.length; i++){
		text+=`<span class="tabname ${tabs[i].class || ''}" onClick=selectTab(event.srcElement,${i})>${tabs[i]}</span>`;
	}
	return text+'</div>';
}

function pruneLinkArgs(array){
	for(var i = 0; i < array.length; i++){
		array[i] = array[i].trim();
	}
	return array;
}

async function processBiomeContents(data, depth){
	if(!depth){
		depth = 0;
	}
	var result = '';
	if(data.header){
		result += makeHeader(data.header);
	}
	if(data.items){
		var classes = "";
		var style = "";

		for(var i = 0; i < data.items.length; i++){
			if(typeof data.items[i] === 'string' || data.items[i] instanceof String){
				result += '<span>' + (data.items[i].startsWith('&amp;') ? data.items[i].substring('&amp;'.length) : await processLink(data.items[i])) + '</span>';
			}else if(data.items[i] instanceof Array){
				result += '<span>'+(await processLink(...data.items[i]))+'</span>';
			}else{
				classes = "";
				style = "";
				if(data.items && data.items[i]){
					if(data.items[i].class){
						classes = ' '+data.items[i].class;
					}
					if(data.items[i].style){
						style = 'style="'+data.items[i].style+'"';
					}
				}
				result += '<div class="subcontents'+classes+'"'+style+'>';
				result += await processBiomeContents(data.items[i], depth + 1);
				result += '</div>';
			}
		}
	}
	return result;
}
function processStatBlock(data, depth){
	console.log("stat bvlock: ", data);
	var result = '';
	if(data.literalvalue){
		console.log("literal value: "+data.literalvalue);
		result += data.literalvalue;
	}else{
		if(data.header){
			result += makeHeader(data.header);
		}
		if(data.tabs){
			result += makeTabs(data.tabs);
		}
		if(data.items){
			for(var i = 0; i < data.items.length; i++){
				if(data.items[i].images){
					result += '<div class="statimagecontainer">';
					for (let j = 0; j < data.items[i].images.length; j++) {
						const image = data.items[i].images[j];
						if (Array.isArray(image)) {
							if (j > 0) {
								result += '<div class="statimagedivider"></div>';
							}
							result += '<div class="statimagecontainer">';
							for (let k = 0; k < image.length; k++) {
								let title = (image.endsWith && image[k].endsWith('_Female.png')) ? ' title="female sprite"' : '';
								var widthStr = data.items[i].spriteWidth ? `style="max-width:${data.items[i].spriteWidth[j][k] * 0.5}%"`: '';
								result += `<img src=${image[k]} ${widthStr} ${title}>`;
							}
							result += '</div>';
						} else {
							let title = (image.endsWith && image.endsWith('_Female.png')) ? ' title="female sprite"' : '';
							var widthStr = data.items[i].spriteWidth ? `style="max-width:${data.items[i].spriteWidth[j] * 0.5}%"`: '';
							result += `<img src=${image} ${widthStr} ${title}>`;
						}
					}
					result += '</div>';
				} else if(data.items[i].image){
					var widthStr = data.items[i].spriteWidth ? `style="max-width:${data.items[i].spriteWidth * 0.5}%"`: '';
					result += `<img src=${data.items[i].image} ${widthStr}>`;
				} else {
					var klasse = '';
					if(data.items[i].class){
						klasse = ' '+data.items[i].class;
					}
					if (data.items[i].literalvalue) {
						console.log("literal value: "+data.literalvalue);
						result += '<div class="stat'+klasse+'">' +
						data.items[i].literalvalue +
						'</div>';
					} else if(data.items[i].label){
						if(data.items[i].value){
							result += '<div class="stat'+klasse+'">' +
							data.items[i].label +
							': ' +
							`<span class=${data.items[i].valueClass || ''}>` + data.items[i].value + '</span>' +
							'</div>';
						}else if(data.items[i].values){
							result += '<div class="stat'+klasse+'">' +
							data.items[i].label + `: <div class="statvalues ${data.items[i].valueClass || ''}">`;
							for(var j = 0; j < data.items[i].values.length; j++){
								if(j>0){
									result += '<br>';
								}
								result += data.items[i].values[j];
							}
							result += '</div></div>';
						}
					}
				}
			}
		}
	}
	console.log("stat bvlock: ", result);
	return result;
}
function processRecipeBlock(data, depth){
	var result = '';
	let stations = '<a href="https://terraria.wiki.gg/wiki/By_Hand">By Hand</a>';
	if(data.stations){
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
	  lastErrObject = data.items[i];
		if(i > 0) result += '</tr>';
		result += '<tr><td>' +
		data.items[i].result +
		'</td><td class="middle">';
		for(var j = 0; j < data.items[i].ingredients.length; j++){
			if(j>0){
				result += '<br>';
			}
			result += data.items[i].ingredients[j];
		}
		result += '</td>'
		if(i <= 0) {
			result += '<td rowspan="'+data.items.length+'">'+stations+'</td></tr>';
		}
	}
	result += '</tr>';
	console.log(result);
	return result;
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
var evalItem;
async function processSortableList(data){
	if (!defaultStats) defaultStats = JSON.parse(await requestStats("Defaults"));
	var result = '<thead><tr>';
	if(data.headers[0] === 'Name'){
		data.headers[0] = {name:'Name',expr:'processLink(item.Name, "$fromStats")',sortIndex:'item.Name',noAbbr:true};
	}
	for(var j = 0; j < data.headers.length; j++){
		result += `<th ${j>0&&j<data.headers.length?'class="notleft"':''} onclick="clickSortableList(event, ${j})">${data.headers[j].expr&&!data.headers[j].noAbbr?`<abbr title="${data.headers[j].expr.replaceAll('item.','')}">`:'<span>'}${data.headers[j].expr?data.headers[j].name:data.headers[j]}</${data.headers[j].expr&&!data.headers[j].noAbbr?'abbr':'span'}></th>`;
	}
	result += '</tr></thead><tbody>';
	var keys = new Set();
	for(var i = 0; i < data.items.length; i++){
		result += '<tr>';
		var item = JSON.parse(await requestStats(data.items[i]));
		if(!item.Name){
			item.Name = data.items[i];
		}
		for(let key in defaultStats){
			if(!item.hasOwnProperty(key)){
				item[key] = defaultStats[key];
			}
		}
		evalItem = {};
		for(let key in item){
			keys.add(key);
		}
		keys.forEach((key)=>{evalItem[key] = item[key];});
		var context = `let item = ${JSON.stringify(evalItem)};`;
		for(var j = 0; j < data.headers.length; j++){
			var displayValue = item[data.headers[j]];
			if (data.headers[j].expr){
				//console.log(data.headers[j].expr+';');
				displayValue = await new Function('item', 'return '+data.headers[j].expr+';')(item);
			}
			result += `<td ${j>0&&j<data.headers.length?'class="notleft"':''}>
			${displayValue}
			${data.headers[j].sortIndex?`<span class="sortindex">${await new Function('item', 'return '+data.headers[j].sortIndex+';')(item)}</span>`:''}</td>`;
		}
		result += '</tr>';
	}
	result += '</tbody>';
	//console.log(result);
	return result;
}
function clickSortableList(event, index){
	var target = event.target.parentElement;
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
	tableBody.replaceChildren(...Array.from(tableBody.children).sort((a,b)=>{
		var av = a.children[index];
		var bv = b.children[index];
		av = ([...av.getElementsByClassName('sortindex'),av])[0].textContent;
		bv = ([...bv.getElementsByClassName('sortindex'),bv])[0].textContent;
		var af = parseFloat(av);
		var bf = parseFloat(bv);
		if(af && bf){
			return af > bf;
		}else{
			return a > b;
		}
	}));
}

async function substituteAutoSortableList(list){
	console.log(`deferred processing of sortable list ${list}`);
	return `<table class="sortablelist deferred listsource-${list}"></table>`;
}

async function processAutoSortableList(table, list){
	console.log(`processing sortable list "${list}"`);
	list = requestStats("statLists/" + list);
	if (!list) {
		table.innerHTML = `could not find statList ${list}`;
		return;
	}
	var cats = await getCategories();
	var data = JSON.parse(await list);
	data.items = [];
	var currentCat;

	if (data.intersection) {
		currentCat = cats[data.categories[0]];
		for (var i = 0; i < currentCat.items.length; i++) {
			data.items.push(currentCat.items[i]);
		}
		for (var i = 1; i < data.categories.length; i++) {
			currentCat = cats[data.categories[i]];
			for (var j = 0; j < data.items.length; j++) {
				currentCat.items.includes(data.items[j]) || data.items.splice(j--,1);
			}
		}
	} else {
		for (var i = 0; i < data.categories.length; i++) {
			currentCat = cats[data.categories[i]];
			for (var j = 0; j < currentCat.items.length; j++) {
				data.items.includes(currentCat.items[j]) || data.items.push(currentCat.items[j]);
			}
		}
	}
	return await processSortableList(data);
}

async function createCategorySegment(){
	try {
		if(pageName == 'Category'){
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
		var catsIn = '';
		for (let i = 0; i < cats.length; i++) {
			var noCats = false;
			var thisCat = cats0[cats[i]];
			while (!noCats) {
				noCats = true;
				for (var i1 = 0; i1 < thisCat.items.length; i1++) {
					if(thisCat.items[i1].slice(0, 4) === 'cat:'){
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
			if((thisCat.items.includes(pageName) ^ thisCat.blacklist) && !thisCat.hidden){
				if(catsIn){
					catsIn+=', ';
				}
				catsIn+=`<a class="category" href="${thisCat.page ? (thisCat.page + linkSuffix) : ('Category'+linkSuffix+'?'+cats[i])}">${thisCat.name}</a>`;
			}
		}
		return '<div class="categories">categories: '+catsIn+'</div>';
	} catch (error) {
		console.log(error);
		return '';
	}
}

function jsonifyPseudoHjson(item, history){
	const uneggedCurlyBracketRegex = /{([^{]*?)}/;
	const commaInserterRegex = /(?<=[^[{\s,])\s*\n\s*(?=[^\]}\s,])/g;
	const spaceDeleterRegex = /(?<!(§|\\),)(?<!a>)(?<!\w|§|%)\s|\s(?!\w|§|\()(?!<a)/g;
	const commaDeleterRegex = /(?<=[\]}])(?<!\\),(?=[\]}])/g;
	const jsonKeySpaceRemoverRegex = /(?<!\\)"\s*(\w+)\s*":/g;

	var time = 1;
	item = item.replaceAll(commaInserterRegex, ',');//1
	history[time++] = item;

	item = item.replace(spaceDeleterRegex, '');//2
	history[time++] = item;
	

	item = item.replace(commaDeleterRegex, '');//3
	history[time++] = item;
	
	item = item.replaceAll(/['"]?header['"]:?/g, '"header":');//4
	history[time++] = item;
	
	item = item.replaceAll(/(?<="header":)([^,"']+)/g, '"$1"');//5
	history[time++] = item;
	
	/*(item = [...item];//spread string into chars
	var repr = [];
	var depth = 0;
	for(var i = 0; i < item.length; i++){
		if(item[i] === ']'){
			repr[i] = '<b style="color:blue">'+depth+'</b>';
			if(depth === 1){
				item[i] = '}';
			}
			depth--;
		}else if(item[i] === '['){
			repr[i] = '<b style="color:red">'+depth+'</b>';
			if(depth === 0){
				item[i] = '{';
			}
			depth++;
		} else {
			repr[i] = depth;
		}
	}
	item = item.join('');//reassemble string// +'<br>'+repr.join('');*/
	
	//console.log('before aPHAOR'+item);
	//item = item.replaceAll(allPropertyHaversAreObjectsRegex, '{$1"items":[$3]}');
	//console.log('after aPHAOR'+item);
	
	item = item.replaceAll(/\]\[/g, "],[");
	item = item.replaceAll(/\}\{/g, "},{");//6
	history[time++] = item;
	
	item = item.replaceAll(/(?<=((?<!https)(?<!\\):)|((?<!\\),)|[{[])(?!['"[\],{])/g, '"');//7
	history[time++] = item;
	
	item = item.replaceAll(/(?<!['"[\],}])(?=((?<!https)(?<!\\):)|((?<!\\),)|[\]}])/g, '"');
	item = item.replaceAll(/(?<!")\\'(?!")/g, '\\\'\"');//8
	history[time++] = item;
	
	item = item.replaceAll(/\\,/g, ',');
	item = item.replaceAll(/\\'/g, '\'',);
	item = item.replaceAll(/\\:/g, ':');
	history[time++] = item;
	
	item = item.replaceAll(jsonKeySpaceRemoverRegex, '"$1":');
	history[time++] = item;
	return item;
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
function replaceBasicSubstitutions(text) {
	text = text.replaceAll("§l§", '<div class="l-connector"></div>');
	text = text.replaceAll("§L§", '<div class="L-connector"></div>');
	text = text.replaceAll("§Expert§", '<a href="https://terraria.wiki.gg/wiki/Expert_Mode">Expert</a>');
	text = text.replaceAll("§Master§", '<a href="https://terraria.wiki.gg/wiki/Master_Mode">Master</a>');
	text = text.replaceAll("§RExpert§", '<span class="rexpert" onClick="if(event.shiftKey)window.open(\'https://terraria.wiki.gg/wiki/Expert_Mode\', \'_self\');">Expert</span>');
	text = text.replaceAll("§RMaster§", '<span class="rmaster" onClick="if(event.shiftKey)window.open(\'https://terraria.wiki.gg/wiki/Master_Mode\', \'_self\');">Master</span>');
	text = text.replaceAll("§ModImage§", 'https://raw.githubusercontent.com/Tyfyter/Origins/master');
	return text;
}
async function parseAFML(throwErrors = false){
	if (document.location.protocol === 'https:' && document.location.hostname !== '127.0.0.1'){
		linkSuffix = '';
		linkPrefix = '/OriginsWiki';
	}
	var content = document.getElementById("content");
	//content.innerHTML += getSearchLinks("pa");//example code
	var toc = document.getElementById("table-of-contents");
	if(toc){
		toc.innerHTML = '';//"<div style = \"border: 1px solid grey; padding: 10px;\">Contents</div>"
		var contents = '<details id="table-of-contents-details" open><summary>Contents<span class="divider"></span></summary>'
		forDescendants(content, (v, i) => {
			contents += '<div style="margin-left: '+0.2*i.length+'em"><a class="toc-link"  href=#'+v.id+'>'+i+'. '+getSummaryOrId(v)+'</a></div>'
		}, (v) => v.className == 'section', (pIndex, indexNumber) => (pIndex?pIndex+".":"")+(indexNumber+1), "");
		toc.innerHTML += contents+'</details>';
	}
	let subsIndex = 0;
	let substitutions = [];

	const statRegex = /\[(stat) ([^\[]*?)]/i;
	const autoStatRegex = /\[(statblock) ([^\[]*?)]/i;
	const inlineAutoStatRegex = /\[(inlinestatblock) ([^\[]*?)]/i;
	const linkRegex = /\[link ([^\[]*?)]/i;
	const coinRegex = /\[(coins|coin|price|value) ([^\[]*?)]/i;
	const toolPowerRegex = /\[toolpower ([^\[]*?)]/i;
	const autoSortableListRegex = /\[(sortablelist) ([^\[]*?)]/i;
	
	const biomeContentRegex = /\{(?<tag>biomecontent|bc)((.|\n)*?)\k<tag>}/gi;
	const statBlockRegex = /\{(?<tag>statblock|sb)((.|\n)*?)\k<tag>}/gi;
	const inlineStatBlockRegex = /\{(?<tag>inlinestatblock|isb)((.|\n)*?)\k<tag>}/gi;
	const recipeRegex = /\{(?<tag>recipes)((.|\n)*?)\k<tag>}/gi;
	const sortableListRegex = /\{(?<tag>sortablelist)((.|\n)*?)\k<tag>}/gi;

	//original space deleter regex:/(?<!(§|\\),)(?<!a>)(?<!\w|§)\s|\s(?!\w|§)(?!<a)/g;
	//allHeaderHaversAreObjectsRegex: /\[("header":"[^((?<!\)")]*",)([^\[\]]*(?=]))\]/g;
	//const allPropertyHaversAreObjectsRegex = /\[(("style":"[^((?<!\)")]*",|"header":"[^((?<!\)")]*",)+)([^\[\]]*(?=]))\]/g;
	//const allNonPropertiesAreNameless = /,("[^[\]"]+?"(,"[^[\]"]+?")*)(?![:\]])/g;
	//const getItemsRegex = /(?<={)("header":".*?","items":)(\[.*?\])(?=})/g;
	const htmlTagRegex = /<(?<tag>[^\/ ]+?)(.*?)>.*?<\/\k<tag>>/;
	
	var item;

	try{
		item = content.innerHTML.match(statRegex);
		while(item){
			console.log(item);
			content.innerHTML = content.innerHTML.replace(item[0], await processStat(...item[2].split('|')));
			item = content.innerHTML.match(statRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

	try{
		item = content.innerHTML.match(autoStatRegex);
		while(item){
			console.log(item);
			console.log(['before',content.innerHTML]);
			content.innerHTML = content.innerHTML.replace(item[0], await processAutoStats(item[2].trim()));
			console.log(['after',content.innerHTML]);
			item = content.innerHTML.match(autoStatRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

	try{
		item = content.innerHTML.match(inlineAutoStatRegex);
		while(item){
			console.log(item);
			console.log(['before',content.innerHTML]);
			content.innerHTML = content.innerHTML.replace(item[0], await processAutoStats(item[2].trim(), true));
			console.log(['after',content.innerHTML]);
			item = content.innerHTML.match(inlineAutoStatRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}
	
	console.log('autoSortableLists:');
	try{
		item = content.innerHTML.match(autoSortableListRegex);
		//console.log('first', item);
		while(item){
			console.log(item);
			console.log(['before',content.innerHTML]);
			content.innerHTML = content.innerHTML.replace(item[0], await substituteAutoSortableList(item[2].trim()));
			console.log(['after',content.innerHTML]);
			item = content.innerHTML.match(autoSortableListRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

	console.log('links:');
	try{
		/*for (let item of content.innerHTML.matchAll(linkRegex)) {
			let current = pruneLinkArgs(item[1].split('|'));
			let result = processLink(...current);
			substitutions[subsIndex] = result;
			content.innerHTML = content.innerHTML.replace(item[0], '§'+subsIndex+'§');
			subsIndex++;
		}*/
		item = content.innerHTML.match(linkRegex);
		let linkIndex = 0;
		while(item != null){
			//console.log(item);
			let current = pruneLinkArgs(item[1].split('|'));
			//let result = await processLink(...current);
			const currentIndex = linkIndex;
			content.innerHTML = content.innerHTML.replace(item[0], `<span id=link${currentIndex}>${current[0]}</span>`);//'§'+subsIndex+'§'
			processLink(...current).then(async (value) => {
				//console.log(`link ${currentIndex}: ${value}`);
				let element = document.getElementById('link' + currentIndex);
				if (element) {
					element.outerHTML = replaceBasicSubstitutions(value);
				}
			}, null);
			/*processLinkWithID(`link${currentIndex}`, ...current).then(async (value) => {
				//console.log(`link ${currentIndex}: ${value}`);
				let element = document.getElementById('link' + currentIndex);
				if (element) {
					element.outerHTML = replaceBasicSubstitutions(value);
					element = document.getElementById('link' + currentIndex)[0];
					const hrefMatch = /[^\/]+(?!.*[^\/]+)/.exec(/href="([^"]*)"/.exec(value)[1].replaceAll('.html',''))[0];
					const nonMetaMatch = /(?<!.*[^?#]+)[^?#]+/.exec(hrefMatch)[0];
					if(nonMetaMatch && !(await pageExists(nonMetaMatch))){
						element.classList.add('redlink');
					}
				}
			}, null);*/
			linkIndex++;
			item = content.innerHTML.match(linkRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

	console.log('coins:');
	try{
		item = content.innerHTML.match(coinRegex);
		while(item){
			console.log(item);
			let current = pruneLinkArgs(item[2].split('|').reverse());
			let result = processCoins(...current);
			substitutions[subsIndex] = result;
			content.innerHTML = content.innerHTML.replace(item[0], '§'+subsIndex+'§');
			subsIndex++;
			item = content.innerHTML.match(coinRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

	try{
		item = content.innerHTML.match(toolPowerRegex);
		while(item){
			console.log(item);
			let current = pruneLinkArgs(item[1].split('|'));
			let result = processToolStats(...current);
			substitutions[subsIndex] = result;
			content.innerHTML = content.innerHTML.replace(item[0], '§'+subsIndex+'§');
			subsIndex++;
			item = content.innerHTML.match(toolPowerRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

	console.log("items:");
	let blockRegexes = [
		{regex: biomeContentRegex, class: "biomecontents", tag: "div", func: processBiomeContents},
		{regex: statBlockRegex, class: "statblock ontab0", tag: "div", func: processStatBlock},
		{regex: inlineStatBlockRegex, class: "inlinestatblock", tag: "div", func: processStatBlock},
		{regex: sortableListRegex, class: "sortablelist", tag: "table", func: processSortableList},
		{regex: recipeRegex, class: 'recipetable" cellspacing="0', first:'<thead><tr><th>Result</th><th class="middle">Ingredients</th><th><a href="https://terraria.wiki.gg/wiki/Crafting_stations">Crafting Station</a></th></tr></thead>', tag: "table", func: processRecipeBlock}
		
		//{regex: altTabRegex, class: "alttabs", tag: "div", func: processAltTabs, first: 'tabHeader', finish: finishAltTabs}
	];
	for(var cycle = 0; cycle < blockRegexes.length; cycle++)try{
		let currentMatch = blockRegexes[cycle].regex.exec(content.innerHTML);
		if (currentMatch !== null) console.log(blockRegexes[cycle].class);
		while(currentMatch !== null){
			console.log("an item");
			let result = "<"+blockRegexes[cycle].tag+" class=\""+blockRegexes[cycle].class+"\">";
			let item = currentMatch[2];

			//console.log("match: "+item);

			let currentTag = htmlTagRegex.exec(item);
			while(currentTag !== null){
				item = item.replace(currentTag[0], "§"+subsIndex+"§");
				substitutions[subsIndex++] = currentTag[0];
				currentTag = htmlTagRegex.exec(item);
			}
			var history = [item];//0
			item = jsonifyPseudoHjson(item, history);
			
			//console.log('before aNPANR'+item);
			//item = item.replaceAll(allNonPropertiesAreNameless, ',"items":[$1]');
			//history[time++] = item;
			
			//console.log('after aNPANR'+item);
			
			//result += item;
			var sections;
			try{
				sections = JSON.parse('['+item+']');
			  lastErrObject = sections;
				if(blockRegexes[cycle].first) result += blockRegexes[cycle].first;
				for(var i = 0; i < sections.length; i++){
					result += await blockRegexes[cycle].func(sections[i]);
				}
				if(blockRegexes[cycle].finish)result = blockRegexes[cycle].finish(result);
			}catch(e){
				console.error(history);
				console.error(e);
				console.error("while parsing");
				console.error('['+item+']');
				console.error("on cycle "+cycle);
				if(throwErrors) throw {sourceError:e, data:'['+item+']', cycle:cycle};
			}
			result += "</"+blockRegexes[cycle].tag+">";
			substitutions[subsIndex] = result;
			content.innerHTML = content.innerHTML.replace(currentMatch[0], '§'+subsIndex+'§');
			subsIndex++;
			//content.innerHTML = content.innerHTML.replace(currentMatch[0], result);
			blockRegexes[cycle].regex.lastIndex = 0;
			currentMatch = blockRegexes[cycle].regex.exec(content.innerHTML);
		}
	}catch(error){
		console.error(error);
		if(throwErrors) throw error;
	}
	console.log(subsIndex+" substitutions: ");
	var subsObj = {};
	var subStringLength = (substitutions.length-1).toString().length;
	var firstSub = true;
	var subbedCount = 0
	do{
		subbedCount = 0;
		for(var i = 0; i < substitutions.length; i++){
			//console.log(substitutions[i]);
			try {
				var iString = i.toString();
				while(iString.length < subStringLength)iString = "0"+iString;
				eval("subsObj.sub"+iString+"='"+substitutions[i].replace("'","\\'")+"'");
			} catch (error) {
				console.log("could not add "+substitutions[i]+" at substitution index "+i);
			}
			if(content.innerHTML.includes("§"+i+"§")){
				subbedCount++;
				content.innerHTML = content.innerHTML.replaceAll("§"+i+"§", substitutions[i]);
			}
		}
		firstSub = false;
	}while(subbedCount > 0);
	console.log(subsObj);
	const internalNameRegex = /\[(internalname) ([^\[]*?)]/i;
	try{
		item = content.innerHTML.match(internalNameRegex);
		while(item){
			console.log(item);
			content.innerHTML = content.innerHTML.replace(item[0], `<div class="internalname">Internal Name: ${item[2]}</div>`);
			item = content.innerHTML.match(internalNameRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}
	content.innerHTML = replaceBasicSubstitutions(content.innerHTML);
	//*/
	//let item of content.innerHTML.matchAll(biomeContentRegex)
	/*let currentItem = item[0].replace(/(?<q>['"])?header\k<q>?/g, '"header"');
	let index = 0;
	let substitutions = [];
	let currentEgg = uneggedCurlyBracketRegex.exec(currentItem);
	while(currentEgg !== null){
		currentItem = currentItem.replace(currentEgg[0], "§"+index);
		substitutions[index++] = currentEgg[0];
		currentEgg = uneggedCurlyBracketRegex.exec(currentItem);
	}
	for(let i = 0; i < substitutions.length; i++){
		console.log(tryParseEgg(substitutions[i]));
	}
	for(let group of item[0].replace(/\s/g, '').matchAll()){
		result = "<div class=\"subcontents\">";
			let current = group[0].replace(/(\s*{)*(}\s*)* /g,'').split('|');
			result += processLink(current[0], current[1], current[2]);
		result += "</div>";
	}*/
//});
	var deferred = document.getElementsByClassName("deferred");
	console.log('deferred processing:', deferred);
	let processedLists = [];
	for (let index = 0; index < deferred.length; index++) {
		const element = deferred[index];
		if (element.classList.contains('sortablelist')) {
			var list;
			for (let index = 0; index < element.classList.length; index++) {
				list = element.classList[index];
				if (list.startsWith('listsource-')) {
					list = list.replace('listsource-', '');
					break;
				}
				list = null;
			}
			if (processedLists.includes(list)) continue;
			processedLists.push(list);
			console.log(element);
			processAutoSortableList(element, list).then(function name(params) {
				console.log(list);
				params = replaceBasicSubstitutions(params);
				var tables = document.getElementsByClassName('listsource-' + list);
				for (let index = 0; index < tables.length; index++) {
					tables[index].innerHTML = params;
				}
			});
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
function withChildren(parent) {
	for (let index = 1; index < arguments.length; index++) {
		parent.appendChild(arguments[index]);
	}
	return parent;
}
var parse = async ()=>{
	typeof preParseCallback !== 'undefined' && preParseCallback();
	await parseAFML();
	var content = document.getElementById("content");
	console.log('1');
	
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
	document.getElementById('bgtoggle').outerHTML = '<svg xmlns="http://www.w3.org/2000/svg" id="bgtoggle" viewBox="0 0 24 18" onclick="setBackground(!getBackground())"><path d=""></path></svg>';
	//document.getElementById('bgtoggle').onclick = () => setBackground(!getBackground());
	document.getElementById('lighttoggle').outerHTML = '<img id="lighttoggle" onclick="toggleThemeSelector()">';
	document.getElementById('searchbar').outerHTML = '<input id="searchbar" placeholder="Search Origins wiki" oninput="onSearchbarInput(event)" onkeydown="onSearchbarKeyDown(event)">';
	document.getElementById('searchIcon').outerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="searchSymbol" onclick="search()">'+
	'<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>'+
	'</svg>';
	refreshSiteSettings();
	//document.getElementById('searchSymbol').onclick = search;
	/*content.innerHTML = '<div id="toolbar">'+
		'<div id="toolbar-container">'+
			'<a href="." style="height: 0;"><img id="wikilogo"></a>'+
			'<svg xmlns="http://www.w3.org/2000/svg" id="bgtoggle" viewBox="0 0 24 18" onclick="setBackground(!getBackground())"><path d=""></path></svg>'+
			'<img id="lighttoggle" onclick="toggleThemeSelector()">'+
			'<span id="themeContainer"></span>'+
			'<input id="searchbar" placeholder="Search Origins wiki" oninput="onSearchbarInput(event)" onkeydown="onSearchbarKeyDown(event)">'+
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="searchSymbol" onclick="search()">'+
			'<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>'+
			'</svg>'+
		'</div>'+
		'<div id="searchlinks"></div>'+
	'</div>'+content.innerHTML;*/
	var head = document.getElementsByTagName("head");
	if(head && head[0]){
		var favicon = document.createElement('link');
		favicon.rel = 'icon';
		favicon.href = 'favicon.ico';
		favicon.type = 'image/icon type';
		favicon.id = 'favicon';
		head[0].appendChild(favicon);
		//head[0].innerHTML += '<link rel="icon" href="favicon.ico" type="image/icon type">';
	}
	refreshThemeIcon();
	let catSegPromise = createCategorySegment().then(function(v){console.log(v);content.innerHTML += v;});
	/*let redableLinks = content.getElementsByTagName("A");
	console.log(redableLinks.length + 'links');
	let redLinkPromise = (async () => {
		for (let i = 0; i < redableLinks.length; i++) {
			const element = redableLinks[i];
			if(element.classList.contains('linkimage') || element.href.startsWith('https://terraria.wiki.gg'))continue;
			const hrefMatch = /[^\/]+(?!.*[^\/]+)/.exec(element.href.replaceAll('.html',''))[0];
			const nonMetaMatch = /(?<!.*[^?#]+)[^?#]+/.exec(hrefMatch)[0];
			if(nonMetaMatch && !(await pageExists(nonMetaMatch))){
				element.classList.add("redlink");
			}
		}
	})();*/
	await catSegPromise;
	//await redLinkPromise;
	typeof postParseCallback !== 'undefined' && postParseCallback();
};
parse();
