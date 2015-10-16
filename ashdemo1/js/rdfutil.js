var async = null;

function is_null_or_blank(obj)
{
    return (typeof obj == "undefined" || obj === null || obj == "");
}

function node_to_sparql(node) {
    if (is_null_or_blank(node) || is_null_or_blank(node.value))
    { return false; }
    var s = node.value;
    if (!is_null_or_blank(node.token)) {
        if (node.token == "uri") {
            s = "<"+node.value+">";
        }
    }
    return s;
}
function load_remote_if_not_present(store,uri,named,callback) {
    if (arguments.length == 3) {
        callback = arguments[2];
        named = null;
    }

    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "SELECT ?t WHERE { <"+uri+"> rdf:type ?t }";

    var _load_remote_if_not_present = function(err,results) {
        if (is_null_or_blank(err) && results.length < 1) {
            var hashindex = uri.indexOf("#");
            if (hashindex != -1) {
                uri = uri.substr(0,hashindex);
                uri = uri.replace('#','');
                load_remote_if_not_present(store, uri, named, callback);
            } else {
                console.log("Loading uri: " + uri);
                if (!is_null_or_blank(named)) {
                    store.load('remote', uri, named, function (err2, result) {
                        callback(err2, result);
                    });
                } else {
                    store.load('remote', uri, function (err2, result) {
                        callback(err2, result);
                    });
                }
            }
        } else {
            callback(err, 0);
        }
    };
    if (!is_null_or_blank(named)) {
        store.execute(sparql, false, named, _load_remote_if_not_present);
    } else {
        store.execute(sparql, _load_remote_if_not_present);
    }
}



function load_ontology(ontology, store, recursion, callback)
{
    if (typeof (recursion) == "undefined" || recursion == null || recursion < 1)
    { recursion = 0; }
    if (recursion > 3) {callback();return;}
    async.series([function (scallback) {
        $('#status').text("Loading ontology: <"+ontology+"> into graph.");
        store.load('remote',ontology,function(err,result){
            if (err || result==null) { scallback(err); } else { scallback(); }
        });
    },function(scallback) {
        $('#status').text("Checking that uri loaded and it is an ontology.");
        store.execute("" +
            "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
            "SELECT * WHERE { <"+ontology+"> rdf:type owl:Ontology } ", function (err, results) {
            console.log("Loaded ontology: <"+ontology+">");
            console.debug(results);
            if (err) {
                scallback(err);
            } else if (results == null || results.length < 1) {
                scallback("Not an ontology. Skipping.");
            } else {
                scallback();
            }
        });
    },function(scallback) {
        if (recursion >= 3) {
            scallback();
            return;
        }
        $('#status').text("Checking for required imports from this ontology.");
        store.execute("" +
            "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
            "SELECT * { <"+ontology+"> owl:imports ?o } ", function (err, results) {
            console.debug(results);
            if (err) {
                scallback(err);
            } else {
                async.eachSeries(results,function(item,sscallback) {
                    async.setImmediate(function(){
                        if (!is_null_or_blank(item) &&
                            !is_null_or_blank(item.o) &&
                            !is_null_or_blank(item.o.token) &&
                            item.o.token == "uri") {
                            load_ontology(item.o.value, store, recursion + 1, function (err) {
                                sscallback();//Ignore err here, there can be lots of reason that
                                //Load ontology can fail, and all can be ignored to continue the series.
                            });
                        } else {
                            sscallback();
                        }
                    });
                }, function(err){
                    scallback(err);
                });
            }
        });
    }],function(err,results){
        callback(err,results);
    });
}


define(['async'],function (fasync) {
    async = fasync;
    var rdfutil = function () {
    };
    rdfutil.prototype.is_null_or_blank = is_null_or_blank;
    rdfutil.prototype.load_ontology = load_ontology;
    rdfutil.prototype.node_to_sparql = node_to_sparql;
    rdfutil.prototype.load_remote_if_not_present = load_remote_if_not_present;
    return new rdfutil;
});
