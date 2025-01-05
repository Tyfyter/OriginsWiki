using LinkTracker;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Diagnostics.CodeAnalysis;
MultiDictionary<string, string> allLinks = [];
List<List<string>> needscapMatching = [];
Dictionary<string, string> pages = new(StringComparer.InvariantCultureIgnoreCase);
bool errored = false;
Console.ForegroundColor = ConsoleColor.Red;
if (Directory.Exists(args[0])) {
	JObject aliases = JObject.Parse(File.ReadAllText(Path.Combine(args[0], "aliases.json")));
	CacheDictionary<string, JObject> statCache = new((string key, [MaybeNullWhen(false)] out JObject value) => {
		string path = Path.Combine(args[0], "stats", $"{key}.json");
		if (!File.Exists(path)) {
			value = null;
			return false;
		}
		value = JObject.Parse(File.ReadAllText(path));
		return true;
	});
	foreach (string fileName in Directory.EnumerateFiles(args[0], "*.html", SearchOption.TopDirectoryOnly)) {
		pages.Add(Path.GetFileNameWithoutExtension(fileName), Path.GetFileNameWithoutExtension(fileName));
	}
	foreach (string fileName in Directory.EnumerateFiles(args[0], "*.html", SearchOption.TopDirectoryOnly)) {
		HTMLDocument? document = default;
		try {
			document = HTMLDocument.Parse(File.ReadAllText(fileName));
		} catch (Exception e) {
			Console.Error.Write($"Encountered issue while parsing {Path.GetFileName(fileName)}:");
			Console.Error.WriteLine($"{e.Message}//\n{e.StackTrace}");
			Console.Error.WriteLine();
			errored = true;
			continue;
		}
		string thisFile = Path.GetFileNameWithoutExtension(fileName);
		foreach (IHTMLNode _node in document.GetElementsByFilter(HTMLFilter.ByName("a").Or(HTMLFilter.ByName("a")))) {
			if (_node is not HTMLNode node) continue;
			switch (node.NodeName) {
				case "a": {
					if (node.attributes.TryGetValue("href", out string? target) && target is not null) {
						target = target.Replace(".html", "");
						if (!target.StartsWith("https://")) {
							target = target.Split("#")[0];
							List<string> links = allLinks.Get(target);
							if (!links.Contains(thisFile)) links.Add(thisFile);
						}
					} else {
						target = node.TextContent.Replace(" ", "_");
						if (aliases.TryGetValue(target, out JToken? redirect)) target = redirect.ToString();
						target = target.Replace(".html", "");
						target = target.Split("#")[0];
						if (pages.TryGetValue(target, out string? page)) target = page;
						List<string> links = allLinks.Get(target);
						if (!links.Contains(thisFile)) links.Add(thisFile);
					}
				}
				break;
				case "a-snippet": {
					if (node.attributes.TryGetValue("src", out string? target) && target is not null) {
						target = target.Replace(".html", "");
						if (!target.StartsWith("https://")) {
							target = target.Split("#")[0];
							List<string> links = allLinks.Get(target);
							if (!links.Contains(thisFile)) links.Add(thisFile);
						}
					}
				}
				break;
				/*case "a-statblock": {
					if (node.attributes.TryGetValue("src", out string? target) && target is not null) {
						if (statCache.TryGetValue(target, out JObject? stats)) {
							foreach (JToken item in stats.Values()) {
								if (item is JValue jValue && jValue.Type == JTokenType.String) {
									target = target.Replace(".html", "");
									if (!target.StartsWith("https://")) {
										target = target.Split("#")[0];
										List<string> links = allLinks.Get(target);
										if (!links.Contains(thisFile)) links.Add(thisFile);
									}
								}
							}
						}
					}
				}
				break;*/
			}
		}
	}
} else {
	errored = true;
	Console.Error.WriteLine($"Could not find path {args[0]}");
}
if (!errored) {
	JObject web = [];
	foreach (KeyValuePair<string, List<string>> set in allLinks) {
		JArray links = [];
		for (int i = 0; i < set.Value.Count; i++) links.Add(set.Value[i]);
		web.Add(set.Key, links);
	}
	File.WriteAllText(Path.Combine(args[0], "linkWeb.json"), JsonConvert.SerializeObject(web, Formatting.None, new JsonSerializerSettings() {
		DefaultValueHandling = DefaultValueHandling.Ignore,
		NullValueHandling = NullValueHandling.Ignore
	}));
	Console.ForegroundColor = ConsoleColor.Green;
	Console.WriteLine($"Created {Path.Combine(args[0], "linkWeb.json")} successfully");
}
Console.ReadKey();