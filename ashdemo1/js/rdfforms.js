var util,async;
var is_null_or_blank;
var apply_rdfutil = function (rdfutil)
{
    util = rdfutil;
    is_null_or_blank = util.is_null_or_blank;
};



var _new_uuid_rfc4122v4 = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

var _create_form_field_row_from_property = function (store, property, requirement_array, callback) {
    var range;
    var sparql = "" +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "SELECT ?r " +
        "WHERE { "+property+" rdfs:range ?r }";
    console.info("buidling row for property "+ property + ": requirement =");
    //console.debug(requirement_array);
    util.get_full_subject_info(store, property, function(err, info) {
      var label = info.label || info.title;
      var desc = info.description;
      require(['tmpl'],function (tmpl) {
          var t = tmpl.tmpl;
          store.execute(sparql, function (err, results) {
              if (!is_null_or_blank(err)) {
                  callback(err);
              } else {
                  if (!is_null_or_blank(results) && results.length > 0) {
                      range = results[0].r.value; //TODO: This does not allow more than one range.
                  }
                  var escapedproperty = $("<span>").text(property).html();
                  var escapedlabel = $("<span>").text(label).html();
                  var escapeddesc = desc?$("<span>").text(desc).html():null;
                  var fieldid = _new_uuid_rfc4122v4();
                  if (is_null_or_blank(label)) {
                    escapedlabel = escapedproperty;
                  } else if (is_null_or_blank(desc)) {
                    escapeddesc = escapedproperty;
                  }

                  var params = {
                    fieldid: fieldid,
                    fieldlabel: escapedlabel,
                    fielddesc: escapeddesc,
                    property: escapedproperty,
                    fieldname: escapedproperty+"-"+fieldid,
                    rdfs_range: range,
                    requirements: requirement_array };

                  var fieldrow = t('tmpl_example_field',params);
                  callback(null,fieldrow);
              }
          });
      });

    });

};

var _create_form_rows_from_requirements = function (store, requirements, callback) {
    var rows = "";
    async.forEachOfSeries(requirements.direct, function (item, key, feocallback) {
        _create_form_field_row_from_property(store, key,item, function (err,row) {
            rows += row;
            feocallback();
        });
    },function (err,results) {
        callback(err,{html:rows});
    });
};

var _create_add_property_unrestricted = function (store, callback) {
  var properties = [];
  require(['tmpl'], function(tmpl){
    var t = tmpl.tmpl;
    async.series([function (scb) {
      var sparql = "SELECT DISTINCT ?p WHERE { ?x ?p ?y }";
      store.execute(sparql, function(err,results){
        if (!is_null_or_blank(err)) {
          scb(err);
        } else {
          for (var x=0,l=results.length;x<l;x++) {
            var thisp = results[x].p;
            if (!is_null_or_blank(thisp['token']) && thisp.token == "uri") {
              properties.push(thisp);
            }
          }
          scb(null);
        }
      });
    },function (scb) {
      var sparql = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
      "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
      "SELECT DISTINCT ?p WHERE { ?x owl:onProperty ?p }";
      store.execute(sparql, function(err,results){
        if (!is_null_or_blank(err)) {
          scb(err);
        } else {
          for (var x=0,l=results.length;x<l;x++) {
            var thisp = results[x].p;
            if (!is_null_or_blank(thisp['token']) && thisp.token == "uri") {
              if (!util.array_of_nodes_contains(properties, thisp)) {
                properties.push(thisp);
              }
            }
          }
          scb(null);
        }
      });
    }],function(err,results){
      properties.sort(function(a,b){
        return a.value.localeCompare(b.value);
      });
      var html = t("tmpl_add_property",{properties:properties});
      callback(null, html);
    });
  });
};

var _array_of_nodes_contains = function (a, node) {
  for (var x=0,l=a.length;x<l;x++) {
    var thisnode = a[x];
    if (thisnode.value && node.value && (node.value.localeCompare(thisnode.value) === 0)) {
      return true;
    }
    return false;
  }
};

var create_form_for_class = function (store, klass, callback) {
    var class_info;
    var html;
    var form_id;
    require(['rdfsrules'], function (rdfsrules) {
        async.waterfall([function (wfcb) {
              rdfsrules.apply_entailment(store, klass, {recursion_max: 2},wfcb);
        },function (results,wfcb) {
            util.get_full_subject_info(store, klass, function (err,info) {
                if (is_null_or_blank(err)) { class_info = info; }
                wfcb(err, info);
            });
        },function (results, wfcb) {
            require(['requirements'], function(requirements) {
              requirements.collect_requirements(store, klass, function (err,result) {
                  requirements.interpret_requirements(store,result,wfcb);
              });
            });
        },function (results, wfcb) {
            _create_form_rows_from_requirements(store, results, wfcb);
        },function (results, wfcb) {
            var formrows = results.html;
            form_id = _new_uuid_rfc4122v4();
            require(['tmpl'], function (tmpl){
              var t = tmpl.tmpl;
              var header = t('tmpl_form_header',class_info);
              _create_add_property_unrestricted(store, function(err, results){
                  var add_property_html = results;
                  html = header;
                  html += t("tmpl_form_html",{formrows:formrows, form_id:form_id, postform: add_property_html});
                  wfcb(null,results);
              });

            });
        }],function(err,results){
            callback(err,{html: html, id:form_id});
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
