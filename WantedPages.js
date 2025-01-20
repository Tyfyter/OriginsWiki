async function postParseCallback(){
    getPageText('linkWeb.json').then(async (data) => {
		data = JSON.parse(data);
		let siteMap = await getSiteMap();
		var content = document.getElementById("connections");
		for(let key in data){
			if(data.hasOwnProperty(key) && !siteMap.includes(key) && !siteMap.includes(key + '.htm')){
				content.createChild('div').createChild('a-link', key.replaceAll('_', ' '));
			}
		}
    });
}