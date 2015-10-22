var util, async;
var is_null_or_blank;
var load_remote_if_not_present;
var apply_rdfutil = function(rdfutil)
{
    util = rdfutil;
    is_null_or_blank = util.is_null_or_blank;
    load_remote_if_not_present = util.load_remote_if_not_present;
};


function _load_prereqs (store,callback) {
    var prereqlist = ["http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "http://www.w3.org/2000/01/rdf-schema#",
        "http://www.w3.org/2002/07/owl#"];
    async.eachSeries(prereqlist, function (item,callback){
        load_remote_if_not_present(store, item, function(err) {
            if (err) { callback(err); }
            else { callback(); }
        });
    }, function (err) {
        callback(err);
    });
}

function _apply_rdf_types (store,subject,callback) {
    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "INSERT { "+subject+" rdf:type ?parent } " +     //child instanceof human
        "WHERE { "+subject+" rdf:type ?class ." +     //tim instanceof child
        "?class rdfs:subClassOf ?parent }";// +      //child subclassof human
    //"FILTER (?existing != ?parent) }";                //?existing != human
    store.execute(sparql, function (err,results) {
        if (!is_null_or_blank(err)) { callback(err); }
        else { callback(null,results); }
    });
}
function _apply_rdfs_subclassof (store,subject,callback) {
    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "INSERT { "+subject+" rdf:type ?parent } " +       //child typeof class human
        "WHERE { "+subject+" rdfs:subClassOf ?parent }";// + //child subclassof class human

    store.execute(sparql, function (err,results) {
        if (!is_null_or_blank(err)) { callback(err); }
        else { callback(null,results); }
    });
}

function _apply_rdfs_subpropertyof (store,subject,callback) {
    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "INSERT { "+subject+" ?parent ?o } " +         // tim parent gwen
        "WHERE { "+subject+" ?p ?o . " +               // tim mother gwen
        " ?p rdfs:subPropertyOf ?parent }";// +   //mother subpropertyof parent
    //        " <"+subject+"> ?parent ?existing . " +  // tim mother ?exiting
    //"FILTER (?existing != ?o) }";                    // ?existing != gwen
    store.execute(sparql, function (err,results) {
        //console.log("subproperty results:");
        //console.debug(results);
        if (!is_null_or_blank(err)) { callback(err); }
        else { callback(null,results); }
    });
}

function _apply_rdfs_range (store,subject,callback) {
    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            //"SELECT * " +
        "INSERT { ?o rdf:type ?rangeclass } " +      // gwen typeof adultperson
        "WHERE { "+subject+" ?p ?o . " +               // tim mother gwen
        " ?p rdfs:range ?rangeclass } ";// +    //mother range adultpersion
    //" ?o rdfs:Class ?existing  }" //+      // gwen Class ?exiting
    //"FILTER (?existing != ?rangeclass) }";        // ?existing != adultperson
    store.execute(sparql, function (err,results) {
        //console.log("range results:");
        //console.debug(results);
        if (!is_null_or_blank(err)) { callback(err); }
        else { callback(null,results); }
    });
}

function _apply_rdfs_domain (store,subject,callback) {
    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "INSERT { "+subject+" rdf:type ?domainc } " + // tim typeof child
        "WHERE { "+subject+" ?p ?o . " +              // tim mother gwen
        " ?p rdfs:domain ?domainc } ";// +       // mother domain child
    //" <"+subject+"> rdfs:Class ?existing . " +    // tim Class ?exiting
    //"FILTER (?existing != ?domainc) }";               // ?existing != child
    store.execute(sparql, function (err,results) {
        //console.log("domain results:");
        //console.debug(results);
        if (!is_null_or_blank(err)) { callback(err); }
        else { callback(null,results); }
    });
}
function _apply_rdfs_rules (store, subject, callback) {
    var that = this;
    async.series([
        function (c) {
            that._apply_rdfs_subclassof.call(that,store,subject,c);
        },
        function (c) {
            that._apply_rdfs_domain.call(that,store,subject,c);
        },
        function (c) {
            that._apply_rdfs_subpropertyof.call(that,store,subject,c);
        },
        function (c) {
            that._apply_rdfs_range.call(that,store,subject,c);
        },
        function (c) {
            that._apply_rdf_types.call(that,store,subject,c);
        }
    ],function (err,results){
        if (!is_null_or_blank(err)) { callback(err); }
        else { callback(null,results); }
    });
}
function _apply_owl_rules (store, subject, callback) {
    var that = this;
    var has_changed = function(results) {
        for (var x= 0,l=results.length; x<l; x++)
        {
            if (!is_null_or_blank(results[x]) && results[x] !== 0)
            {    return true;    }
        }
        return false;
    };
    async.series([
        function (c) {
            that._apply_owl_unionof.call(that,store,subject,c);
        },
        function (c) {
            that._apply_owl_intersectionof.call(that,store,subject,c);
        }
    ],function (err,results){
        if (!is_null_or_blank(err)) { callback(err); }
        else if (results.length > 0 && has_changed(results)) {
            that._apply_rdfs_rules(store,subject,callback);
        } else { callback(null,results); }
    });
}

function _apply_owl_unionof (store,subject,callback) {
    var __applied = [];
    var __has_applied = function (test) {
        for (var x= 0,l=__applied.length; x<l ;x++)
        {
            if (__applied[x] == test) {
                return true;
            }
        }
        return false;
    };
    var __apply_union = function (results2,callback2) {
        /* Does nothing for now */
        callback2();
    };
    var sparql = "" +
        "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
        "SELECT ?li WHERE { "+subject+" owl:unionOf ?li } ";
    store.execute(sparql, function (err,results) {
        //console.log("unionOf results:");
        //console.debug(results);
        if (!is_null_or_blank(err)) { callback(err); return; }
        require(["rdflist"],function(rdflist){
            async.eachSeries(results, function(item,callback2){
                var s = util.node_to_sparql(item.li);
                async.setImmediate(function () {
                    rdflist.collect(store, s, function (err2, results2) {
                        if (!is_null_or_blank(err2)) {
                            callback2(err);
                        } else if (results2.length > 0) {
                            __apply_union(results2,callback2);
                        } else {
                            callback2(null,0);
                        }
                    });
                });
            },function(err,results){
                callback(err,__applied.length);
            });
        });
    });
}
function _apply_owl_intersectionof (store,subject,callback) {
    var __applied = [];
    var __has_applied = function(test){
        for (var x= 0,l=__applied.length; x<l ;x++)
        {
            if (__applied[x] == test) {
                return true;
            }
        }
        return false;
    };
    var __apply_intersection = function(listitems, callback2) {
        callback2();
    };
    var sparql = "" +
        "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "PREFIX  owl:<http://www.w3.org/2002/07/owl#> " +
        "SELECT ?li WHERE { "+subject+" owl:intersectionOf ?li } ";
    store.execute(sparql, function (err,results) {
        //console.log("intersection_of results:");
        //console.debug(results);
        if (!is_null_or_blank(err)) { callback(err); return; }
        require(["rdflist"],function(rdflist){
            async.eachSeries(results, function(item,callback2){
                var s = util.node_to_sparql(item.li);
                async.setImmediate(function () {
                    rdflist.collect(store, s, function (err2, results2) {
                        if (!is_null_or_blank(err2)) {
                            callback2(err2);
                        } else if (results2.length > 0) {
                            __apply_intersection(results2,callback2);
                        } else {
                            callback2(null,0);
                        }
                    });
                });
            },function(err,results){
                callback(err,__applied.length);
            });
        });
    });
}
function apply_entailment (store, subject, options, done_callback) {
    var that = this;
    var recursion;
    var recursion_max;
    var default_options = {recursion: 0, recursion_max: 3};
    var is_rdfs_class = false;
    var is_owl_class = false;
    if (is_null_or_blank(options)) {
        recursion = default_options.recursion;
        recursion_max = default_options.recursion_max;
    } else {
        recursion = is_null_or_blank(options.recursion) ?
            default_options.recursion : options.recursion;
        recursion_max = is_null_or_blank(options.recursion_max) ?
            default_options.recursion_max : options.recursion_max;
    }
    var apply_rules_to = function(s, cb) {
        that._apply_rdfs_rules.call(that, store, s, function () {
            that._applied_rdfs_to.push(s);
            if (recursion >= recursion_max) {
                cb();
            } else {
                var newoptions = {recursion: recursion+1, recursion_max: recursion_max};
                that.apply_entailment(store, s, newoptions, function (err, results) {
                    cb(err);
                });
            }
        });
    };
    if (!is_null_or_blank(subject)) {
        console.log("Entering apply_entailment for " + subject + " with recursion of " + recursion);
        if (that._is_entails_done(subject)) {
            console.log("Already done full entailment for " + subject + "!");
            async.setImmediate(function(){done_callback(null);});
            return;
        }
    } else {
        console.log("Entering apply_entailment for ALL with recursion of " + recursion);
    }

    async.waterfall([function (callback) {
        if (recursion > recursion_max) {
            console.error("recursion too deep! should not have gotten here.");
            callback("recursion too deep! should not have gotten here.");
        } else if (recursion < 1) {
            that._load_prereqs(store, function (err) {
                if (!is_null_or_blank(err)) {
                    callback(err);
                } else {
                    if (!that._has_applied_rdfs_to(subject)) {
                        that._apply_rdfs_rules.call(that, store, subject, function (err) {
                            that._applied_rdfs_to.push(subject);
                            callback(err,[]);
                        });
                    } else {
                        callback(null,[]);
                    }
                }
            });
        } else {
            callback(null,[]);
        }
    },function(results,callback) {
        var pf = "" +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  owl:<http://www.w3.org/2002/07/owl#> ";
        var sparql1 = pf +
            "SELECT ?c WHERE { " + subject + " rdf:type rdfs:Class }";
        var sparql2 = pf +
            "SELECT ?c WHERE { " + subject + " rdf:type owl:Class }";
        async.series([ function(callback2) {
            store.execute(sparql1, function (err, results) {
                if (!is_null_or_blank(err)) {
                    is_rdfs_class = false;
                    callback2(err);
                } else {
                    is_rdfs_class = (results.length > 0);
                    callback2();
                }
            });
        },function(callback2) {
            store.execute(sparql2, function (err, results) {
                if (!is_null_or_blank(err)) {
                    is_owl_class = false;
                    callback2(err);
                } else {
                    is_owl_class = (results.length > 0);
                    if (is_owl_class && !is_rdfs_class) {
                        is_rdfs_class = true;
                    }
                    callback2();
                }
            });
        }],function(err){
            callback(err,[]);
        });
    },function(results,callback){
        if(!is_null_or_blank(subject) && is_owl_class && !that._has_applied_owl_to(subject)) {
            that._apply_owl_rules(store,subject,function(err){
                that._applied_owl_to.push(subject);
                callback(err,[]);
            });
        } else {
            callback(null,[]);
        }
    },function (results,callback) {
        var select_statement = "SELECT ?s ?c WHERE { ?s rdf:type ?c }";
        if (!is_null_or_blank(subject)) {
            select_statement = "SELECT ?c WHERE { " + subject + " rdf:type ?c }";
        }
        var sparql = "" +
            "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            select_statement;
        store.execute(sparql, function (err, results) {
            if (!is_null_or_blank(err)) {
                callback(err);
            } else {
                callback(null,results);
            }
        });
    },function(results,callback) {
        if (!is_null_or_blank(subject) && is_rdfs_class) {
            var sparql = "" +
                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "SELECT ?c WHERE { "+subject+" rdfs:subClassOf ?c }";
            store.execute(sparql, function(err,results2){
                if (!is_null_or_blank(err)){
                    callback(err);
                } else {
                    if (results2.length > 0) {
                        Array.prototype.push.apply(results,results2);
                    }
                    callback(null,results);
                }
            });
        } else {
            callback(null, results);
        }
    },function (results,callback) {
        ///console.info("all entailment items for "+subject);
        //console.debug(results);
        async.eachSeries(results,function (item,callback2) {
            //Skip it if there was no object
            if (is_null_or_blank(item) || is_null_or_blank(item.c)){
                async.setImmediate(function () { callback2(); });
                return;
            }
            if (!is_null_or_blank(item.s) && !is_null_or_blank(item.s.token) && !is_null_or_blank(item.s.value)){
                async.setImmediate(function() {
                    var s = util.node_to_sparql(item.s);
                    console.log("Applying rules to [s] item "+s+" recursion level "+recursion);
                    apply_rules_to(s, callback2);
                });
                return;
            }
            var s = util.node_to_sparql(item.c);
            if (that._has_applied_rdfs_to(s)) {
                console.log("Already applied rules to "+s+" skipping whole object.");
                async.setImmediate(function () { callback2(); });
                return;
            }
            async.setImmediate(function () {
                console.log("Applying rules to [c] item "+s+" recursion level "+recursion);
                if (item.c.token && item.c.token == "uri"){
                    load_remote_if_not_present(store, item.c.value, function (err,result) {
                        if (!is_null_or_blank(err)) {
                            callback2(err);
                        } else {
                            apply_rules_to(s, callback2);
                        }
                    });
                } else {
                    apply_rules_to(s,callback2);
                }
            });
        },function(err,results){
            if (!is_null_or_blank(err)){
                callback(err);
            } else {
                if (!is_null_or_blank(subject)){
                    that._entails_done.push(subject);
                }
                callback(null,results);
            }
        });
    }],function(err,results){
        if (!is_null_or_blank(done_callback)) {
            async.setImmediate(function () { done_callback(err,results); });
        }
    });
}

define(['rdfstore','async','rdfutil'], function (rdfstore,_async,rdfutil) {
    async = _async;
    apply_rdfutil(rdfutil);
    var rdfrules = function () {
        this._entails_done = [];
        this._applied_rdfs_to = [];
        this._applied_owl_to = [];
    };

    rdfrules.prototype._is_entails_done = function (subject) {
        for (var x= 0, l=this._entails_done.length; x<l; x++) {
            if (subject == this._entails_done[x]) {
                return true;
            }
        }
        return false;
    };


    rdfrules.prototype._has_applied_rdfs_to = function (item) {
        for (var x= 0, l=this._applied_rdfs_to.length; x<l; x++) {
            if (item == this._applied_rdfs_to[x]) {
                return true;
            }
        }
        return false;
    };
    rdfrules.prototype._has_applied_owl_to = function (item) {
        for (var x= 0, l=this._applied_owl_to.length; x<l; x++) {
            if (item == this._applied_owl_to[x]) {
                return true;
            }
        }
        return false;
    };

    rdfrules.prototype._load_prereqs = _load_prereqs;
    rdfrules.prototype._apply_rdf_types = _apply_rdf_types;
    rdfrules.prototype._apply_rdfs_subclassof = _apply_rdfs_subclassof;
    rdfrules.prototype._apply_rdfs_subpropertyof = _apply_rdfs_subpropertyof;
    rdfrules.prototype._apply_rdfs_range = _apply_rdfs_range;
    rdfrules.prototype._apply_rdfs_domain = _apply_rdfs_domain;
    rdfrules.prototype._apply_rdfs_rules = _apply_rdfs_rules;
    rdfrules.prototype._apply_owl_rules = _apply_owl_rules;
    rdfrules.prototype._apply_owl_intersectionof = _apply_owl_intersectionof;
    rdfrules.prototype._apply_owl_unionof = _apply_owl_unionof;
    rdfrules.prototype.apply_entailment = apply_entailment;
    return new rdfrules();
});
