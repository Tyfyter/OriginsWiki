async function postParseCallback(){
    getPageText('linkWeb.json').then(async (data) => {
		data = JSON.parse(data);
		let siteMap = await getSiteMap();
		var content = document.getElementById("connections");
		for (let i = 0; i < siteMap.length; i++) {
			let page = siteMap[i];
			if (page === 'index') continue;
			if (page === '404') continue;
			if (page === 'searchPage') continue;
			if (page === 'Category') continue;
			if (page.endsWith('.htm')) continue;
			if (page.startsWith('§')) continue;
			if(!data.hasOwnProperty(page)){
				content.createChild('div').createChild('a-link', page.replaceAll('_', ' '));
			}
		}
    });
}