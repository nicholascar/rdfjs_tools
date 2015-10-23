/** Assumes that JQuery and JQuery.Validate are both already loaded **/
var util, async, rdfsrules;
var is_null_or_blank;
var apply_rdfutil = function(rdfutil)
{
    util = rdfutil;
    is_null_or_blank = util.is_null_or_blank;
};

var store;

var string_starts_with = function(needle, haystack) {
  return (haystack.indexOf(needle) === 0);
};

var validate_xmlschema_type_literal = function( xmlschema_type, value ) {
    if (!string_starts_with('#',xmlschema_type)) {
        console.debug("bad xmlschema_type "+xmlschema_type);
        return false;
    }
    xmlschema_type = xmlschema_type.substr(1);
    var retval = false;
    var intval,floatval;
    switch (xmlschema_type) {
        case "anyURI":
            if (value.indexOf("://") > 2) {
                retval = true;
            } else {
                retval = "Must be a property formatted URI.";
            }
            break;
        case "string":
            if (typeof(value) == "string") {
              retval = true;
            }  else {
              retval = "The input text is not a string, for some reason.";
            }
            break;
        case "boolean":
            var isbool = (value === true || value === false);
            if (!isbool && typeof (value) == "string") {
                var tolower = value.toLowerCase();
                isbool = (tolower == "false" || tolower == "true");
            }
            if (isbool) {
                retval = true;
            } else {
                retval = "This property must be either True or False.";
            }
            break;
        case "nonPositiveInteger":
        case "negativeInteger":
            intval = parseInt(value);
            if (intval < 0) {
                retval = true;
            } else {
                retval = "Must be a negative integer.";
            }
            break;
        case "positiveInteger":
        case "nonNegativeInteger":
            intval = parseInt(value);
            if (intval >= 0) {
                retval = true;
            } else {
                retval = "Must be an positive integer, or zero.";
            }
            break;
        case "decimal":
        case "double":
        case "float":
            floatval = parseFloat(value);
            if (isNaN(floatval)) {
                retval = "This property cannot evaluate to a "+xmlschema_type+" type.";
            } else {
                retval = true;
            }
            break;
        case "date":
           var dateval = ''+value;
           dateval = dateval.trim().replace('.','');
           var re = /^(((0[1-9]|[12][0-9]|3[01])([-.\/])(0[13578]|10|12)([-.\/])(\d{4}))|(([0][1-9]|[12][0-9]|30)([-.\/])(0[469]|11)([-.\/])(\d{4}))|((0[1-9]|1[0-9]|2[0-8])([-.\/])(02)([-.\/])(\d{4}))|((29)(\.|-|\/)(02)([-.\/])([02468][048]00))|((29)([-.\/])(02)([-.\/])([13579][26]00))|((29)([-.\/])(02)([-.\/])([0-9][0-9][0][48]))|((29)([-.\/])(02)([-.\/])([0-9][0-9][2468][048]))|((29)([-.\/])(02)([-.\/])([0-9][0-9][13579][26])))/i;
           var match = dateval.match(re);
           if (match === null) {
             retval = "XMLSchema Date type is not in the correct format. Please enter in DD/MM/YYYY.";
           } else {
             retval = true;
           }
           break;
        default:
            console.debug("unimplemented xmlschema_type.");
            retval = "unimplemented xmlschema_type "+xmlschema_type;
            break;
    }
    return retval;
};

var _validate_async_rdf = function (value, element, params, options) {
    var previous, validator;
    options = options || {};
    var validator_name = is_null_or_blank(options['name'])?"async_rdf":options.name;
    var __validate_internal_callback = function( err, results ) {
        var valid, errors, message, submitted;
        if (!is_null_or_blank(err)) {
            valid = false;
            if (typeof (err) == "string") {
                if (err == "unimplemented") {
                    message = "The validation for this property is not yet implemented. It cannot be validated at this time.";
                } else {
                    message = err;
                }
            } else {
                message = "Unknown RDF Validation Error.";
            }
        } else if (results === true) {
            valid = true;
        } else if (is_null_or_blank(results) || results.length < 1) {
            valid = false;
        } else {
            // Assume if we get here it is valid. maybe not true.
            valid = true;
        }

        validator.settings.messages[ element.name ][validator_name] = previous.originalMessage;
        errors = jQuery.data(validator.currentForm, "async_errors-"+element.name);
        var invalid_count = jQuery.data(validator.currentForm, "async_invalid_count-"+element.name);
        errors = errors || {};
        invalid_count = parseInt(invalid_count) || 0;
        if ( valid ) {
            if (validator.pendingRequest <= 1) { //this is the last pending operating
             if (invalid_count < 1) {
               submitted = validator.formSubmitted;
               validator.prepareElement(element );
               validator.formSubmitted = submitted;
               validator.successList.push( element );
               delete validator.invalid[ element.name ];
               jQuery.removeData(validator.currentForm, "async_errors-"+element.name);
               jQuery.removeData(validator.currentForm, "async_invalid_count-"+element.name);
               validator.showErrors();
             }
           }
        } else {
            message = message || validator.defaultMessage(element, validator_name );
            errors[ element.name ] = previous.message = $.isFunction( message ) ? message( value ) : message;
            validator.invalid[ element.name ] = true;
            invalid_count++;
            jQuery.data(validator.currentForm, "async_errors-"+element.name, errors);
            jQuery.data(validator.currentForm, "async_invalid_count-"+element.name, ''+invalid_count);
            validator.showErrors(errors);
        }
        previous.valid = valid;
        validator.stopRequest(element, validator_name, valid );
    };

    var __unimplemented_check = function(is_uri, cb) {
        async.setImmediate(function () { cb("unimplemented"); });
    };

    var __validate_internal = function () {
        if (string_starts_with('_:',value)) {
            return "RDF Validation cannot accept a blank node representation.";
        }
        validator = this;
        previous = validator.previousValue(element,validator_name);
        if (!validator.settings.messages[ element.name ] ) {
            validator.settings.messages[ element.name ] = {};
        }
        previous.originalMessage = validator.settings.messages[ element.name ][ validator_name ];
        validator.settings.messages[ element.name ][ validator_name ] = previous.message;
        var paramDataString = $.param(params?{}:params);
        if ( previous.old === paramDataString ) {
            return previous.valid;
        }
        var check = is_null_or_blank(options['check'])?__unimplemented_check:options.check;
        var is_uri = false;
        if (string_starts_with("http:",value) ||
          string_starts_with("<http",value) ||
          string_starts_with("https:",value)) {
            is_uri = true;
        }
        validator.startRequest( element, validator_name );
        check(is_uri, __validate_internal_callback);
        return "checking_async";
    };
    return jQuery.validator.prototype.optional.call(this,element) || __validate_internal.call(this);
};

var _validate_rdfs_range = function (value, element, params) {
    var __check = function (subject, range, callback) {
        if (!string_starts_with("<",range)) {
            range = "<"+range+">";
        }
        var sparql = "" +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT DISTINCT * WHERE { "+subject+" rdf:type "+range+" }";
        store.execute(sparql, callback);
    };

    var check = function (is_uri, callback) {
        var range;
        if (typeof(params) == "string") {
            range = params;
        } else {
            if (params.length < 1) {
                callback("No params on validator!");
                return;
            } else {
                range = params[0];
            }
        }
        if (is_uri) {
            var uri = value.replace('<', '').replace('>', '').trim();
            util.load_remote_if_not_present(store, uri, null, function (err, loaded) {
                if (!is_null_or_blank(err)) {
                    callback(err);
                } else {
                    uri = "<"+uri+">";
                    rdfsrules.apply_entailment(store, uri, {recursion_max: 2}, function(err, results) {
                        if (!is_null_or_blank(err)) {
                            callback(err);
                        } else {
                            async.setImmediate( function() { __check(uri, range, callback); } );
                        }
                    });
                }
            });
        } else {
            async.setImmediate(function () {
                if (range == "http://www.w3.org/2000/01/rdf-schema#Literal") {
                    callback(null,true);
                } else if (string_starts_with("http://www.w3.org/2001/XMLSchema",range)) {
                    var substr = range.substr(32);
                    var xmlschema_valid = validate_xmlschema_type_literal(substr, value);
                    if (xmlschema_valid === false) {
                        callback("The literal value entered for this property does not conform to the XMLSchema type required.");
                    } else if (typeof (xmlschema_valid) == "string") {
                        callback(xmlschema_valid);
                    } else { callback(null,true); }
                } else {
                    callback("This property does not accept a literal value.");
                }
            });
        }
    };
    var options = {name: "rdfs_range", check: check};
    return _validate_async_rdf.call(this, value, element, params, options);
};

var _validate_owl_allvaluesfrom = function (value, element, params) {
    var __check = function (subject, valuesfrom, callback) {
        if (!string_starts_with("<",valuesfrom)) {
            valuesfrom = "<"+valuesfrom+">";
        }
        var sparql = "" +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT DISTINCT * WHERE { "+subject+" rdf:type "+valuesfrom+" }";
        store.execute(sparql, callback);
    };
    var check = function(is_uri, callback) {
        var valuesfrom;
        if (typeof(params) == "string") {
            valuesfrom = params;
        } else {
            if (params.length < 1) {
                callback("No params on validator!");
                return;
            } else {
                valuesfrom = params[0];
            }
        }
        if (is_uri) {
            var uri = value.replace('<', '').replace('>', '').trim();
            util.load_remote_if_not_present(store, uri, null, function (err, loaded) {
                if (!is_null_or_blank(err)) {
                    callback(err);
                } else {
                    uri = "<"+uri+">";
                    async.setImmediate ( function () {
                        rdfsrules.apply_entailment(store, uri, {recursion_max: 2}, function (err, results) {
                            if (!is_null_or_blank(err)) {
                                callback(err);
                            } else {
                                async.setImmediate(function () {
                                    __check(uri, valuesfrom, callback);
                                });
                            }
                        });
                    });
                }
            });
        } else {
          async.setImmediate(function () {
              if (valuesfrom == "http://www.w3.org/2000/01/rdf-schema#Literal") {
                  callback(null,true);
              } else if (string_starts_with("http://www.w3.org/2001/XMLSchema",valuesfrom)) {
                  var substr = valuesfrom.substr(32);
                  var xmlschema_valid = validate_xmlschema_type_literal(substr, value);
                  if (xmlschema_valid === false) {
                      callback("The literal value entered for this property does not conform to the XMLSchema type required.");
                  } else if (typeof (xmlschema_valid) == "string") {
                      callback(xmlschema_valid);
                  } else { callback(null,true); }
              } else {
                  callback("This property does not accept a literal value.");
              }
          });
        }
    };
    var options = { name: "owl_allvaluesfrom", check: check };
    return _validate_async_rdf.call(this, value, element, params, options);
};

/**
Very similar to _validate_async_rdf, again based on the remote validator.
*/
var _validate_postprocess_rdf = function(value, element, params, options) {
  var previous, validator;
  options = options || {};
  var validator_name = is_null_or_blank(options['name'])?"postprocess_rdf":options.name;

  var __validate_internal_callback = function(err,result) {
    var valid, errors, message, submitted;
    if (!is_null_or_blank(err)) {
        valid = false;
        if (typeof (err) == "string") {
            if (err == "unimplemented") {
                message = "The validation for this property is not yet implemented. It cannot be validated at this time.";
            } else {
                message = err;
            }
        } else {
            message = "Unknown RDF Validation Error.";
        }
    } else if (result === true) {
        valid = true;
    } else if (is_null_or_blank(result) || results.length < 1) {
        valid = false;
    } else {
        // Assume if we get here it is valid. maybe not true.
        valid = true;
    }

    validator.settings.messages[ element.name ][validator_name] = previous.originalMessage;
    errors = jQuery.data(validator.currentForm, "async_errors-"+element.name);
    var invalid_count = jQuery.data(validator.currentForm, "async_invalid_count-"+element.name);
    errors = errors || {};
    invalid_count = parseInt(invalid_count) || 0;
    if ( valid ) {
        if (validator.pendingRequest <= 1) { //this is the last pending operating
         if (invalid_count < 1) {
           submitted = validator.formSubmitted;
           validator.prepareElement(element );
           validator.formSubmitted = submitted;
           validator.successList.push( element );
           delete validator.invalid[ element.name ];
           jQuery.removeData(validator.currentForm, "async_errors-"+element.name);
           jQuery.removeData(validator.currentForm, "async_invalid_count-"+element.name);
           validator.showErrors();
         }
       }
    } else {
        message = message || validator.defaultMessage(element, validator_name );
        errors[ element.name ] = previous.message = $.isFunction( message ) ? message( value ) : message;
        validator.invalid[ element.name ] = true;
        invalid_count++;
        jQuery.data(validator.currentForm, "async_errors-"+element.name, errors);
        jQuery.data(validator.currentForm, "async_invalid_count-"+element.name, ''+invalid_count);
        validator.showErrors(errors);
    }
    if (validator.pendingRequest <= 1) {
      previous.valid = valid;
    }
    validator.stopRequest(element, validator_name, valid );
  };

  var __unimplemented_check = function(form,cb) {
      async.setImmediate(function () { cb("unimplemented"); });
  };

  var __validate_internal = function () {
      if (string_starts_with('_:',value)) {
          return "RDF Validation cannot accept a blank node representation.";
      }
      validator = this;
      previous = validator.previousValue(element,validator_name);
      if (!validator.settings.messages[ element.name ] ) {
          validator.settings.messages[ element.name ] = {};
      }
      previous.originalMessage = validator.settings.messages[ element.name ][ validator_name ];
      validator.settings.messages[ element.name ][ validator_name ] = previous.message;
      var paramDataString = $.param(params?{}:params);
      if ( previous.old === paramDataString ) {
          return previous.valid;
      }
      var check = is_null_or_blank(options['check'])?__unimplemented_check:options.check;
      validator.startRequest( element, validator_name );
      check(validator.currentForm, __validate_internal_callback);
      return "checking_postprocess";
  };
  var check_postprocess = $(this.currentForm).data('check_postprocess');
  if (!check_postprocess) { return true; }
  return jQuery.validator.prototype.optional.call(this,element) || __validate_internal.call(this);
};

var _validate_owl_cardinality = function (value, element, params) {
    var intvalue = 0;
    if (is_null_or_blank(params)) {
      intvalue = 0;
    } else if (typeof(params) == "string") {
      intvalue = parseInt(params);
    } else if (typeof(params) == "number") {
      intvalue = params;
    } else if (typeof(params) == "object") {
      intvalue = parseInt(params[0]);
    }
    var check = function(form,callback) {
      $(form).one('postprocess.validator', function(e,f) {
        var instance_count = $.data(form,"owl_cardinality-"+element.name);
        if (is_null_or_blank(instance_count)) {
          instance_count = 0;
        }
        var valid = intvalue==parseInt(instance_count);
        callback(null,valid);
      });
      var instance_count = $.data(form,"owl_cardinality-"+element.name);
      if (is_null_or_blank(instance_count)) {
        instance_count = 0;
      } else {
        instance_count = parseInt(instance_count);
      }
      instance_count += 1;
      $.data(form,"owl_cardinality-"+element.name,''+instance_count);
    };
    var options = { name: "owl_cardinality", check: check };
    return _validate_postprocess_rdf.call(this,value, element, params, options);
};

var override_validator_functions = function () {
  jQuery.validator.prototype.startRequest = function( element, rule ) {
    if (is_null_or_blank(rule)) {
      rule = "remote";
    }
    if ( is_null_or_blank(this.pending[ element.name ]) ) {
      this.pending[ element.name ] = {};
    }
    if (!this.pending[ element.name ][ rule ]) {
      this.pendingRequest++;
      this.pending[ element.name ][ rule ] = true;
    }
  };

  jQuery.validator.prototype.stopRequest = function( element, rule, valid ) {
    if (arguments.length == 2) {
      valid = rule;
      rule = null;
    }
    if (is_null_or_blank(rule)) {
      rule = "remote";
    }
    this.pendingRequest--;
    // sometimes synchronization fails, make sure pendingRequest is never < 0
    if ( this.pendingRequest < 0 ) {
      this.pendingRequest = 0;
    }
    delete this.pending[ element.name ][ rule ];

    if ( valid && this.pendingRequest === 0 && this.formSubmitted && this.form() ) {
      $( this.currentForm ).submit();
      this.formSubmitted = false;
    } else if ( !valid && this.pendingRequest === 0 && this.formSubmitted ) {
      $( this.currentForm ).triggerHandler( "invalid-form", [ this ] );
      this.formSubmitted = false;
    }
  };

  jQuery.validator.prototype.previousValue = function( element, rule) {
    if (is_null_or_blank(rule)) {
      rule = "remote";
    }
    return $.data( element, "previousValue" ) || $.data( element, "previousValue", {
      old: null,
      valid: true,
      message: this.defaultMessage( element, rule )
    } );
  };
  var remove_data_starting_with = function($element,dataname) {
    var data = $element.data();
    if (is_null_or_blank(data) || Object.keys(data).length < 1) {
      return;
    }
    var toremove = [];
    var keys = Object.keys(data);
    for (var x=0,l=keys.length; x<l; x++) {
      var name = keys[x];
      if (string_starts_with(dataname,name)) {
        toremove.push(name);
      }
    }
    for (var y=0,m=toremove.length; y<m; y++) {
      $element.removeData(toremove[y]);
    }
  };

  var reset_postprocess_data = function ($form) {
    remove_data_starting_with($form,'owl_cardinality');
    remove_data_starting_with($form,'owl_mincardinality');
    remove_data_starting_with($form,'owl_maxcardinality');
  };

  jQuery.validator.prototype.checkForm = function() {
			this.prepareForm();
      var $form = $(this.currentForm);
      reset_postprocess_data($form);
      $form.data('check_postprocess',true);
			for ( var i = 0, elements = ( this.currentElements = this.elements() ); elements[ i ]; i++ ) {
				this.check( elements[ i ] );
			}
      $form.triggerHandler('postprocess',[ this ]);
      $form.removeData('check_postprocess');
			return this.valid();
	};
};

var init_custom_functions = function (_store) {
    store = _store;
    jQuery.validator.addMethod("rdfs_range", _validate_rdfs_range,
        "The resource you entered does not conform to the rdfs:range of the property.");
    jQuery.validator.addMethod("owl_allvaluesfrom", _validate_owl_allvaluesfrom,
        "The resource you entered does not conform to the owl:allValuesFrom restriction of the property.");
    jQuery.validator.addMethod("owl_cardinality", _validate_owl_cardinality,
            "This property is subject to a specific cardinality. Please check the rules.");
    override_validator_functions();

};

define(['rdfstore','rdfsrules','async','rdfutil'], function (rdfstore,_rdfsrules,_async,rdfutil) {
    async = _async;
    rdfsrules = _rdfsrules;
    var rdfvalidate = function () {
    };
    apply_rdfutil(rdfutil);
    rdfvalidate.prototype.init_custom_functions = init_custom_functions;
    return new rdfvalidate();
});
