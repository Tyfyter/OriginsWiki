using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace LinkTracker {
	public class HTMLDocument() : HTMLNode("document", "") {
		public override string ToString() {
			StringBuilder builder = new();
			for (int i = 0; i < Children.Count; i++) {
				builder.AppendLine(Children[i].ToString(0));
			}
			return builder.ToString();
		}
		public override string ToString(int depth) => ToString();
		public static HTMLDocument Parse(string text) {
			HTMLDocument document = new();
			int i = 0;
			document.Parse($"{text}</{document.NodeName}>", ref i);
			return document;
		}
	}
	public abstract class IHTMLNode {
		private HTMLNode? _parent;
		public HTMLNode? Parent {
			get => _parent;
			set {
				if (_parent != value) {
					_parent?.Children.Remove(this);
					_parent = value;
				}
			}
		}
		public abstract string NodeName { get;  }
		public abstract string ToString(int depth);
		public abstract bool ForcesMultiline { get; }
	}
	public class HTMLTextNode(string text) : IHTMLNode {
		public readonly string text = text;
		public override string ToString(int depth) => new string('\t', depth) + text;
		public override string ToString() => $"{NodeName} {text}";
		public override string NodeName => "#text";
		public override bool ForcesMultiline => false;
	}
	public class HTMLNode(string name, string attributes = "") : IHTMLNode {
		public override string NodeName => name;
		public readonly Dictionary<string, string?> attributes = ParseAttributes(attributes);
		public List<IHTMLNode> Children { get; } = [];
		static bool IsVoidTag(string tagName) {
			if (tagName.StartsWith('!')) return true;
			switch (tagName) {
				case "area" or "base" or "br" or "col" or "embed" or "hr" or "img":
				case "input" or "link" or "meta" or "param" or "source" or "track" or "wbr":
				return true;
			}
			return false;
		}
		static Dictionary<string, string?> ParseAttributes(string text) {
			StringBuilder currentText = new();
			Dictionary<string, string?> attributes = [];
			string PopString() {
				string attributeName = currentText.ToString();
				currentText.Clear();
				return attributeName;
			}
			for (int i = 0; i < text.Length; i++) {
				switch (text[i]) {
					case '=': {
						string attributeName = PopString();
						i++;
						char quote = '"';
						bool isQuoted = text[i] is '"' or '\'';
						if (isQuoted) {
							quote = text[i];
							i++;
						}
						for (; i < text.Length; i++) {
							if (isQuoted) {
								if (text[i] == quote) {
									i++;
									break;
								}
							} else {
								if (text[i] == ' ') break;
							}
							currentText.Append(text[i]);
						}
						if (string.IsNullOrEmpty(attributeName)) break;
						attributes.Add(attributeName, PopString());
						break;
					}
					case ' ':
					attributes.Add(PopString(), null);
					break;
					default:
					currentText.Append(text[i]);
					break;
				}
			}
			if (currentText.Length > 0) attributes.Add(PopString(), null);
			return attributes;
		}
		public override bool ForcesMultiline => NodeName is not ("a" or "b" or "br" or "a-coins" or "a-coin" or "a-stat") && (!attributes.TryGetValue("class", out string? classAttr) || !(classAttr?.Contains("divider") ?? false));
		public bool ChildrenCanBeElements => NodeName is not ("script");
		protected void Parse(string text, ref int i) {
			StringBuilder currentText = new();
			void FlushText() {
				string value = currentText.ToString();
				if (!string.IsNullOrWhiteSpace(value)) {
					AddChild(new HTMLTextNode(value));
				}
				currentText.Clear();
			}
			for (; i < text.Length; i++) {
				switch (text[i]) {
					case '<': {
						bool close = false;
						FlushText();
						i++;
						if (text[i] == '/') {
							close = true;
							i++;
						}
						bool isComment = false;
						while (text[i] != ' ' && text[i] != '>') {
							currentText.Append(text[i++]);
							if (currentText.ToString() == "<--") {
								isComment = true;
								break;
							}
						}
						if (isComment) {
							while (text[i..(i + 2)] != "-->") currentText.Append(text[i++]);
							currentText.Append("--");
							i += 2;
						}
						string tagName = currentText.ToString();
						currentText.Clear();
						if (close) {
							if (tagName != this.NodeName) throw new FormatException($"attempted to close <{this.NodeName}> with </{tagName}> at index {i}");
							return;
						}
						if (!isComment) {
							while (text[i] != '>') currentText.Append(text[i++]);
							if (!IsVoidTag(tagName)) { // this fixes issues with <br> tags next to other tags
								i++;
							}
						}
						string attributes = currentText.ToString();
						currentText.Clear();
						HTMLNode child = new(tagName, attributes);
						if (!IsVoidTag(tagName)) {
							child.Parse(text, ref i);
						}
						AddChild(child);
					}
					break;
					default:
					currentText.Append(text[i]);
					break;
				}
			}
			FlushText();
		}
		public void AddChild(IHTMLNode child) {
			child.Parent = this;
			Children.Add(child);
		}
		public void ReplaceChild(IHTMLNode oldChild, params IHTMLNode[] newChildren) {
			if (oldChild.Parent != this) throw new ArgumentException("old child must be a child of this node", nameof(oldChild));
			int index = Children.IndexOf(oldChild);
			Children.RemoveAt(index);
			for (int i = 0; i < newChildren.Length; i++) {
				newChildren[i].Parent = this;
				Children.Insert(index++, newChildren[i]);
			}
		}
		Regex consecutiveLinebreakRegex = new("$[\\n\\r]+");
		public override string ToString(int depth) {
			StringBuilder builder = new();
			string indent = new('\t', depth);
			string attr = "";
			if (attributes.Count != 0) {
				foreach (KeyValuePair<string, string?> item in attributes) {
					if (string.IsNullOrWhiteSpace(item.Key)) continue;
					if (item.Value is null) {
						builder.Append($" {item.Key}");
					} else {
						builder.Append($" {item.Key}=\"{item.Value.Replace("\\", "\\\\").Replace("\"", "\\\"")}\"");
					}
				}
				attr = builder.ToString();
				builder.Clear();
			}
			if (!IsVoidTag(NodeName)) {
				bool mustMultiline = Children.Any(n => n.ForcesMultiline);
				bool multilineAnyway = false;
				for (int i = 0; i < Children.Count; i++) {
					string text = "\n" + Children[i].ToString(depth + 1);
					if (!mustMultiline) {
						text = consecutiveLinebreakRegex.Replace(text.Trim('\n', '\r', '\t'), "\n");
						if (text.Contains('\n')) multilineAnyway = true;
					}
					builder.Append(text);
				}
				if (mustMultiline || multilineAnyway) {
					builder.AppendLine();
					builder.Append($"{indent}</{NodeName}>");
					if (!mustMultiline) builder.Insert(0, $"\n{indent}\t");
				} else {
					builder.Append($"</{NodeName}>");
				}
			}
			builder.Insert(0, $"{indent}<{NodeName}{attr}>");
			return builder.ToString();
		}
		public override string ToString() {
			string attr = "";
			if (attributes.Count != 0) {
				StringBuilder builder = new();
				foreach (KeyValuePair<string, string?> item in attributes) {
					if (string.IsNullOrWhiteSpace(item.Key)) continue;
					if (item.Value is null) {
						builder.Append($" {item.Key}");
					} else {
						builder.Append($" {item.Key}=\"{item.Value.Replace("\\", "\\\\").Replace("\"", "\\\"")}\"");
					}
				}
				attr = builder.ToString();
			}
			return $"<{NodeName}{attr}>";
		}
		public HTMLNode? GetElementByID(string id) {
			foreach (IHTMLNode child in Children) {
				if (child is HTMLNode childNode) {
					if (childNode.attributes.TryGetValue("id", out string? value) && value == id) return childNode;
					if (childNode.GetElementByID(id) is HTMLNode descendant) return descendant;
				}
			}
			return null;
		}
		public IEnumerable<IHTMLNode> GetElementsByFilter(Predicate<IHTMLNode> filter) {
			foreach (IHTMLNode child in Children) {
				if (filter(child)) yield return child;
				if (child is HTMLNode childNode) {
					foreach (IHTMLNode next in childNode.GetElementsByFilter(filter)) yield return next;
				}
			}
		}
		public string TextContent {
			get => string.Join("", GetElementsByFilter(HTMLFilter.ByName("#text")).Select(el => ((HTMLTextNode)el).text));
			set {
				Children.Clear();
				AddChild(new HTMLTextNode(value));
			}
		}
	}
	public static class HTMLFilter {
		public static Predicate<IHTMLNode> ByName(string name) => node => node.NodeName.Equals(name, StringComparison.InvariantCultureIgnoreCase);
		public static Predicate<IHTMLNode> And(this Predicate<IHTMLNode> a, Predicate<IHTMLNode> b) => node => a(node) && b(node);
		public static Predicate<IHTMLNode> Or(this Predicate<IHTMLNode> a, Predicate<IHTMLNode> b) => node => a(node) || b(node);
	}
}
