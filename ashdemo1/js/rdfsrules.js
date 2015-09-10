function is_null_or_blank(obj)
{
    return (typeof obj == "undefined" || obj === null || obj == "");
}

function load_remote_if_not_present(store,uri,callback) {
    var sparql = "" +
        "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
        "SELECT ?t WHERE { <"+uri+"> rdf:type ?t }";
    store.execute(sparql, function (err,results) {
       if (is_null_or_blank(err) && results.length < 1) {
           console.log("Loading uri: "+uri);
           store.load('remote',uri, function (err2,result) {
               callback(err2,result);
           });
       } else {
           callback(err,0);
       }
    });
}

define(['rdfstore','async'], function (rdfstore,async) {
    var rdfrules = function () {
        this._entails_done = [];

        this._is_entails_done = function (subject) {
            var flag = false;
            this._entails_done.forEach(function(item){
                if (subject == item){ flag = true;}
            });
            return flag;
        };
        this._applied_to = [];

        this._has_applied_to = function (item) {
            var flag = false;
            this._applied_to.forEach(function(item2){
                if (item2 == item){ flag = true;}
            });
            return flag;
        };

        this._load_prereqs = function (store,callback) {
            var prereqlist = ["http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                            "http://www.w3.org/2000/01/rdf-schema#"];
            async.eachSeries(prereqlist, function (item,callback){
               load_remote_if_not_present(store, item, function(err) {
                   if (err) { callback(err); }
                   else { callback(); }
               });
            }, function (err){
                callback(err);
            });
        };
        this._apply_rdf_types = function(store,subject,callback) {
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
        };
        this._apply_rdfs_subclassof = function(store,subject,callback) {
            var sparql = "" +
                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "INSERT { "+subject+" rdfs:Class ?parent } " +       //child class human
                "WHERE { "+subject+" rdfs:subClassOf ?parent }";// + //child subclassof human
                //        "<"+subject+"> rdf:type ?existing . " +      //child type ?existing
                //"FILTER (?existing != ?parent) }";                //?existing != human
            store.execute(sparql, function (err,results) {
               if (!is_null_or_blank(err)) { callback(err); }
                else { callback(null,results); }
            });
        };
        this._apply_rdfs_subpropertyof = function(store,subject,callback) {
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
        };
        this._apply_rdfs_range = function(store,subject,callback) {
            var sparql = "" +
                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                //"SELECT * " +
                "INSERT { ?o rdfs:Class ?rangeclass } " +      // gwen Class adultperson
                "WHERE { "+subject+" ?p ?o . " +               // tim mother gwen
                       " ?p rdfs:range ?rangeclass } ";// +         //mother range adultpersion
                       //" ?o rdfs:Class ?existing  }" //+           // gwen Class ?exiting
                //"FILTER (?existing != ?rangeclass) }";           // ?existing != adultperson
            store.execute(sparql, function (err,results) {
                //console.log("range results:");
                //console.debug(results);
               if (!is_null_or_blank(err)) { callback(err); }
                else { callback(null,results); }
            });
        };
        this._apply_rdfs_domain = function(store,subject,callback) {
            var sparql = "" +
                "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "INSERT { "+subject+" rdfs:Class ?domainc } " + // tim Class child
                "WHERE { "+subject+" ?p ?o . " +                   // tim mother gwen
                       " ?p rdfs:domain ?domainc } ";// +               // mother domain child
                       //" <"+subject+"> rdfs:Class ?existing . " +    // tim Class ?exiting
                //"FILTER (?existing != ?domainc) }";               // ?existing != child
            store.execute(sparql, function (err,results) {
                //console.log("domain results:");
                //console.debug(results);
               if (!is_null_or_blank(err)) { callback(err); }
                else { callback(null,results); }
            });
        };

        this._apply_rdfs_rules = function (store, subject, callback) {
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
        };

        this.apply_entailment = function (store, subject, recursion, done) {
            var that = this;
            if (typeof recursion == "undefined" || recursion === null) {
                recursion = 0;
            }
            var apply_rules_to = function(s, cb) {
                that._apply_rdfs_rules.call(that, store, s, function () {
                    that._applied_to.push(s);
                    if (recursion >= 3) {
                        cb();
                    } else {
                        that.apply_entailment(store, s, recursion + 1, function (err, results) {
                            cb(err);
                        });
                    }
                });
            };

            async.waterfall([function (callback) {
                if (recursion > 3) {
                    callback("recursion too deep!");
                } else if (recursion < 1) {
                    that._load_prereqs(store, function (err) {
                        if (!is_null_or_blank(err)) {
                            callback(err);
                        } else {
                            if (!that._has_applied_to(subject)) {
                                that._apply_rdfs_rules.call(that, store, subject, function (err) {
                                    that._applied_to.push(subject);
                                    callback(err);
                                });
                            } else {
                                callback();
                            }
                        }
                    });
                } else {
                    callback();
                }
            },function (callback) {
                var select_statement = "SELECT ?s ?c WHERE { ?s rdf:type ?c }";

                if (!is_null_or_blank(subject)) {
                    console.log("Entering apply_entailment for " + subject + " with recursion of " + recursion);
                    if (that._is_entails_done(subject)) {
                        console.log("Already done full entailment for " + subject + "!");
                        callback(null,[]); return;
                    }
                    select_statement = "SELECT ?c WHERE { " + subject + " rdf:type ?c }";
                } else {
                    console.log("Entering apply_entailment for ALL with recursion of " + recursion);
                }
                var sparql = "" +
                    "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                    select_statement;
                store.execute(sparql, function (err, results) {
                    if (!is_null_or_blank(err)) {
                        callback(err);
                    } else {
                        console.debug(results);
                        callback(null,results);
                    }
                });
            },function (results,callback) {

                async.eachSeries(results,function (item,callback2) {
                    //Skip it if there was no object
                    if (is_null_or_blank(item) || is_null_or_blank(item.c)){
                        async.setImmediate(function () { callback2(); });
                        return;
                    }
                    if (!is_null_or_blank(item.s) && !is_null_or_blank(item.s.token) && !is_null_or_blank(item.s.value)){
                        async.setImmediate(function() {
                            var s = item.s.value;
                            if (item.s.token == "uri")
                            {
                                s = "<"+item.s.value+">";
                            }
                            console.log("Applying rules to [s] item "+s+" recursion level "+recursion);
                            apply_rules_to(s, callback2);
                        });
                        return;
                    }
                    var s = item.c.value;
                    if (item.c.token == "uri") {
                        s = "<"+item.c.value+">";
                    }
                    if (that._has_applied_to(s)) {
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
                if (!is_null_or_blank(done)) {
                    async.setImmediate(function(){done(err,results)});
                }
            });
        };
    };
    return new rdfrules();
});