//window.alert("test");

function getResponse() {
	// `this` will refer to the `XMLHTTPRequest` object that executes this function
	var responseObj = JSON.parse(this.responseText);
	var text = "";
	for(var i = 0; i < responseObj.tree.length; i++){
		var addition = responseObj.tree[i].path.replace(/\.[^.]+/g, "");
		if(addition){
			text+=addition+"<br>";
		}
	}
	document.getElementById("content").innerHTML += "<div>"+text+"</div>";
}

var request = new XMLHttpRequest();
request.onload = getResponse;
request.open('get', 'https://api.github.com/repos/Tyfyter/OriginsWiki/git/trees/main', true);
//request.open('get', 'https://api.github.com/repos/Tyfyter/OriginsWiki/commits/main', true);
//request.open('get', 'https://api.github.com/users/Tyfyter/repos/OriginsWiki', true);
request.send();

