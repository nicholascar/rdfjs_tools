//* This function takes a normal URL and encodes it for placing within a Query string.
function rdfproxy_query_encode(str) {
  str = (str + '').toString();

  // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
  // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%20/g, '+');
}

define(['rdfstore'], function(rdfstore)
    {
        var rdfproxyClass = function() {
            this._proxyuri = null;
            this.set_proxy = function(proxyuri) {
                this._proxyuri = proxyuri;
            };
        };
        var rdfproxy = new rdfproxyClass();
        var oldload = RDFLoader.prototype.load;
        var newload = function (uri, graph, callback) {
            var that = this;
            //The the requested url, encode it, and append it to the proxy address
            if (typeof rdfproxy._proxyuri !== 'undefined' && rdfproxy._proxyuri !== null)
            {
                var urlencoded = rdfproxy_query_encode(uri);
                uri = rdfproxy._proxyuri + "?uri=" + urlencoded;
            }
            //Then pass that into the original loader
            return oldload.call(that,uri, graph, callback);
        };
        //Override the original RDFLoader load func with this one.
        RDFLoader.prototype.load = newload;
        return rdfproxy;
    }
);