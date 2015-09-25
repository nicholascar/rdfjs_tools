var util,async;
var is_null_or_blank;
var apply_rdfutil = function (rdfutil)
{
    util = rdfutil;
    is_null_or_blank = util.is_null_or_blank;
};

var _get_full_class_info = function (store,klass,callback) {
    var title,description,label;
    var uri = klass.replace('<','').replace('>','');
    var sparql = "" +
            "PREFIX dc10:<http://purl.org/dc/elements/1.0/> "+
            "PREFIX dc11:<http://purl.org/dc/elements/1.1/> "+
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT ?title ?desc ?label " +
            "WHERE { %s a ?z . " +
            "OPTIONAL { { %s dc10:title ?title } "+
            " UNION { %s dc11:title ?title } } . "+
            "OPTIONAL { { %s dc10:description ?desc } "+
            " UNION { %s dc11:description ?desc } } . "+
            "OPTIONAL { %s rdfs:label ?label } }";
    sparql = sparql.replace(/\%s/g,klass);
    store.execute(sparql,function (err,results) {
        console.debug(results);
        for (var x= 0,l=results.length; x<l; x++) {
            if (!is_null_or_blank(results[x])) {
                if (!is_null_or_blank(results[x].title)){
                    if (!is_null_or_blank(results[x].title.token) &&
                         results[x].title.token == "literal" ) {
                        title = results[x].title.value;
                    }
                }
                if (!is_null_or_blank(results[x].desc)){
                    if (!is_null_or_blank(results[x].desc.token) &&
                        results[x].desc.token == "literal" ) {
                        description = results[x].desc.value;
                    }
                }
                if (!is_null_or_blank(results[x].label)){
                    if (!is_null_or_blank(results[x].label.token) &&
                        results[x].label.token == "literal" ) {
                        label = results[x].label.value;
                    }
                }
                if (!is_null_or_blank(title) && !is_null_or_blank(description) && !is_null_or_blank(label))
                { break; }
            }
        }
        callback(err,{uri: uri, title: title, description: description, label: label});
    } );
};

var _create_form_field_row_from_property = function (store, property, requirement, callback) {
    var range;
    var sparql = "" +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "SELECT ?r " +
        "WHERE { "+property+" rdfs:range ?r }";
    require(['tmpl'],function (tmpl) {
        var tmpl = tmpl.tmpl;
        store.execute(sparql, function (err, results) {
            if (!is_null_or_blank(err)) {
                callback(err);
            } else {
                if (!is_null_or_blank(results) && results.length > 0) {
                    range = results[0].r.value; //TODO: This does not allow more than one range.
                }
                var escapedlabel = $("<div>").text(property).html();
                var params = {fieldlabel:  escapedlabel, fieldname: "fieldname", rangetext:range };
                var fieldrow = tmpl('tmpl_example_field',params);

                callback(null,fieldrow);
            }
        });
    });
};

var _create_form_from_requirements = function (store, info, requirements, callback) {
    var html;
    var rows;
    require(['tmpl'],function (tmpl) {
        tmpl = tmpl.tmpl;
        html = tmpl('tmpl_form_header',info);
        rows = "";
        async.forEachOfSeries(requirements['direct'], function (item, key, feocallback) {
            _create_form_field_row_from_property(store, key,item, function (err,row) {
                rows += row;
                feocallback();
            });
        },function (err,results) {
            html += tmpl("tmpl_form_html",{formrows:rows});
            callback(err,html);
        });
    });
};

var create_form_for_class = function (store,klass, callback) {
    var class_info;
    var form_html;
    require(['requirements','rdfsrules'],function (requirements,rdfsrules) {
        async.waterfall([function (wfcb) {
              rdfsrules.apply_entailment(store,klass,{recursion_max: 2},wfcb);
        },function (results,wfcb) {
            _get_full_class_info(store,klass,function(err,info) {
                if (is_null_or_blank(err)) { class_info = info; }
                wfcb(err, info);
            });
        },function (results, wfcb) {
            requirements.collect_requirements(store, klass, function(err,result) {
                requirements.interpret_requirements(store,result,wfcb);
            });
        },function (results, wfcb) {
            _create_form_from_requirements(store, class_info, results, wfcb);
        },function (results, wfcb) {
            form_html = results;
            wfcb(null,results);
        }],function(err,results){
            callback(err,form_html);
        });
    });
};


define(['rdfstore','async','rdfutil'], function (rdfstore,_async,rdfutil) {
    async = _async;
    var rdfforms = function () {
    };
    apply_rdfutil(rdfutil);
    rdfforms.prototype.create_form_for_class = create_form_for_class;

    return new rdfforms();
});