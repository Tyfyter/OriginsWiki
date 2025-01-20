using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinkTracker {
	internal class CacheDictionary<TKey, TValue>(CacheDictionary<TKey, TValue>.Generator generator) : IReadOnlyDictionary<TKey, TValue> where TKey : notnull {
		readonly Dictionary<TKey, TValue> cache = [];
		readonly HashSet<TKey> loadedKeys = [];
		public TValue this[TKey key] {
			get {
				Load(key);
				return cache[key];
			}
		}
		public void Load(TKey key) {
			if (loadedKeys.Contains(key)) return;
			loadedKeys.Add(key);
			if (generator(key, out TValue? value)) {
				cache[key] = value;
			}
		}
		IEnumerable<TKey> IReadOnlyDictionary<TKey, TValue>.Keys => throw new NotSupportedException();
		IEnumerable<TValue> IReadOnlyDictionary<TKey, TValue>.Values => throw new NotSupportedException();
		public int Count => throw new NotSupportedException();
		public void Clear() => cache.Clear();
		public bool Contains(KeyValuePair<TKey, TValue> item) {
			Load(item.Key);
			return cache.Contains(item);
		}
		public bool ContainsKey(TKey key) {
			Load(key);
			return cache.ContainsKey(key);
		}
		public IEnumerator<KeyValuePair<TKey, TValue>> GetEnumerator() => throw new NotSupportedException();
		public bool TryGetValue(TKey key, [MaybeNullWhen(false)] out TValue value) {
			Load(key);
			return cache.TryGetValue(key, out value);
		}
		IEnumerator IEnumerable.GetEnumerator() => throw new NotSupportedException();
		public delegate bool Generator(TKey key, [MaybeNullWhen(false)] out TValue value);
	}
}
