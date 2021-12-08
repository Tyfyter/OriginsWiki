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

// do things after the DOM loads fully
window.addEventListener("load", function () {
	var content = document.getElementById("content");
	content.innerHTML += getSearchLinks("pa");//example code
	var toc = document.getElementById("table-of-contents");
	if(toc){
		toc.innerHTML = "<div style = \"border: 1px solid grey; padding: 10px;\">Contents</div>"
		var contents = "<div style = \"border: 1px solid grey; margin: 0px; padding: 0.2em;\">"
		forDescendants(content, (v, i) => {
			contents += "<div style=\"margin-left: "+0.2*i.length+"em\"><a href=#"+v.id+">"+i+" "+getSummaryOrId(v)+"</a></div>"
		}, (v) => v.className == "section", (pIndex, indexNumber) => (pIndex?pIndex+".":"")+(indexNumber+1), "");
		toc.innerHTML += contents+"</div>"
	}
});