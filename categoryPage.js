var catNames = window.location.search.substring(1).split('&');
function preParseCallback(){
    if(catNames.length <= 0 || !catNames[0]){
        var firstHeader = document.getElementsByTagName("h1");
        firstHeader[0].innerText = 'Categories';
        postParseCallback = async ()=>{
            var content = document.getElementById('content');
            var categories = await getCategories();
            
            var catContents = '';
            for(var key in categories){
                console.log('cat: '+key);
                var cat = categories[key];
                if (cat.hidden || (cat.dev && !getSiteSettings().devMode)) continue;
                console.log(cat.page || key);
                var count = cat.items.length;
                var catCount = 0;
                for(var i = 0; i < count; i++){
                    if(cat.items[i].startsWith('cat:')){
                        catCount++;
                    }
                }
                catContents += `<div class="catitem"><a href="${(cat.page + (cat.page && linkSuffix)) || '?'+key}">${(cat.name||key).replaceAll('_', ', ')}</a> (${(catCount < count || catCount === 0) ? `${count - catCount} pages${catCount > 0?', ':''}` : ''}${catCount ? ` ${catCount} categories` : ''})</div>`;
            }
            content.innerHTML += catContents;
        };
        return;
    }
    var firstHeader = document.getElementsByTagName("h1");
    firstHeader[0].innerText = 'Category: ';//+window.location.search.substring(1)
}
async function postParseCallback(){
    var firstHeader = document.getElementsByTagName("h1");
    var content = document.getElementById('content');
    var siteMap = getSiteMap();
    var categories = await getCategories();
    var allCats = [];
    var headerText = "";
    for (let catNum = 0; catNum < catNames.length; catNum++) {
        var category = categories[catNames[catNum]];
        var siteMap = await siteMap;
        for (var i = 0; i < category.items.length; i++) {
            if(category.items[i].slice(0, 4) === 'cat:'){
                try{
                    category.items.push(...categories[category.items[i].slice(4)].items);
                }catch(error){
                    console.error(error);
                }
                //category.items.splice(i,1);
            }
        }
        allCats.push(category);
        if(catNum > 0){
            headerText += " & ";
        }
        headerText += category.name;
    }
    firstHeader[0].innerText += headerText;
    var catContents = '';
    console.log(category.items);
    for (var i = 0; i < siteMap.length; i++) {
        if(allCats.every(category => category.items.includes(siteMap[i]) ^ category.blacklist)){
            catContents += `<div class="catitem"><a href="${siteMap[i]+linkSuffix}">${siteMap[i].replaceAll('_', ' ')}</a></div>`;
        }
    }
    content.innerHTML += catContents;
};