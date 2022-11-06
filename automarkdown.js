//window.alert("test");
var jsLoaded = true;
var linkSuffix = '.html';
var linkPrefix = '';
const lightSettingSuffix = '_Mode.png';
var cookieSuffix = 'path=/;';
const section = '§'.substring('§'.length-1);

const catCommaRegex = /(?<!\[|{|\s)([\s]*\n[\s]*)(?!]|}|\s)/g;
const catLeftQuoteRegex = /(^|(?<!\\):)(\s*)([^{}\[\]\s])/gm;
const catRightQuoteRegex = /([^{}\[\]\s])(\s*)($|(?<!\\):)/gm;

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
var _siteMap = requestPageText('sitemap.xml');
var _stats = {};
var pageName = document.location.pathname.split('/').pop().replaceAll('.html', '') || 'index';
_stats[pageName] = new Promise((resolve, reject) => {
		requestPageText('stats/'+pageName + '.json').then((v) => {
			_stats[pageName] = v.startsWith('<!DOCTYPE html>') ? null: v;
			_stats[pageName] ? resolve(_stats[pageName]) : reject(404);
		});
	}
);

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
		document.cookie = 'sitesettings:{"'+setting+'":'+value+'}; ' + cookieSuffix;
	}
	refreshSiteSettings();
}

function getSiteSettings(){
	var match = siteSettingsRegex.exec(document.cookie.toString());
	var siteSettings = {};
	if(match){
		siteSettings = JSON.parse(match[1]);
	}
	return siteSettings;
}

function refreshSiteSettings(){
	var siteSettings = getSiteSettings();

	var darkMode = siteSettings.darkmode;
	var background = !siteSettings.nobackground;
	var html = document.getElementsByTagName('html')[0];
	var body = document.getElementsByTagName('body')[0];

	//console.log('setting dark mode to '+darkMode);
	if(darkMode){
		html.className = html.className + " darkmode";
	} else {
		html.className = html.className.replaceAll('darkmode', '');
	}
	var lightToggle = document.getElementById('lighttoggle');
	if(lightToggle){
		lightToggle.src = (darkMode ? 'Dark' : 'Light' ) + lightSettingSuffix;
	}

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
function setDarkMode(value){
	setSiteSettings('darkmode', value);
}

function getDarkMode(){
	return getSiteSettings().darkmode;
}

function setBackground(value){
	setSiteSettings('nobackground', !value);
}

function getBackground(){
	return !getSiteSettings().nobackground;
}

function processLink(targetName, image, targetPage, note){
	if(image === '$default'){
		image = undefined;
	}
	if(targetPage === '$default'){
		targetPage = undefined;
	}
	var result = '<span class="linkdiv">';
	if(targetPage === undefined){
		targetPage = (targetName.replace(' ', '_')+linkSuffix);
	}
	if(image){
		result += `<a class="linkimage" href="${targetPage}"><img src=${image}></a>`;
	}
	if(!targetPage){
		return targetName + '</span>';
	}
	result += '<span class=linktext'+(image?' style="vertical-align: middle"':'')+'><a href="'+targetPage+'">'+targetName+'</a>';
	if(note){
		result += '<br><span class="linknote">'+note+'</span>';
	}
	return result + '</span></span>';
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
async function requestStats(name){
	var value = await _stats[name];
	if(value === undefined){
		var v = await (_stats[name] = requestPageText('stats/'+name + '.json'));
		value = (_stats[name] = v.startsWith('<!DOCTYPE html>') ? null: v);
	}
	return value;
}
async function processAutoStats(name = pageName){
	var value = await requestStats(name);
	if(value === null){
		return null;
	}
	value = JSON.parse(value);
	var result = '';
	if(value.Types.includes("Weapon")){
		result = '{statblock ';
		var addComma = false;
		if(value.Image){
			result += `{header: ${value.Name || name.replaceAll('_',' ')}, items:[{image:Images/${value.Image}.png}]}`;
		}
		result += (addComma ? ',{' : '{') + 'header:Statistics, items:[';
		if(value.Damage){
			result += `{label:Damage,value:${value.Damage}}`;
		}
		if(value.Knockback){
			result += `{label:[link Knockback | | https://terraria.wiki.gg/wiki/Knockback],value:${value.Knockback}}`;
		}
		if(value.Crit){
			result += `{label:[link Critical chance | | https://terraria.wiki.gg/wiki/Critical_hit],value:${value.Crit}}`;
		}
		if(value.UseTime){
			result += `{label:[link UseTime | | https://terraria.wiki.gg/wiki/Use_Time],value:${value.UseTime}}`;
		}
		if(value.Velocity){
			result += `{label:[link Velocity | | https://terraria.wiki.gg/wiki/Velocity],value:${value.Velocity}}`;
		}
		if(value.Rarity){
			result += `{label:[link Rarity | | https://terraria.wiki.gg/wiki/Rarity],value:[link | Images/Rare${value.Rarity}.png | https://terraria.wiki.gg/wiki/Rarity]}`;
		}
		if(value.Sell){
			result += `{label:[link Sell | | https://terraria.wiki.gg/wiki/Value],value:[coins ${Math.floor(value.Sell / 1000000) % 100} | ${Math.floor(value.Sell / 10000) % 100} | ${Math.floor(value.Sell / 100) % 100} | ${(value.Sell) % 100}]}`;
		}
		result += `{label:[link Research | | https://terraria.wiki.gg/wiki/Journey_Mode#Research],value:<abbr class="journey" title="Journey Mode">${value.Research||1} required</abbr>}`;
		result += ']}';
		result += ' statblock}';
	}
	if(value.Types.includes("NPC")){
		result = '{statblock ';
		var _class = (value.Expert || value.Master) ? 'class:onlytab0,' : '';
		var _expertClass = 'class:onlytab1,';
		var _masterClass = value.Expert ? 'class:onlytab2,' : 'class:onlytab1,';
		var addComma = false;
		const getClass = (val) => {
			return (value.Expert && value.Expert[val]) || (value.Master && value.Master[val])? _class : '';
		};
		if(value.Image){
			result += `{header: ${value.Name || name.replaceAll('_',' ')}, items:[{image:Images/${value.Image}.png}]}`;
		}
		result += (addComma ? ',{' : '{') + `header:Statistics, ${_class?`tabs:[Normal,${value.Expert?`Expert${value.Master?',Master':''}`:'Master'}],`:''} items:[`;
		if(value.Biome){
			result += `{label:[link Environment | | https://terraria.wiki.gg/wiki/Biome],${getClass('Biome')} value${Array.isArray(value.Biome)?'s':''}:${JSON.stringify(value.Biome)}}`;
			if(value.Expert && value.Expert.Biome){
				result += `{label:[link Environment | | https://terraria.wiki.gg/wiki/Biome],${_expertClass} value${Array.isArray(value.Expert.Biome)?'s':''}:${JSON.stringify(value.Biome)}}`;
			}
			if(value.Master && value.Master.Biome){
				result += `{label:[link Environment | | https://terraria.wiki.gg/wiki/Biome],${_masterClass} value${Array.isArray(value.Master.Biome)?'s':''}:${JSON.stringify(value.Master.Biome)}}`;
			}
		}
		if(value.AIStyle){
			result += `{label:[link AI Style | | https://terraria.wiki.gg/wiki/AI],${getClass('AIStyle')} value${Array.isArray(value.AIStyle)?'s':''}:${JSON.stringify(value.AIStyle)}}`;
			if(value.Expert && value.Expert.AIStyle){
				result += `{label:[link AI Style | | https://terraria.wiki.gg/wiki/AI],${_expertClass} value${Array.isArray(value.Expert.AIStyle)?'s':''}:${JSON.stringify(value.Expert.AIStyle)}}`;
			}
			if(value.Master && value.Master.AIStyle){
				result += `{label:[link AI Style | | https://terraria.wiki.gg/wiki/AI],${_masterClass} value${Array.isArray(value.Master.AIStyle)?'s':''}:${JSON.stringify(value.Master.AIStyle)}}`;
			}
		}
		if(value.Damage){
			result += `{label:Damage,${getClass('Damage')} value${Array.isArray(value.Damage)?'s':''}:${JSON.stringify(value.Damage)}}`;
			if(value.Expert && value.Expert.Damage){
				result += `{label:Damage,${_expertClass} value${Array.isArray(value.Expert.Damage)?'s':''}:${JSON.stringify(value.Expert.Damage)}}`;
			}
			if(value.Master && value.Master.Damage){
				result += `{label:Damage,${_masterClass} value${Array.isArray(value.Master.Damage)?'s':''}:${JSON.stringify(value.Master.Damage)}}`;
			}
		}
		if(value.MaxLife){
			result += `{label:Max Life,${getClass('MaxLife')} value:${value.MaxLife}}`;
			if(value.Expert && value.Expert.MaxLife){
				result += `{label:Max Life,${_expertClass} value:${value.Expert.MaxLife}}`;
			}
			if(value.Master && value.Master.MaxLife){
				result += `{label:Max Life,${_masterClass} value:${value.Master.MaxLife}}`;
			}
		}
		if(value.Defense){
			result += `{label:[link Defense | | https://terraria.wiki.gg/wiki/Defense],${getClass('Defense')} value${Array.isArray(value.Defense)?'s':''}:${JSON.stringify(value.Defense)}}`;
			if(value.Expert && value.Expert.Defense){
				result += `{label:[link Defense | | https://terraria.wiki.gg/wiki/Defense],${_expertClass} value${Array.isArray(value.Expert.Defense)?'s':''}:${JSON.stringify(value.Expert.Defense)}}`;
			}
			if(value.Master && value.Master.Defense){
				result += `{label:[link Defense | | https://terraria.wiki.gg/wiki/Defense],${_masterClass} value${Array.isArray(value.Master.Defense)?'s':''}:${JSON.stringify(value.Master.Defense)}}`;
			}
		}
		if(value.KBResist){
			result += `{label:[link Knockback | | https://terraria.wiki.gg/wiki/Knockback] Resistance,${getClass('KBResist')} value${Array.isArray(value.KBResist)?'s':''}:${JSON.stringify(value.KBResist)}}`;
			if(value.Expert && value.Expert.KBResist){
				result += `{label:[link Knockback | | https://terraria.wiki.gg/wiki/Knockback] Resistance,${_expertClass} value${Array.isArray(value.Expert.KBResist)?'s':''}:${JSON.stringify(value.Expert.KBResist)}}`;
			}
			if(value.Master && value.Master.KBResist){
				result += `{label:[link Knockback | | https://terraria.wiki.gg/wiki/Knockback] Resistance,${_masterClass} value${Array.isArray(value.Master.KBResist)?'s':''}:${JSON.stringify(value.Master.KBResist)}}`;
			}
		}
		if(value.Immunities){
			result += `{label:Immune to,${getClass('Immunities')} values:[${value.Immunities.join(', ')}]}`;
			if(value.Expert && value.Expert.Immunities){
				result += `{label:Immune to,${_expertClass} values:[${value.Expert.Immunities.join(', ')}]}`;
			}
			if(value.Master && value.Master.Immunities){
				result += `{label:Immune to,${_masterClass} values:[${value.Master.Immunities.join(', ')}]}`;
			}
		}
		result += ']}';
		if(value.Drops || value.Coins){
			result += ',{header:Drops, items:['
			if(value.Coins) {
				result += `{
					label:[link Coins | | https://terraria.wiki.gg/wiki/NPC_drops#Coin_drops],${getClass('Coins')}
					value:[coins ${Math.floor(value.Coins / 1000000) % 100} | ${Math.floor(value.Coins / 10000) % 100} | ${Math.floor(value.Coins / 100) % 100} | ${(value.Coins) % 100}]
				},`;
				if(value.Expert && value.Expert.Coins) {
					result += `,{
						label:[link Coins | | https://terraria.wiki.gg/wiki/NPC_drops#Coin_drops],${_expertClass}
						value:[coins ${Math.floor(value.Master.Coins / 1000000) % 100} | ${Math.floor(value.Master.Coins / 10000) % 100} | ${Math.floor(value.Master.Coins / 100) % 100} | ${(value.Master.Coins) % 100}]
					},`;
				}
				if(value.Master && value.Master.Coins) {
					result += `,{
						label:[link Coins | | https://terraria.wiki.gg/wiki/NPC_drops#Coin_drops],${_masterClass}
						value:[coins ${Math.floor(value.Master.Coins / 1000000) % 100} | ${Math.floor(value.Master.Coins / 10000) % 100} | ${Math.floor(value.Master.Coins / 100) % 100} | ${(value.Master.Coins) % 100}]
					},`;
				}
			}
			if(value.Drops) {
				result += `{
					label:Items,${getClass('Drops')}
					values:${JSON.stringify(value.Drops)}
				},`;
			}
			if(value.Expert && value.Expert.Drops) {
				result += `{
					label:Items,${_expertClass}
					values:${JSON.stringify(value.Expert.Drops)}
				},`;
			}
			if(value.Master && value.Master.Drops) {
				result += `{
					label:Items,${_masterClass}
					values:${JSON.stringify(value.Master.Drops)}
				},`;
			}
			result += ']}';
		}
		result += ' statblock}';
	}
	return result;
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
		text+='<span class="tabname" onClick=selectTab(event.srcElement,'+i+')>'+tabs[i]+'</span>';
	}
	return text+'</div>';
}

function pruneLinkArgs(array){
	for(var i = 0; i < array.length; i++){
		array[i] = array[i].trim();
	}
	return array;
}

function processBiomeContents(data, depth){
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
				result += '<span>'+processLink(data.items[i])+'</span>';
			}else if(data.items[i] instanceof Array){
				result += '<span>'+processLink(...data.items[i])+'</span>';
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
				result += processBiomeContents(data.items[i], depth + 1);
				result += '</div>';
			}
		}
	}
	return result;
}
function processStatBlock(data, depth){
	var result = '';
	if(data.header){
		result += makeHeader(data.header);
	}
	if(data.tabs){
		result += makeTabs(data.tabs);
	}
	if(data.items){
		for(var i = 0; i < data.items.length; i++){
			if(data.items[i].image){
				result += '<img src='+data.items[i].image +'>';
			}else{
				if(data.items[i].label){
					var klasse = '';
					if(data.items[i].class){
						klasse = ' '+data.items[i].class;
					}
					if(data.items[i].value){
						result += '<div class="stat'+klasse+'">' +
						data.items[i].label +
						': ' +
						data.items[i].value +
						'</div>';
					}else if(data.items[i].values){
						result += '<div class="stat'+klasse+'">' +
						data.items[i].label + ': <div class="statvalues">';
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
	var result = '<thead><tr>';
	if(data.headers[0] === 'Name'){
		data.headers[0] = {name:'Name',expr:'processLink(item.Name, `Images/${item.Name}.png`)',sortIndex:'item.Name',noAbbr:true};
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
		evalItem = {};
		for(let key in item){
			keys.add(key);
		}
		keys.forEach((key)=>{evalItem[key] = item[key];});
		var context = `let item = ${JSON.stringify(evalItem)};`;
		for(var j = 0; j < data.headers.length; j++){
			result += `<td ${j>0&&j<data.headers.length?'class="notleft"':''}>
			${data.headers[j].expr?eval(`${context}${data.headers[j].expr};`):item[data.headers[j]]}
			${data.headers[j].sortIndex?`<span class="sortindex">${eval(`${context}${data.headers[j].sortIndex};`)}</span>`:''}</td>`;
		}
		result += '</tr>';
	}
	result += '</tbody>';
	console.log(result);
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

async function createCategorySegment(){
	try {
		if(pageName == 'Category'){
			return "";
		}
		var cats0 = await getCategories();
		var cats = [];
		console.log("cats:");
		for (let key in cats0) {
			console.log(key);
			if (cats0.hasOwnProperty(key)) {
				cats.push(cats0[key]);
			}
		}
		var catsIn = '';
		for (let i = 0; i < cats.length; i++) {
			var noCats = false;
			while (!noCats) {
				noCats = true;
				for (var i1 = 0; i1 < cats[i].items.length; i1++) {
					if(cats[i].items[i1].slice(0, 4) === 'cat:'){
						noCats = false;
						try{
							cats[i].items.push(...cats0[cats[i].items[i1].slice(4)].items);
						}catch(error){
							console.error(error);
						}
						cats[i].items.splice(i1,1);
					}
				}
			}
			if((cats[i].items.includes(pageName) ^ cats[i].blacklist) && !cats[i].hidden){
				if(catsIn){
					catsIn+=', ';
				}
				catsIn+=`<a class="category" href="${cats[i].page ? (cats[i].page + linkSuffix) : ('Category'+linkSuffix+'?'+cats[i].name)}">${cats[i].name}</a>`;
			}
		}
		return '<div class="categories">categories: '+catsIn+'</div>';
	} catch (error) {
		console.log(error);
		return '';
	}
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
		var contents = '<details style = "border: 1px solid grey; margin: 0px; padding: 0.2em;" open><summary>Contents<span class="divider"></span></summary>'
		forDescendants(content, (v, i) => {
			contents += '<div style="margin-left: '+0.2*i.length+'em"><a class="toc-link"  href=#'+v.id+'>'+i+'. '+getSummaryOrId(v)+'</a></div>'
		}, (v) => v.className == 'section', (pIndex, indexNumber) => (pIndex?pIndex+".":"")+(indexNumber+1), "");
		toc.innerHTML += contents+'</details>';
	}
	let subsIndex = 0;
	let substitutions = [];

	const statRegex = /\[(stat) ([^\[]*?)]/i;
	const autoStatRegex = /\[(statblock) ([^\[]*?)]/i;
	const linkRegex = /\[link ([^\[]*?)]/i;
	const coinRegex = /\[(coins|coin|price|value) ([^\[]*?)]/i;
	
	const biomeContentRegex = /\{(?<tag>biomecontent|bc)((.|\n)*?)\k<tag>}/gi;
	const statBlockRegex = /\{(?<tag>statblock|sb)((.|\n)*?)\k<tag>}/gi;
	const inlineStatBlockRegex = /\{(?<tag>inlinestatblock|isb)((.|\n)*?)\k<tag>}/gi;
	const recipeRegex = /\{(?<tag>recipes)((.|\n)*?)\k<tag>}/gi;
	const sortableListRegex = /\{(?<tag>sortablelist)((.|\n)*?)\k<tag>}/gi;

	const uneggedCurlyBracketRegex = /{([^{]*?)}/;
	const commaInserterRegex = /(?<=[^[{\s,])\s*\n\s*(?=[^\]}\s,])/g;
	const spaceDeleterRegex = /(?<!(§|\\),)(?<!a>)(?<!\w|§|%)\s|\s(?!\w|§|\()(?!<a)/g;
	const commaDeleterRegex = /(?<=[\]}])(?<!\\),(?=[\]}])/g;
	const jsonKeySpaceRemoverRegex = /(?<!\\)"\s*(\w+)\s*":/g;
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
		/*for (let item of content.innerHTML.matchAll(linkRegex)) {
			let current = pruneLinkArgs(item[1].split('|'));
			let result = processLink(...current);
			substitutions[subsIndex] = result;
			content.innerHTML = content.innerHTML.replace(item[0], '§'+subsIndex+'§');
			subsIndex++;
		}*/
		item = content.innerHTML.match(linkRegex);
		while(item != null){
			//console.log(item);
			let current = pruneLinkArgs(item[1].split('|'));
			let result = processLink(...current);
			substitutions[subsIndex] = result;
			content.innerHTML = content.innerHTML.replace(item[0], '§'+subsIndex+'§');
			subsIndex++;
			item = content.innerHTML.match(linkRegex);
		}
	}catch(e){
		console.error(e);
		if(throwErrors) throw {sourceError:e, data:item};
	}

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
		console.log(blockRegexes[cycle].class);
		let currentMatch = blockRegexes[cycle].regex.exec(content.innerHTML);
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
			var time = 1;
			var history = [item];

			item = item.replaceAll(commaInserterRegex, ',');
			history[time++] = item;

			item = item.replace(spaceDeleterRegex, '');
			history[time++] = item;
			

			item = item.replace(commaDeleterRegex, '');
			history[time++] = item;
			
			item = item.replaceAll(/['"]?header['"]:?/g, '"header":');
			history[time++] = item;
			
			item = item.replaceAll(/(?<="header":)([^,"']+)/g, '"$1"');
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
			item = item.replaceAll(/\}\{/g, "},{");
			history[time++] = item;
			
			item = item.replaceAll(/(?<=((?<!https)(?<!\\):)|((?<!\\),)|[{[])(?!['"[\],{])/g, '"');
			history[time++] = item;
			
			item = item.replaceAll(/(?<!['"[\],}])(?=((?<!https)(?<!\\):)|((?<!\\),)|[\]}])/g, '"');
			history[time++] = item;
			
			item = item.replaceAll(/\\,/g, ',');
			item = item.replaceAll(/\\:/g, ':');
			history[time++] = item;
			
			item = item.replaceAll(jsonKeySpaceRemoverRegex, '"$1":');
			history[time++] = item;
			
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
	content.innerHTML = content.innerHTML.replaceAll("§l§", '<div class="l-connector"></div>');
	content.innerHTML = content.innerHTML.replaceAll("§L§", '<div class="L-connector"></div>');
	content.innerHTML = content.innerHTML.replaceAll("§Expert§", '<a href="https://terraria.wiki.gg/wiki/Expert_Mode">Expert</a>');
	content.innerHTML = content.innerHTML.replaceAll("§Master§", '<a href="https://terraria.wiki.gg/wiki/Master_Mode">Master</a>');
	content.innerHTML = content.innerHTML.replaceAll("§RExpert§", '<span class="rexpert" onClick="if(event.shiftKey)window.open(\'https://terraria.wiki.gg/wiki/Expert_Mode\', \'_self\');">Expert</span>');
	content.innerHTML = content.innerHTML.replaceAll("§RMaster§", '<span class="rmaster" onClick="if(event.shiftKey)window.open(\'https://terraria.wiki.gg/wiki/Master_Mode\', \'_self\');">Master</span>');
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
var parse = async ()=>{
	typeof preParseCallback !== 'undefined' && preParseCallback();
	await parseAFML();
	var content = document.getElementById("content");
	let redableLinks = content.getElementsByTagName("A");
	console.log(redableLinks.length + 'links');
	for (let i = 0; i < redableLinks.length; i++) {
		const element = redableLinks[i];
		if(element.classList.contains('linkimage') || element.href.startsWith('https://terraria.wiki.gg'))continue;
		if(!(await pageExists(/[^\/]+(?!.*[^\/]+)/.exec(element.href.replaceAll('.html',''))[0]))){
			element.classList.add("redlink");
		}
	}
	console.log('1');

	content.innerHTML = '<div id="toolbar">'+
	'<svg xmlns="http://www.w3.org/2000/svg" id="bgtoggle" viewBox="0 0 24 18" onclick="setBackground(!getBackground())"><path d=""></path></svg>'+
	'<img id="lighttoggle" onclick="setDarkMode(!getDarkMode())">'+
	'<input id="searchbar" placeholder="Search Origins wiki" oninput="onSearchbarInput(event)" onkeydown="onSearchbarKeyDown(event)">'+
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="searchSymbol" onclick="search()">'+
    '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>'+
    '</svg>'+
	'<div id="searchlinks"></div>'+
	'</div>'+content.innerHTML;
	refreshSiteSettings();
	var head = document.getElementsByTagName("head");
	if(head && head[0]){
		head[0].innerHTML += '<link rel="icon" href="favicon.ico" type="image/icon type">';
	}
	createCategorySegment().then(function(v){console.log(v);content.innerHTML += v;});
	typeof postParseCallback !== 'undefined' && postParseCallback();
};
parse();