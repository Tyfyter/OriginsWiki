//window.alert("test");

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

function getSearchLinks(query, filter){
	if(!filter){
		filter = ".html";
	}
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
	return "<div>"+results.map(function(v){
		return "<a href="+v+">"+v.replace(/\.[^.]+/g, "").replace(regexQuery, "<b>\$1</b>")+"</a>";
	}).join("<br>")+"</div>"
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
		return summary.innerHTML;
	}
	return element.id;
}

function processLink(targetName, image, targetPage){
	if(image){
		targetName = '<img src='+image+' class="linkimage">' + targetName;
	}
	if(targetPage !== undefined){
		targetPage = (targetName.replace(' ', '_')+".html");
	}else if(!targetPage){
		return targetName;
	}
	return '<a href='+targetPage+'>'+targetName+'</a>';
}

function tryParseEgg(egg){
	try{
		let eggVal = '{'+egg.replace(/[{}]/g, '')
		.replace(/(?<="header":)['"]?(\w*)['"]?,/g, '"$1",items:[')
		.replace(/,([^{])/g, ',"$1')
		.replace(/([^}"]),/g, '$1",')+']}';
		console.log("try object:"+eggVal);

		return [0, JSON.parse(eggVal)];
	}catch{}
	try{
		let eggVal = '["'+egg.replace(/[{}]/g, '')
		.replace(/([^"])([\|}])/g, '$1"$2')
		.replace(/([\|{])([^"])/g, '$1"$2');
		console.log("try array:"+eggVal)+'"]';

		return [1, JSON.parse(eggVal)];
	}catch{}
	return [-1, null];
}

function makeHeader(text){
	return '<div class="header"><span class="padding" style="padding-left: 7.5px;"></span><span class="text">'+text+'</span><span class="padding" style="flex-grow: 1;"></span></div>';
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
		var style = "";
		if(data.style){
			style = data.style;
		}

		for(var i = 0; i < data.items.length; i++){
			if(typeof data.items[i] === 'string' || data.items[i] instanceof String){
				result += '<span>'+processLink(data.items[i])+'</span>';
			}else if(data.items[i] instanceof Array){
				result += '<span>'+processLink(...data.items[i])+'</span>';
			}else{
				result += '<div class="subcontents '+style+'">';
				result += processBiomeContents(data.items[i], depth + 1);
				result += '</div>';
			}
		}
	}
	return result;
}

// do things after the DOM loads fully
window.addEventListener("load", function () {
	var content = document.getElementById("content");
	//content.innerHTML += getSearchLinks("pa");//example code
	var toc = document.getElementById("table-of-contents");
	if(toc){
		toc.innerHTML = "<div style = \"border: 1px solid grey; padding: 10px;\">Contents</div>"
		var contents = "<div style = \"border: 1px solid grey; margin: 0px; padding: 0.2em;\">"
		forDescendants(content, (v, i) => {
			contents += "<div style=\"margin-left: "+0.2*i.length+"em\"><a href=#"+v.id+">"+i+" "+getSummaryOrId(v)+"</a></div>"
		}, (v) => v.className == "section", (pIndex, indexNumber) => (pIndex?pIndex+".":"")+(indexNumber+1), "");
		toc.innerHTML += contents+"</div>"
	}
	let subsIndex = 0;
	let substitutions = [];

	const linkRegex = /\[link[^]]*]/gi;
	const biomeContentRegex = /\{biomecontent([^\}]*)}/gi;
	const uneggedCurlyBracketRegex = /{([^{]*?)}/;
	const commaInserterRegex = /(?<=[^[{\s])\s*\n\s*(?=[^\]}\s])/g;
	//allHeaderHaversAreObjectsRegex: /\[("header":"[^((?<!\)")]*",)([^\[\]]*(?=]))\]/g;
	const allPropertyHaversAreObjectsRegex = /\[(("style":"[^((?<!\)")]*",|"header":"[^((?<!\)")]*",)+)([^\[\]]*(?=]))\]/g;
	const getItemsRegex = /(?<={)("header":".*?","items":)(\[.*?\])(?=})/g;
	const htmlTagRegex = /<(?<tag>[^\/ ]+?)(.*?)>.*?<\/\k<tag>>/;

	for (let item of content.innerHTML.matchAll(linkRegex)) {
		let current = group[0].split('|');
		let result = processLink(current[0], current[1], current[2]);
		content.innerHTML = content.innerHTML.replace(item[0], result);
	}

	console.log("items:");
	let currentMatch = biomeContentRegex.exec(content.innerHTML);
	while(currentMatch !== null){
		console.log("an item");
		let result = "<div class=\"biomecontents\">";
		let item = currentMatch[1];
		
		let currentTag = htmlTagRegex.exec(item);
		while(currentTag !== null){
			item = item.replace(currentTag[0], "§"+subsIndex+"§");
			substitutions[subsIndex++] = currentTag[0];
			currentTag = htmlTagRegex.exec(item);
		}

		item = item.replaceAll(commaInserterRegex, ',');
		item = item.replace(/\s/g, '');
		item = item.replaceAll(/['"]?header['"]?/g, '"header"');
		item = item.replaceAll(/(?<="header":)([^,"']+)/g, '"$1"');
		item = item.replaceAll(allPropertyHaversAreObjectsRegex, '{$1"items":[$3]}');
		item = item.replaceAll(/\]\[/g, "],[");
		item = item.replaceAll(/(?<=((?<!https):)|[{[,])(?!['"[{])/g, '"');
		item = item.replaceAll(/(?<!['"\]}])(?=((?<!https):)|[,\]}])/g, '"');
		item = [...item];//spread string into chars
		//var repr = [];
		var depth = 0;
		for(var i = 0; i < item.length; i++){
			if(item[i] === ']'){
				//repr[i] = '<span style="color:blue">'+depth+'</span>';
				if(depth === 1){
					item[i] = '}';
				}
				depth--;
			}else if(item[i] === '['){
				//repr[i] = '<span style="color:red">'+depth+'</span>';
				if(depth === 0){
					item[i] = '{';
				}
				depth++;
			} else {
				//repr[i] = depth;
			}
		}
		item = item.join('');//reassemble string//+'<br>'+repr.join('');
		result += processBiomeContents(JSON.parse(item));
		result += "</div>";
		content.innerHTML = content.innerHTML.replace(currentMatch[0], result);
		currentMatch = biomeContentRegex.exec(content.innerHTML);
	}
	console.log(subsIndex+" substitutions:");
	for(var i = 0; i < substitutions.length; i++){
		console.log(substitutions[i]);
		content.innerHTML = content.innerHTML.replaceAll("§"+i+"§", substitutions[i])
	}
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
});