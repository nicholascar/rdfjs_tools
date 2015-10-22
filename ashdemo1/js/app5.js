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
        //util.load_ontology("http://scikey.org/def/vocab", store, null, function (err) {
        util.load_ontology("http://example.org/example1", store, null, function (err) {
                callback(err,{});
        });
    },function (results,callback) {
        $('#status').text("Building form for type");
        require(['rdfforms'],function (rdfforms) {
            //rdfforms.create_form_for_class(store, "<http://scikey.org/def/vocab#Vocabulary>", callback);
            rdfforms.create_form_for_class(store, "<http://example.org/example1#Student>", callback);
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
    ['async','rdfutil','rdfstore','rdfproxy','rdfvalidate'],
    function(_async,rdfutil,rdfstore,rdfproxy,rdfvalidate){
        async = _async;
        apply_rdfutil(rdfutil);
        var path = window.location.pathname;
        path = path.substring(0, path.lastIndexOf("/") + 1);
        var loc = window.location.protocol + '//' + window.location.host + '/' + path;
        rdfproxy.set_proxy(loc + 'proxy.php');
        rdfstore.create(function (e, store) {
            if (typeof e != 'undefined' && e !== null) {
                console.error("Error creating the initial RDF Store.");
            } else {
                rdfvalidate.init_custom_functions(store);
                async.setImmediate(function () {run_example1(store);});
            }
        });
        console.debug('demo app started');
    }
);
