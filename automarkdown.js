//window.alert("test");
var jsLoaded = true;
var linkSuffix = '.html';

function createFilteredResponseHandler(filter, action, includeExtension){
	function getResponse() {
		// `this` will refer to the `XMLHTTPRequest` object that executes this function
		var responseObj = JSON.parse(this.responseText);
		var values = [];
		for(var i = 0; i < responseObj.tree.length; i++){
			var match = responseObj.tree[i].path.match(/\.[^.]+/g);
			var addition = responseObj.tree[i].path.replace(match, "");
			if(addition && (!filter || match==filter)){
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

function getSearchLinks(query, filter = ".html"){
    query = query.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
	var regexQuery = new RegExp("("+query+")","gi");
	var results = [];
	requestAndProcessPageList(function(re){
		results = re.filter(function(v){
			return v.match(regexQuery);
		});
	}, filter, true);
	//window.alert(results);
	results = results.sort(function(a, b) {
		regexQuery.exec(a);
		var aIndex = regexQuery.lastIndex;
		regexQuery.exec(b);
		var bIndex = regexQuery.lastIndex;
		return aIndex-bIndex;
	});
	//window.alert(results);
	return results.map(function(v){
		return "<a href="+v+">"+v.replace(/\.[^.]+/g, "").replace(regexQuery, "<b>\$1</b>")+"</a>";
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

function setDarkMode(value){
	document.cookie = 'darkmode:'+value+'; path=/; Secure';
	refreshDarkMode();
}

function getDarkMode(){
	const getDarkModeRegex = /darkmode:(.*?)(;|$)/;
	var match = getDarkModeRegex.exec(document.cookie.toString());
	return match && (match[1] === 'true');
}

function refreshDarkMode(){
	var value = getDarkMode();
	var content = document.getElementById("content");
	console.log('setting dark mode to '+value);
	if(value){
		content.className = content.className + " darkmode";
	} else {
		content.className = content.className.replaceAll('darkmode', '');
	}
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
		result += '<span class="linkimage"><img src='+image+'></span>';
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

function makeHeader(text){
	return '<div class="header"><span class="padding" style="padding-left: 7.5px;"></span><span class="text">'+text+'</span><span class="padding" style="flex-grow: 1;"></span></div>';
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
	if(data.items){
		for(var i = 0; i < data.items.length; i++){
			if(data.items[i].image){
				result += '<img src='+data.items[i].image +'>';
			}else{
				if(data.items[i].label){
					if(data.items[i].value){
						result += '<div class="stat">' +
						data.items[i].label +
						': ' +
						data.items[i].value +
						'</div>';
					}else if(data.items[i].values){
						result += '<div class="stat">' +
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

function parseAFML(throwErrors = false){
	if (document.location.protocol === 'https:'){
		linkSuffix = '';
	}
	refreshDarkMode(getDarkMode());
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

	const linkRegex = /\[link([^\[]*?)]/i;
	const coinRegex = /\[(coins|coin|price|value)([^\[]*?)]/i;
	
	const biomeContentRegex = /\{(?<tag>biomecontent|bc)((.|\n)*?)\k<tag>}/gi;
	const statBlockRegex = /\{(?<tag>statblock|sb)((.|\n)*?)\k<tag>}/gi;
	const inlineStatBlockRegex = /\{(?<tag>inlinestatblock|isb)((.|\n)*?)\k<tag>}/gi;
	const recipeRegex = /\{(?<tag>recipes)((.|\n)*?)\k<tag>}/gi;

	const uneggedCurlyBracketRegex = /{([^{]*?)}/;
	const commaInserterRegex = /(?<=[^[{\s,])\s*\n\s*(?=[^\]}\s,])/g;
	const spaceDeleterRegex = /(?<!(§|\\),)(?<!a>)(?<!\w|§|%)\s|\s(?!\w|§|\()(?!<a)/g;
	const commaDeleterRegex = /(?<=[\]}])(?<!\\),(?=[\]}])/g;
	//original space deleter regex:/(?<!(§|\\),)(?<!a>)(?<!\w|§)\s|\s(?!\w|§)(?!<a)/g;
	//allHeaderHaversAreObjectsRegex: /\[("header":"[^((?<!\)")]*",)([^\[\]]*(?=]))\]/g;
	//const allPropertyHaversAreObjectsRegex = /\[(("style":"[^((?<!\)")]*",|"header":"[^((?<!\)")]*",)+)([^\[\]]*(?=]))\]/g;
	//const allNonPropertiesAreNameless = /,("[^[\]"]+?"(,"[^[\]"]+?")*)(?![:\]])/g;
	//const getItemsRegex = /(?<={)("header":".*?","items":)(\[.*?\])(?=})/g;
	const htmlTagRegex = /<(?<tag>[^\/ ]+?)(.*?)>.*?<\/\k<tag>>/;
	
	var item;

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
		{regex: statBlockRegex, class: "statblock", tag: "div", func: processStatBlock},
		{regex: inlineStatBlockRegex, class: "inlinestatblock", tag: "div", func: processStatBlock},
		{regex: recipeRegex, class: 'recipetable" cellspacing="0', first:'<thead><tr><th>Result</th><th class="middle">Ingredients</th><th><a href="https://terraria.wiki.gg/wiki/Crafting_stations">Crafting Station</a></th></tr></thead>', tag: "table", func: processRecipeBlock}
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
			
			
			//console.log('before aNPANR'+item);
			//item = item.replaceAll(allNonPropertiesAreNameless, ',"items":[$1]');
			//history[time++] = item;
			
			//console.log('after aNPANR'+item);
			
			//result += item;
			try{
				var sections = JSON.parse('['+item+']');
				if(blockRegexes[cycle].first) result += blockRegexes[cycle].first;
				for(var i = 0; i < sections.length; i++){
					result += blockRegexes[cycle].func(sections[i]);
				}
			}catch(e){
				console.error(history);
				console.error(e+"\nwhile parsing");
				console.error('['+item+']');
				console.error("on cycle "+cycle);
				if(throwErrors) throw {sourceError:e, data:'['+item+']', cycle:cycle};
			}
			result += "</"+blockRegexes[cycle].tag+">";
			content.innerHTML = content.innerHTML.replace(currentMatch[0], result);
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

{
	parseAFML();

	var content = document.getElementById("content");
	content.innerHTML = '<div id="toolbar">'+
	'<input id="searchbar" placeholder="Search Origins wiki">'+
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="searchSymbol" onclick="search()">'+
    '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>'+
    '</svg>'+
	'<div id="searchlinks"></div>'+
	'</div>'+content.innerHTML;
	var searchbar = document.getElementById("searchbar");
	var searchlinks = document.getElementById("searchlinks");
	searchbar.oninput = (e)=>{
		searchlinks.innerHTML = searchbar.value ? getSearchLinks(searchbar.value) : '';
	};
}