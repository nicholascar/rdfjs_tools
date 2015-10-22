// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
var cache = {};
var isset = function( item ) {
    return (!(typeof (item) == "undefined" || item === null));
};
var maybe = function( item ) {
    if (isset(item)) { return ""+item;}
    return "";
};
var after;
var tmpl = function (str, data, fn_only){

    after = null;
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var t= str.replace(/[\r\t\n]/g, " ")
       .split("<%").join("\t")
       .replace(/((^|%>)[^\t]*)'/g, "$1\r")
       .replace(/\t=(.*?)%>/g, "',$1,'")
       .split("\t").join("');")
       .split("%>").join("p.push('")
       .split("\r").join("\\'");
       console.info("here");
       console.debug(t);
    var fn = !/\W/.test(str) ?
        // str is a word, so it is a template id, or a cache id.
        //Load it from the cache or construct it form the id
        cache[str] = cache[str] ||
            tmpl(document.getElementById(str).innerHTML,data,true) :

        // else, the arg is a HTML string, so use it is the template contents.
        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).

        new Function("obj",
             "var p=[],print=function(){p.push.apply(p,arguments);};" +

             // Introduce the data as local variables using with(){}
             "with(obj){p.push('" +

             // Convert the template into pure JavaScript
             str.replace(/[\r\t\n]/g, " ")
                .split("<%").join("\t")
                .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                .replace(/\t=(.*?)%>/g, "',$1,'")
                .split("\t").join("');")
                .split("%>").join("p.push('")
                .split("\r").join("\\'")
             + "');}return p.join('');");

    // Provide some basic currying to the user
    if (fn_only) { return fn; }
    if (data) {
        data['after'] = after;
    } else {
        data = {after: after};
    }
    var result = fn(data);
    if (isset(data['after'])) {
        after = data['after'];
        if (typeof (after) == "function") {
            after();
        }
    }
    return result;
};
define([], function () {
    var templ = function () {};
    templ.prototype.tmpl = tmpl;
    return new templ();
});
