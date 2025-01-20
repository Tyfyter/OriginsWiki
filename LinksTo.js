async function postParseCallback(){
    if(!location.search) return;
    document.getElementById("header").innerText += ' ' + location.search.substring(1);

    getPageText('linkWeb.json').then((data) => {
		data = JSON.parse(data)[location.search.substring(1)];
        var content = document.getElementById("connections");
		for (let i = 0; i < data.length; i++) {
			content.createChild('div').createChild('a-link', data[i].replaceAll('_', ' '));
		}
    });
}