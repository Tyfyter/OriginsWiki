using System;using System.Collections.Generic;using System.IO;using System.Linq;
using Newtonsoft.Json;using Newtonsoft.Json.Bson;using Newtonsoft.Json.Linq;
using InputCategory = System.Collections.Generic.Dictionary<string, CategoryGenerator.CategoryCast>;using OutputCategory = System.Collections.Generic.Dictionary<string, CategoryGenerator.CategoryObject>;namespace CategoryGenerator {	class Program {		static void Main(string[] args) {			if (Directory.Exists(args[0])) {				InputCategory catsToGen = JsonConvert.DeserializeObject<InputCategory>(File.ReadAllText(args[1]));				(string name, JObject data)[] stats = Directory.GetFiles(args[0]).Select(f => (Path.GetFileNameWithoutExtension(f), JObject.Parse(File.ReadAllText(f)))).ToArray();				JObject categories = new();				foreach (var cat in catsToGen) {
					JObject newCat = new() {
						["name"] = cat.Value.name
					};
					if (cat.Value.page is not null) newCat.Add("page", cat.Value.page);
					if (cat.Value.items is not null) {
						string[] filter = cat.Value.items.Split('<');
						if (filter.Length > 1) {
							string path = filter[0];
							filter = filter[1].Split('|');
							newCat.Add("items", new JArray(stats
								.Where(s => s.data.TryGetValue(path, out JToken value) && value.Any(t => filter.Contains(t.ToString()))
								).Select(s => s.name)
							));
						} else {
							filter = cat.Value.items.Split('=');
							string path = filter[0];
							filter = filter[1].Split('|');

							newCat.Add("items", new JArray(stats
								.Where(s => s.data.TryGetValue(path, out JToken value) && filter.Contains(value.ToString()))
								.Select(s => s.name)
							));
						}
					} else {
						newCat.Add("items", new JArray(stats.Select(s => s.name)));
					}
					categories.Add(cat.Key, newCat);
				}				File.WriteAllText(args[2], JsonConvert.SerializeObject(categories, Formatting.Indented, new JsonSerializerSettings() {					DefaultValueHandling = DefaultValueHandling.Ignore,					NullValueHandling = NullValueHandling.Ignore				}));			}		}	}	public class CategoryCast {
		public string name;
		public string page;
		public string items;
	}	public class CategoryObject {
		public string name;
		public string page;
		public string[] items;
	}}