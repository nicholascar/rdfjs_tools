var async = null;

function add_requirement_row(store, req, callback)
{
    var rowhead = "<div class=\"row\"><div class=\"col-lg-12\">";
    var rowtail = "<hr /></div></div>";
    var rowtitle = "<h2>Requirement obj "+req.o.value+"</h2>";
    var write = function(r) {
        var str = "";
        for (var x= 0,l= r.length; x<l; x++)
        {
            str = str+"p = " + r[x].p.value + ", o = " + r[x].o.value + "<br />";
        }
        $("#page-container").append(rowhead + rowtitle + str + rowtail);
    };

    var s = req.o.value;
    if (req.o.token && req.o.token == "uri") {
        s = "<"+req.o.value+">";
    }
    var sparql = "SELECT * WHERE { "+s+" ?p ?o }";
    store.execute(sparql, function (err, results) {
        if (err) {callback(); return;}
        write(results);
        callback();
    });
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

function run_demo2(store) {

    async.series([function (callback) {
        load_ontology("http://scikey.org/def/vocab",store,null,function(err){
            callback(err);
        });
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
            var options = {recursion_max: 2};
            rdfsrules.apply_entailment(store, "<http://scikey.org/def/vocab#Vocabulary>", options, function () {
                callback();
            });
        });
    },function(callback) {
        $('#status').text("Finding requirements for this ontology");
        store.execute("" +
            "PREFIX     :<http://scikey.org/def/vocab#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
            "SELECT * { :Vocabulary rdfs:subClassOf ?o . ?o rdf:type owl:Restriction } ", function (err, results) {
            console.log("Found restrictions:");
            console.debug(results);
            if (err) {
                callback(err);
            } else {
                async.eachSeries(results, function (item,callback2) {
                    async.setImmediate(function(){
                       add_requirement_row(store, item, callback2);
                    });
                }, callback);
            }
        });
    },function(callback) {
        /* this is a dummy series item, at the end of the sequence. */
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
                async.setImmediate(function () {run_demo2(store);});
            }
        });
        console.debug('demo app started');
    }
);

