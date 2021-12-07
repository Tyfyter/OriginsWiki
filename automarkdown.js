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
		for(var i = 0; i < re.length; i++){
			if(re[i].match(regexQuery)){
				results.push(re[i]);
			}
		}
	}, filter, true);
	return "<div>"+results.map(function(v){
		return "<a href="+v+">"+v.replace(/\.[^.]+/g, "").replace(regexQuery, "<b>\$1</b>")+"</a>";
	}).join("<br>")+"</div>"
}

//requestAndProcessPageList(appendAllToContent);

// do things after the DOM loads fully
window.addEventListener("load", function () {
	document.getElementById("content").innerHTML += getSearchLinks("pa");
});