var async = null;

var is_null_or_blank = function (obj)
{
    return (typeof obj == "undefined" || obj === null || obj === "");
};

var node_to_sparql = function (node) {
    if (is_null_or_blank(node) || is_null_or_blank(node.value))
    { return false; }
    var s = node.value;
    if (!is_null_or_blank(node.token)) {
        if (node.token == "uri") {
            s = "<"+node.value+">";
        }
    }
    return s;
};

var load_remote_if_not_present = function(store,uri,named,callback) {
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
};



var load_ontology = function(ontology, store, recursion, callback)
{
    if (typeof (recursion) == "undefined" ||
     recursion === false || recursion === null || recursion < 1)
    { recursion = 0; }
    if (recursion > 3) {callback();return;}
    async.series([function (scallback) {
        $('#status').text("Loading ontology: <"+ontology+"> into graph.");
        store.load('remote',ontology,function(err,result){
            if (err || result===null) { scallback(err); } else { scallback(); }
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
            } else if (results === null || results.length < 1) {
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
};

var get_full_subject_info = function (store,subject,lang,callback) {
    if (arguments.length == 3) {
      callback = lang;
      lang = null;
    }
    if (is_null_or_blank(lang)) {
      lang = "en";
    }
    var title,description,label;
    var titlelang,descriptionlang,labellang;
    var uri = subject.replace('<','').replace('>','');
    var sparql = "" +
            "PREFIX dc10:<http://purl.org/dc/elements/1.0/> "+
            "PREFIX dc11:<http://purl.org/dc/elements/1.1/> "+
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT DISTINCT ?title ?desc ?label " +
            "WHERE { %s a ?z . " +
            "OPTIONAL { { %s dc10:title ?title } "+
            " UNION { %s dc11:title ?title } } . "+
            "OPTIONAL { { %s dc10:description ?desc } "+
            " UNION { %s dc11:description ?desc } } . "+
            "OPTIONAL { %s rdfs:label ?label } }";
    sparql = sparql.replace(/\%s/g,subject);
    store.execute(sparql,function (err,results) {
        console.debug(results);
        for (var x= 0,l=results.length; x<l; x++) {
            if (!is_null_or_blank(results[x])) {
                if (!is_null_or_blank(results[x].title)) {
                    if (!is_null_or_blank(results[x].title.token) &&
                     results[x].title.token == "literal" ) {
                       var thislitlang = null;
                       if (!is_null_or_blank(results[x].title.lang)) {
                         thislitlang = results[x].title.lang;
                       }
                       if (is_null_or_blank(title) ||
                        (titlelang != lang && thislitlang == lang) ) {
                         title = results[x].title.value;
                         titlelang = thislitlang;
                       }
                     }
                }

                if (!is_null_or_blank(results[x].desc)){
                    if (!is_null_or_blank(results[x].desc.token) &&
                        results[x].desc.token == "literal" ) {
                          var thisdesclang = null;
                          if (!is_null_or_blank(results[x].desc.lang)) {
                            thisdesclang = results[x].desc.lang;
                          }
                          if (is_null_or_blank(description) ||
                           (descriptionlang != lang && thisdesclang == lang) ) {
                            description = results[x].desc.value;
                            descriptionlang = thisdesclang;
                          }
                    }
                }
                if (!is_null_or_blank(results[x].label)){
                    if (!is_null_or_blank(results[x].label.token) &&
                        results[x].label.token == "literal" ) {
                          var thislablang = null;
                          if (!is_null_or_blank(results[x].label.lang)) {
                            thislablang = results[x].label.lang;
                          }
                          if (is_null_or_blank(label) ||
                           (labellang != lang && thislablang == lang) ) {
                            label = results[x].label.value;
                            labellang = thislablang;
                          }
                    }
                }
                if (!is_null_or_blank(title) && !is_null_or_blank(description) && !is_null_or_blank(label))
                { break; }
            }
        }
        callback(err,{uri: uri, title: title, description: description, label: label});
    } );
};

define(['async'],function (_async) {
    async = _async;
    var rdfutil = function () {
    };
    rdfutil.prototype.is_null_or_blank = is_null_or_blank;
    rdfutil.prototype.load_ontology = load_ontology;
    rdfutil.prototype.node_to_sparql = node_to_sparql;
    rdfutil.prototype.load_remote_if_not_present = load_remote_if_not_present;
    rdfutil.prototype.get_full_subject_info = get_full_subject_info;
    return new rdfutil();
});
