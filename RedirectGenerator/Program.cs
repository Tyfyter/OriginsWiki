using Newtonsoft.Json.Linq;
using static System.Runtime.InteropServices.JavaScript.JSType;

const string format =
"""
<!DOCTYPE html>
<html>
	<head>
	<meta http-equiv="refresh" content="0; url='./{0}.html'" />
	</head>
	<body>
	<a href="{0}.html">Click here if you aren't redirected automatically</a>
	</body>
</html>
""";
void Write(string from, string to) {
	string path = Path.Combine(args[0], from + ".html");
	string text = string.Format(format, to);
	if (!File.Exists(path) || File.ReadAllText(path) != text) {
		File.WriteAllText(path, text);
	}
}
if (Directory.Exists(args[0])) {
	JObject redirects = JObject.Parse(File.ReadAllText(Path.Combine(args[0], "redirects.json")));
	foreach (KeyValuePair<string, JToken?> redirect in redirects) {
		if (redirect.Value is not null) Write(redirect.Key, redirect.Value.ToString());
	}
	return 0;
} else {
	Console.ForegroundColor = ConsoleColor.Red;
	Console.Error.WriteLine($"Could not find path {args[0]}");
	return 1;
}