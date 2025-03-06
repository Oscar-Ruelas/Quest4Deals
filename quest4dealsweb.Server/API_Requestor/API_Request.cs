namespace API_Requestor
{

    using System;
    using System.Collections.Generic;
    using System.Linq;

    public class APIRequest
    {
        private readonly string _baseUrl;
        private readonly Dictionary<string, string> _parameters;

        public APIRequest(string baseUrl)
        {
            _baseUrl = baseUrl ?? throw new ArgumentNullException(nameof(baseUrl));
            _parameters = new Dictionary<string, string>();
        }

        public void AddRequestParameter(string key, string value)
        {
            if (string.IsNullOrEmpty(key))
                throw new ArgumentException("Parameter key cannot be null or empty.", nameof(key));
            if (value == null)
                throw new ArgumentNullException(nameof(value), "Parameter value cannot be null.");

            _parameters[key] = value;
        }

        public string BuildUrl()
        {
            if (_parameters.Count == 0)
                return _baseUrl;

            var queryString = string.Join("&", _parameters.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            return $"{_baseUrl}?{queryString}";
        }
    }
}