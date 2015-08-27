function run_demo(async,store)
{
    async.series([function (callback) {
        store.load('remote','http://scikey.org/def/vocab',function(err,result){
            if (err || result==null) { callback(err); } else { callback(); }
        });
    },function(callback) {
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
        require(["rdfsrules"], function (rdfsrules) {
            rdfsrules.apply_entailment(store, null, null, function () {
                callback();
            });
        });
    }]);
}


define(
    ['async','rdfstore','rdfproxy'],
    function(async,rdfstore,rdfproxy){
        var loc = window.location.protocol + '//' + window.location.host + '/';
        rdfproxy.set_proxy(loc + 'proxy.php');
        rdfstore.create(function (e, store) {
            if (typeof e != 'undefined' && e !== null) {
                console.error("Error creating the initial RDF Store.");
            } else {
                async.setImmediate(function () {run_demo(async,store);});
            }
        });
        console.debug('demo app started');
    }
);

