define(['async'], function (async) {
    var rdflist = function () {
    };

    var extract_subject_as_hashmap = function(store, subject, callback){
        var returnObject = {};
        var sparql = "SELECT * WHERE { "+subject+" ?p ?o }";
        store.execute(sparql, function(err,results){
            if (err) {callback(err);}
            else if (typeof(results) == "undefined" || results === null || results.length < 1){
                callback(null,null);
            } else {
                for (var x=0,l=results.length; x<l; x++)
                {
                    var r = results[x];
                    returnObject[r.p.value] = r.o.value;
                }
                callback(null,returnObject);
            }
        });
    };

    rdflist.prototype.collect = function (store,listnode, callback) {
        var objects = [];
        async.series([function(callback2){
            var sparql = ""+
                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "SELECT * WHERE { "+listnode+" rdfs:Class rdf:List }";
            store.execute(sparql, function(err,results){
                if (err) {callback(err);}
                else if (results.length < 1) {
                    callback2("Object is not a rdf:List");
                } else {
                    callback2();
                }
            });
        },function(callback2){
            var sparql = ""+
                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "SELECT * WHERE { "+listnode+" rdf:first ?f . "+listnode+" rdf:rest ?r }";
            store.execute(sparql, function(err,results){
                if (err) {callback(err);}
                else if (results.length < 1) {
                    callback2("rdf:List does not have a first node or rest node.");
                } else {
                    var f = results[0].f;
                    var r = results[0].r;
                    async.doWhilst(
                    function(callback3) {
                        var process_f = function() {
                            var s = f.value;
                            if (f.token && f.token == "uri") {
                                s = "<"+ f.value + ">";
                            }
                            objects.push(s);
                            f = null;
                            callback3();
                        };

                        if (f === null || f === false) {
                            var s = r.value;
                            if (r.token == "uri") {
                                s = "<"+ r.value + ">";
                            }
                            var sparql = ""+
                                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                                "SELECT * WHERE { "+s+" rdf:first ?f . "+s+" rdf:rest ?r }";
                            store.execute(sparql, function(err,results) {
                                if (err) { callback3(err); }
                                else if (results == null || results.length < 1) {
                                    f = null; r = null;
                                    callback3();
                                } else {
                                    f = results[0].f;
                                    r = results[0].r;
                                    process_f();
                                }
                            });
                        } else {
                            process_f();
                        }
                    },
                    function(){
                        return (typeof(r) != "undefined" && r !== null && r.value != "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");
                    },
                    function(err) {
                        callback2(err);
                    });
                }
            });
        }],function(err){
            if (err) { callback(err); }
            else {callback(null,objects);}
        });
    };
    return new rdflist;
});

