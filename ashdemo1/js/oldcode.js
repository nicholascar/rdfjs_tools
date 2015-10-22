var __apply_union = function(listitems, callback2) {

    var count = 0;
async.eachSeries(listitems,function(item,callback3){
    if (__has_applied(item)) {
        callback3();
        return;
    }
    async.series([function (callback4) {
        var sparql = "" +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
            "INSERT { " + subject + " rdfs:subClassOf " + item + " } " +
            "WHERE { " + item + " ?p ?o }";
        store.execute(sparql, function (err, results) {
            callback4(err);
        });
    },function (callback4) {
        var sparql = "" +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
            "INSERT { ?s rdfs:subClassOf " + item + " } " +
            "WHERE { ?s rdfs:subClassOf "+subject+" . "+ item +" ?x ?y }";
        store.execute(sparql, function (err, results) {
            callback4(err);
        });
    }],function (err) {
        __applied.push(item);
        count++;
        callback3(err);
    });
},function(err,results){
    callback2(err,count);
});
};
