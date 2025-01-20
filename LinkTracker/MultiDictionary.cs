using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinkTracker {
	internal class MultiDictionary<TKey, TValue> : IDictionary<TKey, List<TValue>> {
		Dictionary<TKey, List<TValue>> inner = [];
		public List<TValue> this[TKey key] { get => ((IDictionary<TKey, List<TValue>>)inner)[key]; set => ((IDictionary<TKey, List<TValue>>)inner)[key] = value; }
		public ICollection<TKey> Keys => ((IDictionary<TKey, List<TValue>>)inner).Keys;
		public ICollection<List<TValue>> Values => ((IDictionary<TKey, List<TValue>>)inner).Values;
		public int Count => ((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).Count;
		public bool IsReadOnly => ((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).IsReadOnly;
		public void Add(TKey key, List<TValue> value) {
			((IDictionary<TKey, List<TValue>>)inner).Add(key, value);
		}
		public void Add(KeyValuePair<TKey, List<TValue>> item) {
			((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).Add(item);
		}
		public void Clear() {
			((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).Clear();
		}
		public bool Contains(KeyValuePair<TKey, List<TValue>> item) {
			return ((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).Contains(item);
		}
		public bool ContainsKey(TKey key) {
			return ((IDictionary<TKey, List<TValue>>)inner).ContainsKey(key);
		}
		public void CopyTo(KeyValuePair<TKey, List<TValue>>[] array, int arrayIndex) {
			((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).CopyTo(array, arrayIndex);
		}
		public IEnumerator<KeyValuePair<TKey, List<TValue>>> GetEnumerator() {
			return ((IEnumerable<KeyValuePair<TKey, List<TValue>>>)inner).GetEnumerator();
		}
		public bool Remove(TKey key) {
			return ((IDictionary<TKey, List<TValue>>)inner).Remove(key);
		}
		public bool Remove(KeyValuePair<TKey, List<TValue>> item) {
			return ((ICollection<KeyValuePair<TKey, List<TValue>>>)inner).Remove(item);
		}
		public bool TryGetValue(TKey key, [MaybeNullWhen(false)] out List<TValue> value) {
			return ((IDictionary<TKey, List<TValue>>)inner).TryGetValue(key, out value);
		}
		IEnumerator IEnumerable.GetEnumerator() {
			return ((IEnumerable)inner).GetEnumerator();
		}
		public List<TValue> Get(TKey key) {
			if (!TryGetValue(key, out List<TValue>? value)) this[key] = (value ??= []);
			return value;
		}
	}
}
