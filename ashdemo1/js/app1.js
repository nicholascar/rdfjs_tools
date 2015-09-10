var async = null;

function sparql_run(store,sparql,callback){
    store.execute(sparql, callback);
}

function format_results(results)
{
    var str = "";
    for (var x = 0,l=results.length; x<l; x++) {
        var res = results[x];
        var conts = Object.keys(res);
        for (var y = 0,l2=conts.length; y<l2; y++) {
            var cont = conts[y];
            var param = res[cont];
            str += ""+cont+" = " + param.value + ", ";
        }
        str += "\n";
    }
    return str;
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
                            if (typeof (item) != "undefined" &&
                                typeof(item.o) != "undefined" &&
                                typeof(item.o.token) != "undefined" &&
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

function run_demo(store) {
    async.series([function (callback) {
        load_ontology("http://scikey.org/def/vocab",store,null,function(err){
            callback(err);
        });
        //$('#status').text("Loading http://scikey.org/def/vocab into graph.");
        //store.load('remote','http://scikey.org/def/vocab',function(err,result){
        //    if (err || result==null) { callback(err); } else { callback(); }
        //});
    },function(callback) {
        $('#status').text("Checking that uri loaded and we can do sparql query on our graph store.");
        store.execute("" +
            "PREFIX    :<http://scikey.org/def/vocab#> " +
            "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "SELECT * { :Vocabulary rdf:type ?o } ", function (err, results) {
            console.log("Loaded Vocabulary RDF from TTL into Store");
            console.debug(results);
            if (err) {
                callback(err);
            } else {
                callback();
            }
        });
    },function(callback) {
        $('#status').text("Loading the rdfsrules.js file.");
        require(["rdfsrules"], function (rdfsrules) {
            $('#status').text("Applying Entailment (rdfs inferences) please wait...");
            rdfsrules.apply_entailment(store, null, null, function () {
                callback();
            });
        });
    },function(callback) {
        $('#status').text("");
        $('#sparql').prop("readonly",false);
        $('#sparqlbutton').click(function(){
            var sparql = $('#sparql').val();
            sparql_run(store,sparql,function(err,results){
               if (err) { $('#output').val(err); }
               else {console.debug(results); $('#output').val(format_results(results)); }
            });
        });
        $('#sparqlbutton').prop("disabled",false);
        callback();
    }]);
}


define(
    ['async','rdfstore','rdfproxy'],
    function(_async,rdfstore,rdfproxy){
        async = _async;
        var loc = window.location.protocol + '//' + window.location.host + '/';
        rdfproxy.set_proxy(loc + 'proxy.php');
        rdfstore.create(function (e, store) {
            if (typeof e != 'undefined' && e !== null) {
                console.error("Error creating the initial RDF Store.");
            } else {
                async.setImmediate(function () {run_demo(store);});
            }
        });
        console.debug('demo app started');
    }
);

