async function postParseCallback(){
    if(!location.search || location.search == '?searchPage'){
        return;
    }
    var search = location.search.substring(1).replaceAll(', ', '_').replaceAll('+', '_');
    document.getElementById("header").innerText += ', ' + search;

    var siteMap = await getSiteMap();

    const lowerSearch = search.toLowerCase();
    for (var i = 0; i < siteMap.length; i++) {
        if(siteMap[i].toLowerCase() == lowerSearch){
            window.open(siteMap[i] + linkSuffix, '_self');
            return;
        }
    }
    var content = document.getElementById("searchResults");
    content.innerHTML = await getSearchLinks(search) + content.innerHTML;
}