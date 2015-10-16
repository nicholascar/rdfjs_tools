var async = null;
var util = null;
var is_null_or_blank = null;
var apply_rdfutil = function(rdfutil)
{
    util = rdfutil;
    is_null_or_blank = util.is_null_or_blank;
};
function run_example1(store) {
    async.waterfall([function (callback) {
        util.load_ontology("http://example.org/example1", store, null, function (err) {
            callback(err,{});
        });
    },function (results,callback) {
        $('#status').text("Checking that uri loaded and we can do sparql query on our graph store.");
        store.execute("" +
            "PREFIX    :<http://example.org/example1#> " +
            "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "SELECT * { :HighSchool rdf:type ?o } ", function (err, results2) {
            console.log("Loaded Example1 RDF from TTL into Store");
            if (err) {
                callback(err);
            } else {
                callback(null,{});
            }
        });
    },/*function(callback) {
        $('#status').text("Loading the rdfsrules.js file.");
        require(["rdfsrules"], function (rdfsrules) {
            $('#status').text("Applying Entailment (rdfs inferences) please wait...");
            var options = {recursion_max: 2};
            rdfsrules.apply_entailment(store, "<http://example.org/example1#School>", options, function () {
                callback();
            });
        });
    },*/function (results,callback) {
        $('#status').text("Building form for type");
        require(['rdfforms'],function (rdfforms) {
            rdfforms.create_form_for_class(store, "<http://example.org/example1#School>", callback);
        });
    },function (results,callback) {
      $('#status').text("Done");
      var id = results['id'];
      var html = results['html'];
      $('#generated_form').html(html);
      async.setImmediate(function () {$(document).trigger('rdf_form_created',[id]);});
    },function (callback) {
        /* this is a dummy series item, marks the end of the sequence. */
       callback();
    }]);
}


define(
    ['async','rdfutil','rdfstore','rdfproxy'],
    function(_async,rdfutil,rdfstore,rdfproxy){
        async = _async;
        apply_rdfutil(rdfutil);
        var loc = window.location.protocol + '//' + window.location.host + '/';
        rdfproxy.set_proxy(loc + 'proxy.php');
        rdfstore.create(function (e, store) {
            if (typeof e != 'undefined' && e !== null) {
                console.error("Error creating the initial RDF Store.");
            } else {
                async.setImmediate(function () {run_example1(store);});
            }
        });
        console.debug('demo app started');
    }
);
