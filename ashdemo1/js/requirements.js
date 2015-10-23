/** **********************
 *  Author: Ashley Sommer
 *  Griffith ID: (s2172861)
 *  CSIRO ident: som05d
 *  This file was created for CSIRO, as part of the Griffith Industry affiliates program.
 *  August - November 2015.
 ** **********************/

/** **********************
 *  requirements.js
 *  This file is a module for the rdfjs_tools library.
 *  This module contains functions which help to determine requirements for RDF classes.
 *  This is used when generating forms from the classes.
 ** **********************/

var util, async;
var is_null_or_blank;

/**
 * Applies the rdfutil module globally to this file.
 * For utility purposes, allows util functions to be called directly.
 * @param rdfutil The rdfutil module, to use to create the globals.
 */
var apply_rdfutil = function(rdfutil)
{
    util = rdfutil;
    is_null_or_blank = util.is_null_or_blank;
};

/**
 * Checks a subject to determine whether it is declared to be an OWL class.
 * @param store Instance of the current RDF datastore
 * @param subject identifier (in sparql format) to check on
 * @param callback Function which is called when we have determined the result.
 * @private
 */
var _is_owl_class = function(store,subject,callback) {
    var sparql = "" +
        "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
        "SELECT ?c WHERE { "+subject+" a owl:Class } ";
    store.execute(sparql, function (err,results) {
        if (!is_null_or_blank(err) || is_null_or_blank(results) || results.length < 1)
        { callback(err,false); } else { callback(null,true); }
    });
};

/**
 * A simple filter function.
 * Searches through a list and creates a new list with only the items which
 * match have a predicate which matches the passed in predicate.
 * @param list A list of nodes, each must have a .p and a .o value assigned.
 * @param predicate The fully qualified name of the predicate to filter on.
 * @returns Array
 * @private
 */
var _extract_object_by_predicate_from_list = function (list,predicate) {
    if (is_null_or_blank(list) || is_null_or_blank(predicate))
    { return null; }
    var object_list = [];

    for (var x= 0,l=list.length; x<l; x++) {
        var node = list[x];
        if (!is_null_or_blank(node) && !is_null_or_blank(node.p)) {
            if (!is_null_or_blank(node.p.value) && node.p.value == predicate) {
                if (!is_null_or_blank(node.o)) {
                    object_list.push(node.o);
                }
            }
        }
    }
    return object_list;
};

/**
 * Pulls any known and supported restrictions from the list, and associates them
 * as a key-value pair, adds them all to a list, then returns the list.
 * @param info_nodes A list of nodes, each must have a .p and a .o value assigned.
 * @returns Array
 * @private
 */
var _extract_known_requirement_from_requirement_nodes = function (info_nodes) {
    known_requirements = [];
    for (var i = 0, l = info_nodes.length; i<l; i++) {
        var info_node = info_nodes[i];
        if (is_null_or_blank(info_node.p) || is_null_or_blank(info_node.p.value)) {
            continue;
        }
        if (is_null_or_blank(info_node.o) || is_null_or_blank(info_node.o.value)) {
            continue;
        }
        var pv = ''+info_node.p.value;
        var v = ''+info_node.o.value;
        var kvp = {};
        var type="";
        switch (pv) {
            case "http://www.w3.org/2002/07/owl#minCardinality":
                kvp["label"] = "owl-mincardinality";
                kvp["name"] = "Minimum cardinality";
                kvp["description"] = "This object must have a minimum of "+v+" of this property.";
                kvp["value"] = v;
                type="restriction";
                break;
            case "http://www.w3.org/2002/07/owl#cardinality":
                kvp["label"] = "owl-cardinality";
                kvp["name"] = "Cardinality";
                kvp["description"] = "This object must have exactly "+v+" of this property.";
                kvp["value"] = v;
                type="restriction";
                break;
            case "http://www.w3.org/2002/07/owl#allValuesFrom":
                kvp["label"] = "owl-allvaluesfrom";
                kvp["name"] = "All Values From";
                kvp["description"] = "The value for this property must be a resource which extends the specified class.";
                kvp["value"] = v;
                type="restriction";
                break;
            default:
                break;
        }
        if (Object.keys(kvp).length > 0) {
          known_requirements.push({type:type, value:kvp});
        }
    }
    return known_requirements;
};

/**
 * Takes a list of requirements from collect_requirements, and creates a
 * property_requirement_map array, which maps requirement type to requirements to property names.
 * @param store Instance of the current RDF datastore
 * @param requirements A list of categories requirements, from collect_requirements.
 * @param callback Called when this async function is finished and we have a result.
 */
var allocate_requirements = function (store,requirements,callback) {
    var property_requirement_map = {};
    var sparql = "SELECT DISTINCT * WHERE { %s ?p ?o } ";
    var __allocate_requirement = function(reqtype, requirement_info_nodes){
        var onproperties = _extract_object_by_predicate_from_list(
            requirement_info_nodes, "http://www.w3.org/2002/07/owl#onProperty");
        var known_requirements = _extract_known_requirement_from_requirement_nodes(requirement_info_nodes);
        if (!is_null_or_blank(onproperties) && onproperties.length > 0) {
            if (is_null_or_blank(property_requirement_map[reqtype])) {
                property_requirement_map[reqtype] = {};
            }
            for (var x=0,l=onproperties.length; x<l; x++)
            {
                var opobject = onproperties[x];
                var s = util.node_to_sparql(opobject);
                if (is_null_or_blank(property_requirement_map[reqtype][s])) {
                    property_requirement_map[reqtype][s] = [];
                }
                Array.prototype.push.apply(property_requirement_map[reqtype][s],known_requirements);
            }
        }
    };
    async.eachSeries(requirements, function (item,callback2){
        var a;
        if (!is_null_or_blank(item.type) && !is_null_or_blank(item.req)) {
            var s = util.node_to_sparql(item.req);
            a = sparql.replace("%s", s);
            store.execute(a,function (err,results) {
                if (is_null_or_blank(err) && !is_null_or_blank(results)) {
                    __allocate_requirement(item.type,results);
                }
                callback2();
            });
        } else {
            callback2();
        }
    },function (err) {
        if (!is_null_or_blank(err)) {
            callback(err);
        } else {
            callback(null,property_requirement_map);
        }
    });
};

/**
 * A wrapper for allocate_requirements
 * @param store Instance of the current RDF datastore
 * @param requirements a list of requirements, from collect_requirements
 * @param callback Called when this async function is finished and we have a result.
 */
var interpret_requirements = function (store,requirements,callback) {
    allocate_requirements(store, requirements, function (err,property_requirement_map) {
       console.debug(property_requirement_map);
        callback(null,property_requirement_map);
    } );

};


var _collect_direct_restrictions = function(store,subject,requirements,callback) {
    var sparql = "" +
        "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
        "SELECT DISTINCT * { "+subject+" rdfs:subClassOf ?o . ?o rdf:type owl:Restriction } ";
    store.execute(sparql, function (err, results) {
        console.log("Found restrictions:");
        console.debug(results);
        if (err) {
            callback(err);
        } else {
            async.each(results, function (item,callback2) {
                async.setImmediate(function () {
                    requirements.push({type:"direct",req:item.o});
                    console.log("direct requirement: " + item.o.value);
                    callback2();
                });
            }, callback);
        }
    });
};
var _collect_union_restrictions = function(store,subject,requirements,callback) {
    var sparql = "" +
        "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
        "SELECT DISTINCT ?li WHERE { "+subject+" owl:unionOf ?li . " +
                            //This line works now, but is probably not needed.
                            //"?li rdf:type rdf:List  . " +
                            "?li rdf:first ?f  . " +
                            "?f rdf:type owl:Restriction } ";

    store.execute(sparql, function (err,results) {
        if (!is_null_or_blank(err)) {
            callback(err); return;
        }
        require(["rdflist"],function (rdflist) {
            async.eachSeries(results, function (item,callback2) {
                var s = util.node_to_sparql(item.li);
                async.setImmediate(function () {
                    rdflist.collect(store, s, function (err2, results2) {
                        if (!is_null_or_blank(err2)) {
                            callback2(err2);
                        } else if (results2.length > 0) {
                            requirements.push({type:"union",req:results2});
                            console.log("union requirement: ");
                            //console.debug(results2);
                            callback2();
                        } else {
                            callback2();
                        }
                    });
                });
            },function(err){
                callback(err);
            });
        });
    });
};
var _collect_intersection_restrictions = function(store,subject,requirements,callback) {
    var sparql = "" +
        "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
        "SELECT DISTINCT ?li WHERE { "+subject+" owl:intersectionOf ?li . " +
                //This line works now, but is probably not needed.
                        //"?li rdf:type rdf:List  . " +
                    "?li rdf:first ?f  . " +
                    "?f rdf:type owl:Restriction } ";

    store.execute(sparql, function (err,results) {
        if (!is_null_or_blank(err)) {
            callback(err); return;
        }
        require(["rdflist"],function (rdflist) {
            async.eachSeries(results, function (item,callback2) {
                var s = util.node_to_sparql(item.li);
                async.setImmediate(function () {
                    rdflist.collect(store, s, function (err2, results2) {
                        if (!is_null_or_blank(err2)) {
                            callback2(err2);
                        } else if (results2.length > 0) {
                            requirements.push({type:'intersection',req:results2});
                            console.log("intersection requirement: ");
                            //console.debug(results2);
                            callback2();
                        } else {
                            callback2();
                        }
                    });
                });
            },function(err){
                callback(err);
            });
        });
    });
};


var _collect_all = function (store, subject, callback) {
    var req_array = [];
    /* TODO: Here, collect range requirements for each property on this subject */
    async.series([function (callback2) {
        _collect_direct_restrictions(store,subject,req_array,callback2);
    },function (callback2) {
        _collect_union_restrictions(store,subject,req_array,callback2);
    },function (callback2) {
        _collect_intersection_restrictions(store,subject,req_array,callback2);
    }],function (err) {
        if (!is_null_or_blank(err)) {
            callback(err);
        } else {
            callback(null,req_array);
        }
    });
};
var collect_requirements = function (store,subject,callback) {
    _is_owl_class(store, subject, function (err,result) {
        if (result) { _collect_all(store, subject, callback); }
        else {
            console.warn("Collect requirements called on something which is not an owl class.");
            callback(null,false);
        }
    });
};

define(['rdfstore','async','rdfutil'], function (rdfstore,_async,rdfutil) {
    async = _async;
    var requirements = function () {
    };
    apply_rdfutil(rdfutil);
    requirements.prototype.collect_requirements = collect_requirements;
    requirements.prototype.allocate_requirements = allocate_requirements;
    requirements.prototype.interpret_requirements = interpret_requirements;
    return new requirements();
});
