using System;using System.Collections.Generic;using System.IO;using System.Linq;
using System.Text;using System.Xml.Linq;using Newtonsoft.Json;using Newtonsoft.Json.Bson;using Newtonsoft.Json.Linq;
using InputCategory = System.Collections.Generic.Dictionary<string, CategoryGenerator.CategoryCast>;using OutputCategory = System.Collections.Generic.Dictionary<string, CategoryGenerator.CategoryObject>;namespace CategoryGenerator {	class Program {
		static void Main(string[] args) {			if (Directory.Exists(args[0])) {				InputCategory catsToGen = JsonConvert.DeserializeObject<InputCategory>(File.ReadAllText(args[1]));				(string name, JObject data)[] stats = Directory.GetFiles(args[0]).Select(f => (Path.GetFileNameWithoutExtension(f), JObject.Parse(File.ReadAllText(f)))).ToArray();				JObject categories = new();				foreach (var cat in catsToGen) {
					JObject newCat = new() {
						["name"] = cat.Value.name
					};
					if (cat.Value.page is not null) newCat.Add("page", cat.Value.page);
					Filter hiddenFilter = new HiddenFilter();
					if (cat.Value.name != "Hidden") hiddenFilter = new NotFilter(hiddenFilter);
					if (cat.Value.items is not null) {
						Filter filter = CreateFilter(cat.Value.items);
						newCat.Add("items", new JArray(stats
							.Where(s => filter.Matches(s.data))
							.Where(s => hiddenFilter.Matches(s.data))
							.Select(s => s.name)
						));
					} else {
						newCat.Add("items", new JArray(stats
							.Where(s => hiddenFilter.Matches(s.data))
							.Select(s => s.name)
						));
					}
					categories.Add(cat.Key, newCat);
				}				File.WriteAllText(args[2], JsonConvert.SerializeObject(categories, Formatting.Indented, new JsonSerializerSettings() {					DefaultValueHandling = DefaultValueHandling.Ignore,					NullValueHandling = NullValueHandling.Ignore				}));			}		}
		//example filter: a=bees b.c.d<ham,cheese (c=seven | c=7)
		//matches the following example objects:
		//{
		//	"a": "bees",
		//	"b": {
		//		"c": {
		//			"d": [
		//				"ham",
		//				"cheese"
		//			]
		//		} 
		//	},
		//	"c": "seven"
		//}
		//{
		//	"a": "bees",
		//	"b": {
		//		"c": {
		//			"d": [
		//				"ham",
		//				"cheese"
		//			]
		//		} 
		//	},
		//	"c": 7
		//}
		public static Filter CreateFilter(string text) {
			return CreateFilter(text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
		}
		public static Filter CreateFilter(string[] tags) {
			bool isOr = false;
			Filter currentFilter = null;
			for (int i = 0; i < tags.Length; i++) {
				string tag = tags[i];
				bool isNot = false;
				Filter newFilter = null;
				reparse:
				if (tag == "") continue;
				switch (tag[0]) {
					case '|':
					isOr = true;
					tag = tag[1..];
					goto reparse;
					case '&':
					tag = tag[1..];
					goto reparse;

					case '-':
					isNot ^= true;
					tag = tag[1..];
					goto reparse;

					case '(':
					int oldI = i;
					for (i++; i < tags.Length; i++) {
						if (tags[i][^1] == ')') {
							string[] test = new string[i - oldI + 1];
							for (int k = oldI + 1; k < i; k++) {
								test[k - oldI] = tags[k];
							}
							test[0] = tag[1..];
							test[^1] = tags[i][..^1];
							newFilter = CreateFilter(test);
							break;
						}
					}
					break;

					default:
					newFilter = ParseSingleFilter(tag);
					break;
				}
				if (newFilter is null) throw new Exception("you formatted something wrong and a null got in here");

				if (isNot) newFilter = new NotFilter(newFilter);
				if (currentFilter is null) {
					currentFilter = newFilter;
				} else {
					currentFilter = isOr ? new OrFilter(currentFilter, newFilter) : new AndFilter(currentFilter, newFilter);
				}
				isOr = false;
			}
			return currentFilter;
		}
		public static Filter ParseSingleFilter(string text) {
			string[] sections = text.Split('.');
			bool valid = false;
			Filter filter = null;
			string[] subsections = sections[^1].Split("<", 2);
			if (subsections.Length == 2) {
				valid = true;
				filter = new ChildMatchesFilter(subsections[0], new HasFilter(subsections[1].Split(',').Select(
					s => s[0] == '.' ? ParseSingleFilter(s[1..]) : new IsFilter(s)
				).ToArray()));
			} else {
				subsections = sections[^1].Split("=");
				if (subsections.Length == 2) {
					valid = true;
					filter = new ChildMatchesFilter(subsections[0], new IsFilter(subsections[1]));
				}
			}
			if (!valid) throw new Exception($"{text} is not a valid filter string, a valid filter string must end in exactly one \"is\" (__=__) or \"has\" (__<__,__) clause");
			for (int i = 2; i < sections.Length + 1; i++) {
				filter = new ChildMatchesFilter(sections[^i], filter);
			}
			return filter;		}	}	public abstract class Filter {
		public abstract bool Matches(JToken data);
	}	public class ChildMatchesFilter(string name, Filter filter) : Filter {
		public string Name => name;
		public Filter Filter => filter;
		public override bool Matches(JToken data) => data is JObject obj && obj.TryGetValue(name, out JToken child) && filter.Matches(child);
		public override string ToString() => $"{name}.{filter}";
	}	public class IsFilter(string value) : Filter {
		public string Value => value;
		public override bool Matches(JToken data) => data.ToString() == value;
		public override string ToString() => $"={value}";
	}	public class HasFilter(params Filter[] filters) : Filter {
		public Filter[] Filters => filters;
		public override bool Matches(JToken data) {
			bool ret;
			if (data is JArray array) {
				ret = !filters.Any(filter => !array.Any(filter.Matches));
				return ret;
			}
			if (filters.Any(f => f is not IsFilter)) throw new Exception($"I don't even know how I'd go about supporting \"has\" clauses like {this} on things other than arrays");
			string dataString = data.ToString();
			ret = !filters.Any(filter => !dataString.Contains(((IsFilter)filter).Value));
			return ret;
		}
		public override string ToString() => $"<{string.Join<Filter>(',', filters)}";
	}	public class NotFilter(Filter a) : Filter {
		public Filter A => a;
		public override bool Matches(JToken data) => !a.Matches(data);
		public override string ToString() => $"-{a}";
	}	public class AndFilter(Filter a, Filter b) : Filter {
		public Filter A => a;
		public Filter B => b;
		public override bool Matches(JToken data) => a.Matches(data) && b.Matches(data);
		public override string ToString() => $"{a} & {b}";
	}	public class OrFilter(Filter a, Filter b) : Filter {
		public Filter A => a;
		public Filter B => b;
		public override bool Matches(JToken data) => a.Matches(data) || b.Matches(data);
		public override string ToString() => $"{a} | {b}";
	}	public class HiddenFilter : Filter {
		public override bool Matches(JToken data) => data is JObject obj && obj.TryGetValue("Types", out JToken child) && child is JArray array && array.Any(v => v.ToString() == "Hidden");
		public override string ToString() => $"hidden";
	}	public class CategoryCast {
		public string name;
		public string page;
		public string items;
	}	public class CategoryObject {
		public string name;
		public string page;
		public string[] items;
	}}