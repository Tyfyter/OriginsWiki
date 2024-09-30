class AFMLImg extends HTMLElement {
	static observedAttributes = ["src", "alt"];
	child;
	constructor() {
		// Always call super first in constructor
		super();
		//this.textContent = "";
		this.classList.add('picturebox');
		this.child ??= document.createElement('img');
		this.child.setAttribute('style', 'width: inherit;');
		this.appendChild(this.child);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'src':
			this.child.setAttribute('src', newValue);
			break;
			case 'alt':
			if (this.attributes['alt']) this.child.setAttribute('alt', newValue);
			else this.child.removeAttribute('alt');
			break;
		}
		//console.log(name, oldValue, newValue);
	}
}
customElements.define("a-img", AFMLImg);

let headRequests = {};
function requestHead(url) {
	return headRequests[url] ??= fetch(url, {method: "HEAD"});
}
class AFMLLink extends HTMLAnchorElement { // can be created with document.createElement('a', {is: 'a-link' })
	static observedAttributes = ["href"];
	constructor() {
		// Always call super first in constructor
		super();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (name !== 'href') return;
		requestHead(newValue).then((v) => {
			if (v.status == 404) this.classList.add('redlink');
			else this.classList.remove('redlink');
		});
	}
}
customElements.define("a-link", AFMLLink, { extends: "a" });

let pageRequests = {};
let pageRequestLock = {};
async function getPageText(url) {
	if (pageRequests[url] === undefined) {
		pageRequests[url] ??= fetch(url);
	}
	if (pageRequests[url] instanceof Promise) {
		while(pageRequestLock[url]);
		pageRequestLock[url] = true;
		try {
			pageRequests[url] = await (await pageRequests[url]).text();
		} finally {
			pageRequestLock[url] = false;
		}
	}
	return pageRequests[url];
}

class AFMLSnippet extends HTMLElement { // can be created with document.createElement('a', {is: 'a-link' })
	static observedAttributes = ["href", "pluck"];
	button;
	content;
	constructor() {
		// Always call super first in constructor
		super();
		let text = this.textContent;
		this.textContent = "";
		this.button = document.createElement('a');
		this.button.classList.add('snippetButton');
		this.button.textContent = text;
		this.appendChild(this.button);

		this.content = document.createElement('span');
		this.content.classList.add('snippetContent');
		this.appendChild(this.content);
		if (!this.hasAttribute('href')) {
			this.setAttribute('open', '');
			this.content.textContent = "snippet is missing href attribute";
			return;
		}
		if (this.hasAttribute('hidden')) {
			this.setAttribute('open', '');
		}
		this.button.href = 'javascript:void(0)';
		this.button.onclick = () => {
			if (this.hasAttribute('open')) {
				this.removeAttribute('open');
			} else {
				this.setAttribute('open', '');
			}
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		let contentID = 'snippetContent' + this.getAttribute('href') + this.getAttribute('pluck');
		if (this.content.id === contentID) return;
		this.content.id = contentID;
		getPageText(this.getAttribute('href')).then(async (v) => {
			this.content.innerHTML = v;
			let pluckSelector = this.getAttribute('pluck');
			//console.debug('pluck: ', pluckSelector, ' from ', content.children);
			if (pluckSelector) {
				let children = this.content.querySelectorAll(pluckSelector);
				this.content.innerHTML = "";
				for (var i = 0; i < children.length; i++) {
					this.content.appendChild(children[i]);
				}
			}
			await parseAFML(false, this.content.id);
		});
	}
}
customElements.define("a-snippet", AFMLSnippet);